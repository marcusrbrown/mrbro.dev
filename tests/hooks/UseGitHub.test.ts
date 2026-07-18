/**
 * @vitest-environment happy-dom
 */

import {act, renderHook, waitFor} from '@testing-library/react'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {useGitHub} from '../../src/hooks/UseGitHub'

const mockRepos = [
  {
    id: 1,
    name: 'my-project',
    full_name: 'user/my-project',
    description: 'A great project',
    html_url: 'https://github.com/user/my-project',
    language: 'TypeScript',
    stargazers_count: 42,
    fork: false,
    archived: false,
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    homepage: 'https://example.com',
    topics: ['react', 'typescript', 'portfolio'],
  },
  {
    id: 2,
    name: 'forked-project',
    full_name: 'user/forked-project',
    description: 'A fork',
    html_url: 'https://github.com/user/forked-project',
    language: 'JavaScript',
    stargazers_count: 5,
    fork: true,
    archived: false,
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    homepage: null,
    topics: ['portfolio'],
  },
  {
    id: 3,
    name: 'archived-project',
    full_name: 'user/archived-project',
    description: 'Archived',
    html_url: 'https://github.com/user/archived-project',
    language: 'Go',
    stargazers_count: 10,
    fork: false,
    archived: true,
    created_at: '2022-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
    homepage: null,
    topics: ['portfolio'],
  },
]

const jsonResponse = (body: unknown, init: Partial<{status: number; headers: Record<string, string>}> = {}) =>
  ({
    ok: (init.status ?? 200) < 400,
    status: init.status ?? 200,
    headers: new Headers(init.headers ?? {}),
    json: () => Promise.resolve(body),
  }) as Response

// Each test uses a unique username so the module-level cache/in-flight maps
// (shared across the whole test file) don't leak state between cases.
let usernameCounter = 0
const uniqueUsername = () => `test-user-${++usernameCounter}`

