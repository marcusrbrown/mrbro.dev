#!/usr/bin/env tsx

/**
 * Project preview-image refresh script.
 *
 * Fetches the GitHub Open Graph social card for every portfolio-tagged repo
 * (mirroring the curation filter in `src/hooks/UseGitHub.ts`) and writes it
 * to `public/project-previews/<repo.id>.png`, the deterministic path the
 * runtime transform reads via the shared `previewImagePath` helper.
 *
 * Fails safe: a listing-fetch failure is always fatal and prunes nothing. A
 * previously-committed repo's image failing to (re)fetch is fatal and
 * leaves existing assets untouched (`wasPublished`-first ordering). A newly
 * portfolio-tagged repo's image failing to fetch is a warning — it's simply
 * skipped, and the run still publishes everything else and exits zero.
 * Batch writes go through a staging directory so a mid-run failure can never
 * leave a half-written asset set; the publish (move-into-place) step never
 * runs on a fatal path. On a successful listing fetch, any committed image
 * whose repo id is no longer in the current public portfolio set is pruned
 * (R9) — never on an uncertain/failed listing.
 */

import {Buffer} from 'node:buffer'
import {existsSync, mkdirSync, mkdtempSync, readdirSync, renameSync, rmSync, writeFileSync} from 'node:fs'
import {dirname, join} from 'node:path'
import process from 'node:process'

import {previewImagePath} from '../src/utils/preview-image-path'

const DEFAULT_OUTPUT_DIR = 'public/project-previews'
const DEFAULT_USERNAME = 'marcusrbrown'
const SITE_REPO_FULL_NAME = 'marcusrbrown/marcusrbrown.github.io'
const PORTFOLIO_TOPIC = 'portfolio'
const MIN_IMAGE_BYTES = 1024
const PNG_MAGIC_BYTES = [0x89, 0x50, 0x4e, 0x47]
const LOG_TRUNCATE_LENGTH = 200

/** Truncates a string for safe log/summary output. */
export const truncateForLog = (input: string): string =>
  input.length <= LOG_TRUNCATE_LENGTH ? input : `${input.slice(0, LOG_TRUNCATE_LENGTH)}…`

/**
 * Derives the bare `<id>.png` filename from the shared URL-path helper, so the on-disk
 * filename and the runtime `imageUrl` can never desync. Returns `undefined` for an
 * invalid id, same as the helper it delegates to.
 */
export const previewFilename = (id: number): string | undefined => {
  const path = previewImagePath(id)
  return path ? path.slice('/project-previews/'.length) : undefined
}

// --- Repo listing shape + filter, mirroring src/hooks/UseGitHub.ts. ---

export interface RefreshRepo {
  id: number
  full_name: string
  description: string | null
  fork: boolean
  archived: boolean
  topics?: string[]
}

const isString = (value: unknown): value is string => typeof value === 'string'
const isNumber = (value: unknown): value is number => typeof value === 'number'
const isBoolean = (value: unknown): value is boolean => typeof value === 'boolean'
const isNullableString = (value: unknown): value is string | null => value === null || typeof value === 'string'

const isRefreshRepo = (value: unknown): value is RefreshRepo => {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    isNumber(v.id) &&
    isString(v.full_name) &&
    isNullableString(v.description) &&
    isBoolean(v.fork) &&
    isBoolean(v.archived) &&
    (v.topics === undefined || (Array.isArray(v.topics) && v.topics.every(isString)))
  )
}

const isRefreshRepoArray = (value: unknown): value is RefreshRepo[] =>
  Array.isArray(value) && value.every(isRefreshRepo)

const isPortfolioTagged = (repo: RefreshRepo): boolean => (repo.topics ?? []).includes(PORTFOLIO_TOPIC)
const isSiteRepo = (repo: RefreshRepo): boolean => repo.full_name.toLowerCase() === SITE_REPO_FULL_NAME

