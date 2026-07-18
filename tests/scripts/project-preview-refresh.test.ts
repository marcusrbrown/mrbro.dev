import {Buffer} from 'node:buffer'
import {existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {
  buildPreviewBatch,
  fetchPreviewImage,
  isPortfolioRepo,
  previewFilename,
  refreshPreviewImages,
  truncateForLog,
  type RefreshRepo,
} from '../../scripts/project-preview-refresh'

const PNG_MAGIC_BYTES = [0x89, 0x50, 0x4e, 0x47]

/** Builds a minimally-valid PNG payload: magic bytes padded to clear the size floor. */
const pngBytes = (size = 1200): Uint8Array => {
  const bytes = new Uint8Array(size)
  PNG_MAGIC_BYTES.forEach((byte, index) => {
    bytes[index] = byte
  })
  return bytes
}

const imageResponse = (init: Partial<{contentType: string; bytes: Uint8Array; ok: boolean; status: number}> = {}) => {
  const bytes = init.bytes ?? pngBytes()
  return {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    statusText: 'OK',
    headers: new Headers({'content-type': init.contentType ?? 'image/png'}),
    arrayBuffer: async () => bytes.buffer,
  } as unknown as Response
}

const jsonResponse = (body: unknown, init: Partial<{status: number; headers: Record<string, string>}> = {}) =>
  ({
    ok: (init.status ?? 200) < 400,
    status: init.status ?? 200,
    statusText: init.status && init.status >= 400 ? 'Error' : 'OK',
    headers: new Headers(init.headers ?? {}),
    json: async () => body,
  }) as unknown as Response

const makeRepo = (overrides: Partial<RefreshRepo> & {id: number; full_name: string}): RefreshRepo => ({
  description: 'A great project',
  fork: false,
  archived: false,
  topics: ['portfolio'],
  ...overrides,
})

describe('project-preview-refresh script', () => {
  describe('truncateForLog', () => {
    it('leaves short strings untouched', () => {
      expect(truncateForLog('hello')).toBe('hello')
    })

    it('truncates long strings to 200 chars with an ellipsis', () => {
      const long = 'a'.repeat(250)
      const result = truncateForLog(long)
      expect(result.endsWith('…')).toBe(true)
      expect(result.length).toBe(201)
    })
  })

  describe('previewFilename', () => {
    it('derives the bare filename from the shared path helper', () => {
      expect(previewFilename(42)).toBe('42.png')
    })

    it('returns undefined for an invalid id', () => {
      expect(previewFilename(0)).toBeUndefined()
      expect(previewFilename(-1)).toBeUndefined()
    })
  })

  describe('isPortfolioRepo', () => {
    it('accepts a non-fork, non-archived, described, portfolio-tagged repo', () => {
      expect(isPortfolioRepo(makeRepo({id: 1, full_name: 'user/repo'}))).toBe(true)
    })

    it('rejects a fork', () => {
      expect(isPortfolioRepo(makeRepo({id: 1, full_name: 'user/repo', fork: true}))).toBe(false)
    })

    it('rejects an archived repo', () => {
      expect(isPortfolioRepo(makeRepo({id: 1, full_name: 'user/repo', archived: true}))).toBe(false)
    })

    it('rejects a repo with no description', () => {
      expect(isPortfolioRepo(makeRepo({id: 1, full_name: 'user/repo', description: null}))).toBe(false)
    })

    it('rejects a repo without the portfolio topic', () => {
      expect(isPortfolioRepo(makeRepo({id: 1, full_name: 'user/repo', topics: ['other']}))).toBe(false)
    })

    it('rejects the site repo by case-normalized full_name', () => {
      expect(isPortfolioRepo(makeRepo({id: 1, full_name: 'MarcusRBrown/Marcusrbrown.GitHub.io'}))).toBe(false)
    })
  })

  describe('fetchPreviewImage', () => {
    const headers = {accept: 'application/vnd.github+json'}

    afterEach(() => {
      vi.unstubAllGlobals()
    })

    it('builds the URL from owner/repo in full_name and returns the validated buffer', async () => {
      const fetchMock = vi.fn().mockResolvedValue(imageResponse())
      vi.stubGlobal('fetch', fetchMock)

      const result = await fetchPreviewImage({full_name: 'marcusrbrown/some-repo'}, headers)

      expect(fetchMock).toHaveBeenCalledWith(
        'https://opengraph.githubassets.com/1/marcusrbrown/some-repo',
        expect.objectContaining({headers}),
      )
      expect(result.ok).toBe(true)
      if (result.ok) expect(result.buffer.length).toBeGreaterThanOrEqual(1024)
    })

    it('fails on a non-image content-type', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(imageResponse({contentType: 'text/html'})))
      const result = await fetchPreviewImage({full_name: 'user/repo'}, headers)
      expect(result.ok).toBe(false)
    })

    it('fails on a body below the minimum byte floor', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(imageResponse({bytes: pngBytes(10)})))
      const result = await fetchPreviewImage({full_name: 'user/repo'}, headers)
      expect(result.ok).toBe(false)
    })

    it('fails when PNG magic bytes are missing even with correct content-type and size', async () => {
      const garbage = new Uint8Array(1200).fill(0)
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(imageResponse({bytes: garbage})))
      const result = await fetchPreviewImage({full_name: 'user/repo'}, headers)
      expect(result.ok).toBe(false)
    })

    it('fails on a non-ok HTTP response', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(imageResponse({ok: false, status: 404})))
      const result = await fetchPreviewImage({full_name: 'user/repo'}, headers)
      expect(result.ok).toBe(false)
    })

    it('fails cleanly on a timeout', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new DOMException('The operation was aborted.', 'TimeoutError')))
      const result = await fetchPreviewImage({full_name: 'user/repo'}, headers)
      expect(result.ok).toBe(false)
    })
  })

  describe('buildPreviewBatch (fail-safe matrix)', () => {
    const headers = {accept: 'application/vnd.github+json'}

    it('is fatal when a previously-committed repo fails to fetch', async () => {
      const repos = [makeRepo({id: 1, full_name: 'user/repo-1'})]
      const fetchImage = vi.fn().mockResolvedValue({ok: false, reason: 'boom'})

      const result = await buildPreviewBatch(repos, new Set([1]), headers, fetchImage)

      expect(result.fatalError).toContain('user/repo-1')
      expect(result.images.size).toBe(0)
    })

    it('skips (does not fail) a new repo whose fetch fails, while others still succeed', async () => {
      const repos = [makeRepo({id: 1, full_name: 'user/repo-1'}), makeRepo({id: 2, full_name: 'user/repo-2'})]
      const fetchImage = vi
        .fn()
        .mockResolvedValueOnce({ok: false, reason: 'boom'})
        .mockResolvedValueOnce({ok: true, buffer: Buffer.from(pngBytes())})

      const result = await buildPreviewBatch(repos, new Set(), headers, fetchImage)

      expect(result.fatalError).toBeNull()
      expect(result.skipped).toEqual([{id: 1, reason: 'boom'}])
      expect(result.images.has(2)).toBe(true)
    })

    it('returns an empty batch for an empty portfolio set', async () => {
      const fetchImage = vi.fn()
      const result = await buildPreviewBatch([], new Set(), headers, fetchImage)
      expect(result.fatalError).toBeNull()
      expect(result.images.size).toBe(0)
      expect(result.skipped).toEqual([])
      expect(fetchImage).not.toHaveBeenCalled()
    })
  })

  describe('refreshPreviewImages (integration)', () => {
    let tmpDir: string
    let outputDir: string

    beforeEach(() => {
      tmpDir = mkdtempSync(join(tmpdir(), 'project-preview-refresh-test-'))
      outputDir = join(tmpDir, 'project-previews')
    })

    afterEach(() => {
      rmSync(tmpDir, {recursive: true, force: true})
      vi.unstubAllGlobals()
      process.exitCode = 0
    })

    const repoListingBody = (repos: Record<string, unknown>[]) => repos

    it('happy path: writes one file for a valid portfolio repo and exits 0', async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(
          jsonResponse(
            repoListingBody([
              {
                id: 1,
                full_name: 'user/repo-1',
                description: 'desc',
                fork: false,
                archived: false,
                topics: ['portfolio'],
              },
            ]),
          ),
        )
        .mockResolvedValueOnce(imageResponse())
      vi.stubGlobal('fetch', fetchMock)

      await refreshPreviewImages({outputDir, username: 'marcusrbrown', token: undefined})

      expect(process.exitCode).toBe(0)
      expect(existsSync(join(outputDir, '1.png'))).toBe(true)
    })

    it('empty portfolio set: no files written, exit 0', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(jsonResponse([])))

      await refreshPreviewImages({outputDir, username: 'marcusrbrown', token: undefined})

      expect(process.exitCode).toBe(0)
      expect(existsSync(outputDir) ? readdirSync(outputDir) : []).toEqual([])
    })

    it('listing fetch failure is fatal and prunes nothing', async () => {
      mkdirSync(outputDir, {recursive: true})
      writeFileSync(join(outputDir, '1.png'), Buffer.from(pngBytes()))

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({}, {status: 500})))

      await refreshPreviewImages({outputDir, username: 'marcusrbrown', token: undefined})

      expect(process.exitCode).toBe(1)
      expect(existsSync(join(outputDir, '1.png'))).toBe(true)
    })

    it('previously-committed repo fetch failure is fatal, existing files unchanged', async () => {
      mkdirSync(outputDir, {recursive: true})
      writeFileSync(join(outputDir, '1.png'), Buffer.from('old-content'))

      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(
          jsonResponse(
            repoListingBody([
              {
                id: 1,
                full_name: 'user/repo-1',
                description: 'desc',
                fork: false,
                archived: false,
                topics: ['portfolio'],
              },
            ]),
          ),
        )
        .mockResolvedValueOnce(imageResponse({ok: false, status: 500}))
      vi.stubGlobal('fetch', fetchMock)

      await refreshPreviewImages({outputDir, username: 'marcusrbrown', token: undefined})

      expect(process.exitCode).toBe(1)
      expect(readdirSync(outputDir)).toEqual(['1.png'])
      const {readFileSync} = await import('node:fs')
      expect(readFileSync(join(outputDir, '1.png'), 'utf8')).toBe('old-content')
    })

    it('new repo fetch failure is a warn-and-skip: others still written, exit 0', async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(
          jsonResponse(
            repoListingBody([
              {
                id: 1,
                full_name: 'user/repo-1',
                description: 'desc',
                fork: false,
                archived: false,
                topics: ['portfolio'],
              },
              {
                id: 2,
                full_name: 'user/repo-2',
                description: 'desc',
                fork: false,
                archived: false,
                topics: ['portfolio'],
              },
            ]),
          ),
        )
        .mockResolvedValueOnce(imageResponse({ok: false, status: 500}))
        .mockResolvedValueOnce(imageResponse())
      vi.stubGlobal('fetch', fetchMock)

      await refreshPreviewImages({outputDir, username: 'marcusrbrown', token: undefined})

      expect(process.exitCode).toBe(0)
      expect(existsSync(join(outputDir, '1.png'))).toBe(false)
      expect(existsSync(join(outputDir, '2.png'))).toBe(true)
    })

    it('first-request timeout (network down) is fatal, assets untouched', async () => {
      mkdirSync(outputDir, {recursive: true})
      writeFileSync(join(outputDir, '1.png'), Buffer.from('old-content'))

      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new DOMException('timeout', 'TimeoutError')))

      await refreshPreviewImages({outputDir, username: 'marcusrbrown', token: undefined})

      expect(process.exitCode).toBe(1)
      const {readFileSync} = await import('node:fs')
      expect(readFileSync(join(outputDir, '1.png'), 'utf8')).toBe('old-content')
    })

    it('R9: a repo absent from a successful listing has its committed image pruned', async () => {
      mkdirSync(outputDir, {recursive: true})
      writeFileSync(join(outputDir, '1.png'), Buffer.from(pngBytes()))
      writeFileSync(join(outputDir, '2.png'), Buffer.from(pngBytes()))

      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(
          jsonResponse(
            repoListingBody([
              {
                id: 1,
                full_name: 'user/repo-1',
                description: 'desc',
                fork: false,
                archived: false,
                topics: ['portfolio'],
              },
            ]),
          ),
        )
        .mockResolvedValueOnce(imageResponse())
      vi.stubGlobal('fetch', fetchMock)

      await refreshPreviewImages({outputDir, username: 'marcusrbrown', token: undefined})

      expect(process.exitCode).toBe(0)
      expect(existsSync(join(outputDir, '1.png'))).toBe(true)
      expect(existsSync(join(outputDir, '2.png'))).toBe(false)
    })

    it('R9: a failed listing fetch prunes nothing', async () => {
      mkdirSync(outputDir, {recursive: true})
      writeFileSync(join(outputDir, '1.png'), Buffer.from(pngBytes()))

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({}, {status: 500})))

      await refreshPreviewImages({outputDir, username: 'marcusrbrown', token: undefined})

      expect(process.exitCode).toBe(1)
      expect(existsSync(join(outputDir, '1.png'))).toBe(true)
    })

    it('mid-batch failure leaves no half-written file and removes the staging dir', async () => {
      mkdirSync(outputDir, {recursive: true})
      writeFileSync(join(outputDir, '2.png'), Buffer.from('old-content'))

      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(
          jsonResponse(
            repoListingBody([
              {
                id: 1,
                full_name: 'user/repo-1',
                description: 'desc',
                fork: false,
                archived: false,
                topics: ['portfolio'],
              },
              {
                id: 2,
                full_name: 'user/repo-2',
                description: 'desc',
                fork: false,
                archived: false,
                topics: ['portfolio'],
              },
            ]),
          ),
        )
        .mockResolvedValueOnce(imageResponse())
        .mockResolvedValueOnce(imageResponse({ok: false, status: 500}))
      vi.stubGlobal('fetch', fetchMock)

      await refreshPreviewImages({outputDir, username: 'marcusrbrown', token: undefined})

      expect(process.exitCode).toBe(1)
      // repo 1's fetch succeeded but repo 2 (previously committed) failed, which
      // aborts the whole batch — no repo-1 file is ever published, and repo 2's
      // pre-existing asset is left untouched.
      const {readFileSync} = await import('node:fs')
      expect(existsSync(join(outputDir, '1.png'))).toBe(false)
      expect(readFileSync(join(outputDir, '2.png'), 'utf8')).toBe('old-content')
      const parentEntries = existsSync(tmpDir) ? readdirSync(tmpDir) : []
      expect(parentEntries.some(name => name.includes('.project-preview-refresh-staging-'))).toBe(false)
    })
  })
})