describe('useGitHub', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sessionStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('should start in loading state', () => {
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise(() => {})))
    const {result} = renderHook(() => useGitHub(uniqueUsername()))
    expect(result.current.loading).toBe(true)
    expect(result.current.error).toBeNull()
  })

  it('should return initial empty arrays', () => {
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise(() => {})))
    const {result} = renderHook(() => useGitHub(uniqueUsername()))
    expect(result.current.repos).toEqual([])
    expect(result.current.projects).toEqual([])
  })

  it('should fetch repos on mount and set loading false', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(jsonResponse(mockRepos)))
    vi.stubGlobal('fetch', fetchMock)

    const {result} = renderHook(() => useGitHub(uniqueUsername()))

    await waitFor(
      () => {
        expect(result.current.loading).toBe(false)
      },
      {timeout: 3000},
    )
    expect(result.current.error).toBeNull()
    expect(result.current.repos).toHaveLength(mockRepos.length)
  })

  it('should filter out forked and archived repos', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(jsonResponse(mockRepos)))

    const {result} = renderHook(() => useGitHub(uniqueUsername()))

    await waitFor(() => expect(result.current.loading).toBe(false), {timeout: 3000})

    expect(result.current.projects.every(p => !p.title.includes('fork') && !p.title.includes('arch'))).toBe(true)
    expect(result.current.projects).toHaveLength(1)
  })

  it('should transform repos into Project objects', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(jsonResponse(mockRepos)))

    const {result} = renderHook(() => useGitHub(uniqueUsername()))

    await waitFor(() => expect(result.current.loading).toBe(false), {timeout: 3000})

    const project = result.current.projects[0]
    expect(project).toBeDefined()
    expect(project?.title).toBe('My Project')
    expect(project?.language).toBe('TypeScript')
    expect(project?.stars).toBe(42)
  })

  it('should accept a custom username', async () => {
    const username = uniqueUsername()
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse([]))
    vi.stubGlobal('fetch', fetchMock)

    renderHook(() => useGitHub(username))

    await waitFor(() => expect(fetchMock).toHaveBeenCalled(), {timeout: 3000})

    expect(fetchMock.mock.calls[0]?.[0]).toContain(username)
  })

  it('should exclude repos without the portfolio topic even if they pass legacy filters', async () => {
    const untaggedRepo = {
      ...mockRepos[0],
      id: 99,
      name: 'untagged-project',
      full_name: 'user/untagged-project',
      topics: ['react', 'typescript'],
    }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(jsonResponse([untaggedRepo])))

    const {result} = renderHook(() => useGitHub(uniqueUsername()))

    await waitFor(() => expect(result.current.loading).toBe(false), {timeout: 3000})

    expect(result.current.projects).toHaveLength(0)
  })

  it('should exclude a repo with undefined topics without crashing', async () => {
    const repoNoTopics = {...mockRepos[0], topics: undefined as unknown as string[]}
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(jsonResponse([repoNoTopics])))

    const {result} = renderHook(() => useGitHub(uniqueUsername()))

    await waitFor(() => expect(result.current.loading).toBe(false), {timeout: 3000})

    expect(result.current.projects).toHaveLength(0)
  })

  it('should exclude the site repo by case-normalized full_name even when tagged portfolio', async () => {
    const siteRepo = {
      ...mockRepos[0],
      id: 100,
      name: 'marcusrbrown.github.io',
      full_name: 'marcusrbrown/marcusrbrown.github.io',
      topics: ['portfolio'],
    }
    const siteRepoDifferentCase = {
      ...mockRepos[0],
      id: 101,
      name: 'marcusrbrown.github.io',
      full_name: 'MarcusRBrown/Marcusrbrown.GitHub.io',
      topics: ['portfolio'],
    }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(jsonResponse([siteRepo, siteRepoDifferentCase])))

    const {result} = renderHook(() => useGitHub(uniqueUsername()))

    await waitFor(() => expect(result.current.loading).toBe(false), {timeout: 3000})

    expect(result.current.projects).toHaveLength(0)
  })

  it('should include every portfolio-tagged repo with no count cap (R6)', async () => {
    const manyRepos = Array.from({length: 13}, (_, i) => ({
      ...mockRepos[0],
      id: 200 + i,
      name: `portfolio-repo-${i}`,
      full_name: `user/portfolio-repo-${i}`,
      topics: ['portfolio'],
    }))
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(jsonResponse(manyRepos)))

    const {result} = renderHook(() => useGitHub(uniqueUsername()))

    await waitFor(() => expect(result.current.loading).toBe(false), {timeout: 3000})

    expect(result.current.projects).toHaveLength(13)
  })

  it('should return an empty project list when zero repos are tagged portfolio', async () => {
    const untaggedRepo = {...mockRepos[0], topics: []}
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse([untaggedRepo])))

    const {result} = renderHook(() => useGitHub(uniqueUsername()))

    await waitFor(() => expect(result.current.loading).toBe(false), {timeout: 3000})

    expect(result.current.projects).toEqual([])
    expect(result.current.projectsError).toBeNull()
  })

  it('should preserve topics for an included portfolio-tagged repo', async () => {
    const repoOnlyPortfolio = {...mockRepos[0], topics: ['portfolio']}
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(jsonResponse([repoOnlyPortfolio])))

    const {result} = renderHook(() => useGitHub(uniqueUsername()))

    await waitFor(() => expect(result.current.loading).toBe(false), {timeout: 3000})

    expect(result.current.projects[0]?.topics).toEqual(['portfolio'])
  })

  it('should handle repos with no language', async () => {
    const repoNoLang = {...mockRepos[0], language: null}
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(jsonResponse([repoNoLang])))

    const {result} = renderHook(() => useGitHub(uniqueUsername()))

    await waitFor(() => expect(result.current.loading).toBe(false), {timeout: 3000})

    expect(result.current.projects[0]?.language).toBe('Unknown')
  })

  it('should surface a friendly error for a 403 rate-limit object payload', async () => {
    const resetSeconds = Math.floor(Date.now() / 1000) + 60
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          jsonResponse(
            {message: 'API rate limit exceeded'},
            {status: 403, headers: {'X-RateLimit-Reset': String(resetSeconds)}},
          ),
        ),
      ),
    )

    const {result} = renderHook(() => useGitHub(uniqueUsername()))

    await waitFor(() => expect(result.current.projectsLoading).toBe(false), {timeout: 3000})

    expect(result.current.projectsError).toMatch(/rate limit/i)
    expect(result.current.rateLimitReset).toBeInstanceOf(Date)
  })

  it('should handle malformed JSON responses', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          headers: new Headers(),
          json: () => Promise.reject(new Error('Unexpected token')),
        }),
      ),
    )

    const {result} = renderHook(() => useGitHub(uniqueUsername()))

    await waitFor(() => expect(result.current.projectsLoading).toBe(false), {timeout: 3000})

    expect(result.current.projectsError).toMatch(/malformed/i)
  })

  it('should reject payloads with the wrong shape', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(jsonResponse([{id: 'not-a-number', name: 123}]))),
    )

    const {result} = renderHook(() => useGitHub(uniqueUsername()))

    await waitFor(() => expect(result.current.projectsLoading).toBe(false), {timeout: 3000})

    expect(result.current.projectsError).toMatch(/unexpected data shape/i)
    expect(result.current.repos).toEqual([])
  })

  it('should reject a repo payload missing full_name as an unexpected data shape', async () => {
    const baseRepo = mockRepos[0]
    if (!baseRepo) throw new Error('mockRepos[0] must be defined')
    const {full_name: _fullName, ...repoWithoutFullName} = baseRepo
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(jsonResponse([repoWithoutFullName]))),
    )

    const {result} = renderHook(() => useGitHub(uniqueUsername()))

    await waitFor(() => expect(result.current.projectsLoading).toBe(false), {timeout: 3000})

    expect(result.current.projectsError).toMatch(/unexpected data shape/i)
    expect(result.current.repos).toEqual([])
  })

  it('should reuse cached results across remounts without refetching', async () => {
    const username = uniqueUsername()
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse(mockRepos))
    vi.stubGlobal('fetch', fetchMock)

    const {result: first, unmount} = renderHook(() => useGitHub(username))
    await waitFor(() => expect(first.current.loading).toBe(false), {timeout: 3000})
    unmount()

    const callsAfterFirstMount = fetchMock.mock.calls.length

    const {result: second} = renderHook(() => useGitHub(username))
    await waitFor(() => expect(second.current.loading).toBe(false), {timeout: 3000})

    expect(fetchMock.mock.calls.length).toBe(callsAfterFirstMount)
    expect(second.current.repos).toHaveLength(mockRepos.length)
  })

  it('should refetch after the cache TTL expires instead of reusing a settled inflight request', async () => {
    const username = uniqueUsername()
    const nowSpy = vi.spyOn(Date, 'now')
    nowSpy.mockReturnValue(1_000_000)

    const fetchMock = vi.fn(() => Promise.resolve(jsonResponse(mockRepos)))
    vi.stubGlobal('fetch', fetchMock)

    const {result: first, unmount} = renderHook(() => useGitHub(username))
    await waitFor(() => expect(first.current.loading).toBe(false), {timeout: 3000})
    unmount()

    expect(fetchMock).toHaveBeenCalledTimes(1)

    nowSpy.mockReturnValue(1_000_000 + 300_001)

    const {result: second} = renderHook(() => useGitHub(username))
    await waitFor(() => expect(second.current.loading).toBe(false), {timeout: 3000})

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(second.current.repos).toHaveLength(mockRepos.length)
  })

  it('should keep shared in-flight requests alive when the creating hook unmounts', async () => {
    const username = uniqueUsername()
    let resolveRepos: ((value: Response | PromiseLike<Response>) => void) | undefined

    const fetchMock = vi.fn(
      () =>
        new Promise<Response>(resolve => {
          resolveRepos = resolve
        }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const first = renderHook(() => useGitHub(username))
    const second = renderHook(() => useGitHub(username))

    first.unmount()

    resolveRepos?.(jsonResponse(mockRepos))

    await waitFor(() => expect(second.result.current.loading).toBe(false), {timeout: 3000})

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(second.result.current.projects).toHaveLength(1)
  })

  it('should not abort shared in-flight requests when one consumer retries', async () => {
    const username = uniqueUsername()
    let aborted = false
    let resolveRepos: ((value: Response | PromiseLike<Response>) => void) | undefined

    const fetchMock = vi.fn((_url: string, init?: RequestInit) => {
      return new Promise<Response>((resolve, reject) => {
        init?.signal?.addEventListener(
          'abort',
          () => {
            aborted = true
            reject(new DOMException('The operation was aborted.', 'AbortError'))
          },
          {once: true},
        )
        resolveRepos = resolve
      })
    })
    vi.stubGlobal('fetch', fetchMock)

    const first = renderHook(() => useGitHub(username))
    const second = renderHook(() => useGitHub(username))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1), {timeout: 3000})

    act(() => {
      first.result.current.retry()
    })

    expect(aborted).toBe(false)
    expect(fetchMock).toHaveBeenCalledTimes(1)

    resolveRepos?.(jsonResponse(mockRepos))

    await waitFor(() => expect(second.result.current.loading).toBe(false), {timeout: 3000})

    expect(first.result.current.loading).toBe(false)
    expect(first.result.current.error).toBeNull()
    expect(second.result.current.error).toBeNull()
    expect(second.result.current.projects).toHaveLength(1)
  })

  it('should refetch when retry is invoked', async () => {
    const username = uniqueUsername()
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(mockRepos))
      .mockResolvedValueOnce(jsonResponse(mockRepos))
    vi.stubGlobal('fetch', fetchMock)

    const {result} = renderHook(() => useGitHub(username))
    await waitFor(() => expect(result.current.loading).toBe(false), {timeout: 3000})

    const callsBeforeRetry = fetchMock.mock.calls.length

    act(() => {
      result.current.retry()
    })

    await waitFor(() => expect(fetchMock.mock.calls.length).toBeGreaterThan(callsBeforeRetry), {timeout: 3000})
  })

  it('should not update state with a stale response after unmount (cancellation)', async () => {
    const username = uniqueUsername()
    let resolveRepos: ((value: unknown) => void) | undefined
    const fetchMock = vi.fn().mockImplementation(() => {
      return new Promise(resolve => {
        resolveRepos = resolve
      })
    })
    vi.stubGlobal('fetch', fetchMock)

    const {result, unmount} = renderHook(() => useGitHub(username))
    unmount()

    resolveRepos?.(jsonResponse(mockRepos))

    // Give any pending microtasks a chance to run; state must remain unset.
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(result.current.repos).toEqual([])
  })
})