/** Mirrors the exact curation predicate in `transformReposToProjects`. */
export const isPortfolioRepo = (repo: RefreshRepo): boolean =>
  !repo.fork && !repo.archived && Boolean(repo.description) && isPortfolioTagged(repo) && !isSiteRepo(repo)

const GITHUB_API_ORIGIN = 'https://api.github.com'

/**
 * Extracts the `rel="next"` URL from a `Link` header, restricted to the
 * `https://api.github.com` origin. This is a defense-in-depth guard: pagination
 * must never follow a URL off-origin, since the caller re-fetches it with the
 * authenticated (token-bearing) headers. A missing, malformed, or off-origin
 * next URL simply stops pagination rather than throwing.
 */
const nextLink = (response: Response): string | null => {
  const link = response.headers?.get('link')
  const match = link?.match(/<([^>]+)>;\s*rel="next"/)
  const candidate = match?.[1]
  if (!candidate) return null
  try {
    return new URL(candidate).origin === GITHUB_API_ORIGIN ? candidate : null
  } catch {
    return null
  }
}

/** Fetches every page of `GET /users/:username/repos`, following `Link: rel="next"`. */
const fetchRepoListing = async (username: string, headers: Record<string, string>): Promise<RefreshRepo[]> => {
  const repos: RefreshRepo[] = []
  let url: string | null = `https://api.github.com/users/${username}/repos?sort=updated&per_page=100`
  while (url) {
    let response: Response
    try {
      response = await fetch(url, {headers, signal: AbortSignal.timeout(30_000)})
    } catch (error) {
      if (error instanceof DOMException && error.name === 'TimeoutError') {
        throw new Error(`GitHub request timed out: ${url}`)
      }
      throw error
    }
    if (!response.ok) throw new Error(`GitHub request failed (${response.status} ${response.statusText}): ${url}`)
    const data: unknown = await response.json()
    if (!isRefreshRepoArray(data)) throw new Error(`Unexpected repo list response shape: ${url}`)
    repos.push(...data)
    url = nextLink(response)
  }
  return repos
}

// --- Per-repo image fetch + validation. ---

export type ImageFetchResult = {ok: true; buffer: Buffer} | {ok: false; reason: string}

const isValidPngPayload = (contentType: string | null, buffer: Buffer): {ok: true} | {ok: false; reason: string} => {
  if (!contentType?.startsWith('image/')) {
    return {ok: false, reason: `unexpected content-type: ${contentType ?? '(none)'}`}
  }
  if (buffer.length < MIN_IMAGE_BYTES) {
    return {ok: false, reason: `response body too small (${buffer.length} bytes)`}
  }
  if (!PNG_MAGIC_BYTES.every((byte, index) => buffer[index] === byte)) {
    return {ok: false, reason: 'response is missing PNG magic bytes'}
  }
  return {ok: true}
}

/** Fetches and validates a single repo's GitHub Open Graph social card. */
export const fetchPreviewImage = async (
  repo: Pick<RefreshRepo, 'full_name'>,
  headers: Record<string, string>,
): Promise<ImageFetchResult> => {
  const [owner, name] = repo.full_name.split('/')
  if (!owner || !name) return {ok: false, reason: `unexpected full_name: ${repo.full_name}`}

  const url = `https://opengraph.githubassets.com/1/${owner}/${name}`
  let response: Response
  try {
    response = await fetch(url, {headers, signal: AbortSignal.timeout(30_000)})
  } catch (error) {
    if (error instanceof DOMException && error.name === 'TimeoutError') {
      return {ok: false, reason: `request timed out: ${url}`}
    }
    return {ok: false, reason: error instanceof Error ? error.message : String(error)}
  }
  if (!response.ok) return {ok: false, reason: `HTTP ${response.status} ${response.statusText}`}

  let buffer: Buffer
  try {
    buffer = Buffer.from(await response.arrayBuffer())
  } catch (error) {
    return {
      ok: false,
      reason: `failed to read response body: ${error instanceof Error ? error.message : String(error)}`,
    }
  }

  const validation = isValidPngPayload(response.headers.get('content-type'), buffer)
  if (!validation.ok) return {ok: false, reason: validation.reason}

  return {ok: true, buffer}
}

// --- Batch build: fail-safe matrix + fetch orchestration, independent of fs. ---

export interface RefreshSkip {
  id: number
  reason: string
}

export interface BuildPreviewBatchResult {
  /** Newly-fetched, valid image bytes keyed by repo id. Only present when `fatalError` is null. */
  images: Map<number, Buffer>
  skipped: RefreshSkip[]
  /** Non-null when a `wasPublished` repo's image failed to fetch; the whole batch is void. */
  fatalError: string | null
}

/**
 * Fetches every portfolio repo's preview image, applying the `wasPublished`-first
 * fail-safe: a previously-committed repo whose fetch fails aborts the whole batch
 * (fatal); a new repo's fetch failure is recorded as a skip and the batch continues.
 */
export const buildPreviewBatch = async (
  repos: RefreshRepo[],
  existingIds: ReadonlySet<number>,
  headers: Record<string, string>,
  fetchImage: (repo: RefreshRepo, headers: Record<string, string>) => Promise<ImageFetchResult> = fetchPreviewImage,
): Promise<BuildPreviewBatchResult> => {
  const images = new Map<number, Buffer>()
  const skipped: RefreshSkip[] = []

  for (const repo of repos) {
    const wasPublished = existingIds.has(repo.id)
    const result = await fetchImage(repo, headers)

    if (!result.ok) {
      if (wasPublished) {
        return {
          images: new Map(),
          skipped,
          fatalError: `Previously published preview for "${repo.full_name}" (id ${repo.id}) failed to refresh: ${result.reason}`,
        }
      }
      skipped.push({id: repo.id, reason: result.reason})
      continue
    }

    images.set(repo.id, result.buffer)
  }

  return {images, skipped, fatalError: null}
}

// --- Filesystem: existing-asset discovery + atomic staged publish. ---

const readExistingIds = (outputDir: string): Set<number> => {
  if (!existsSync(outputDir)) return new Set()
  const ids = new Set<number>()
  for (const entry of readdirSync(outputDir)) {
    const match = /^(\d+)\.png$/.exec(entry)
    if (match?.[1]) ids.add(Number(match[1]))
  }
  return ids
}

/**
 * Publishes a batch of images via a staging directory: writes every image to
 * the staging dir first, then moves each into place with `renameSync`
 * (atomic per-file on the same filesystem). Only AFTER every publish rename
 * has succeeded does it remove stale assets (repos no longer in the
 * portfolio set) — publish-before-prune ordering means a mid-publish failure
 * deletes nothing; existing assets are never destroyed. Returns the pruned
 * repo ids. The staging dir is always cleaned up.
 *
 * Honest limitation: this is not an all-or-nothing multi-file transaction. A
 * `renameSync` failing partway through a multi-image batch (staging is a
 * sibling of `outputDir` on the same filesystem, so this needs a genuine fs
 * failure) leaves a mix of previous-and-current images — but every card
 * still resolves to a valid image (old or new), nothing is deleted, and the
 * next successful refresh reconciles the set.
 */
const publishBatch = (outputDir: string, images: Map<number, Buffer>, existingIds: ReadonlySet<number>): number[] => {
  mkdirSync(outputDir, {recursive: true})
  const stagingDir = mkdtempSync(join(dirname(outputDir), '.project-preview-refresh-staging-'))

  try {
    for (const [id, buffer] of images) {
      const filename = previewFilename(id)
      if (!filename) continue // invalid id — never happens for validated portfolio repos, but stay total
      writeFileSync(join(stagingDir, filename), buffer)
    }

    for (const [id] of images) {
      const filename = previewFilename(id)
      if (!filename) continue
      renameSync(join(stagingDir, filename), join(outputDir, filename))
    }

    const pruned: number[] = []
    for (const id of existingIds) {
      if (images.has(id)) continue
      const filename = previewFilename(id)
      if (!filename) continue
      const target = join(outputDir, filename)
      if (existsSync(target)) {
        rmSync(target)
        pruned.push(id)
      }
    }

    return pruned
  } finally {
    rmSync(stagingDir, {recursive: true, force: true})
  }
}

// --- Top-level orchestration: dual CLI/library shape. ---

export interface RefreshOptions {
  outputDir?: string
  username?: string
  token?: string | undefined
}

export interface RefreshSummaryResult {
  fetched: number[]
  skipped: RefreshSkip[]
  pruned: number[]
  fatalError: string | null
}

const writeSummary = (path: string | undefined, result: RefreshSummaryResult): void => {
  if (!path) return
  const safe = (value: string) => truncateForLog(value).replaceAll(/[\r\n|]/g, ' ')
  const lines = [
    `### Project Preview Image Refresh`,
    `- Fetched: ${result.fetched.length}`,
    `- Skipped: ${result.skipped.length}${result.skipped.length > 0 ? ` (${result.skipped.map(s => `${s.id}: ${safe(s.reason)}`).join('; ')})` : ''}`,
    `- Pruned: ${result.pruned.length}`,
    '- Verification: `curl -I https://mrbro.dev/project-previews/<id>.png`',
    '',
  ]
  writeFileSync(path, `${lines.join('\n')}\n`)
}

/**
 * Fetches the current portfolio-tagged repo set, refreshes each repo's preview
 * image, prunes stale assets, and publishes the batch atomically. Fails safe:
 * a listing-fetch failure, or a previously-committed repo's fetch failure, sets
 * a non-zero `process.exitCode` and leaves existing assets untouched.
 */
export const refreshPreviewImages = async (options: RefreshOptions = {}): Promise<void> => {
  const outputDir = options.outputDir ?? DEFAULT_OUTPUT_DIR
  const username = options.username ?? DEFAULT_USERNAME
  const token = options.token ?? process.env.GITHUB_TOKEN

  // Authenticated headers are for api.github.com ONLY. They must never be
  // forwarded to opengraph.githubassets.com — that would leak this
  // workflow's contents-write token to a third-party CDN.
  const apiHeaders: Record<string, string> = {accept: 'application/vnd.github+json'}
  if (token) apiHeaders.authorization = `Bearer ${token}`
  const imageHeaders: Record<string, string> = {accept: 'image/*'}

  const existingIds = readExistingIds(outputDir)

  let repos: RefreshRepo[]
  try {
    const allRepos = await fetchRepoListing(username, apiHeaders)
    repos = allRepos.filter(isPortfolioRepo)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`❌ Project preview refresh failed: ${truncateForLog(message)}`)
    process.exitCode = 1
    return
  }

  const batch = await buildPreviewBatch(repos, existingIds, imageHeaders)

  if (batch.fatalError) {
    console.error(`❌ Project preview refresh failed: ${truncateForLog(batch.fatalError)}`)
    process.exitCode = 1
    return
  }

  let pruned: number[]
  try {
    pruned = publishBatch(outputDir, batch.images, existingIds)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`❌ Project preview refresh failed to publish: ${truncateForLog(message)}`)
    process.exitCode = 1
    return
  }

  for (const skip of batch.skipped) {
    console.warn(`⚠️  Skipping preview for repo id ${skip.id}: ${truncateForLog(skip.reason)}`)
  }

  writeSummary(process.env.PROJECT_PREVIEW_REFRESH_SUMMARY_PATH, {
    fetched: [...batch.images.keys()],
    skipped: batch.skipped,
    pruned,
    fatalError: null,
  })

  console.log(
    `✅ Project preview images refreshed: ${batch.images.size} fetched, ${batch.skipped.length} skipped, ${pruned.length} pruned`,
  )
  process.exitCode = 0
}

if (import.meta.url === `file://${process.argv[1]}`) {
  refreshPreviewImages().catch((error: unknown) => {
    console.error('❌ Unexpected project preview refresh error:', error)
    process.exitCode = 1
  })
}
