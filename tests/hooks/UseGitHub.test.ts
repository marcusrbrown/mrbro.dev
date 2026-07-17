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
    description: 'A great project',
    html_url: 'https://github.com/user/my-project',
    language: 'TypeScript',
    stargazers_count: 42,
    fork: false,
    archived: false,
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    homepage: 'https://example.com',
    topics: ['react', 'typescript'],
  },
  {
    id: 2,
    name: 'forked-project',
    description: 'A fork',
    html_url: 'https://github.com/user/forked-project',
    language: 'JavaScript',
    stargazers_count: 5,
    fork: true,
    archived: false,
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    homepage: null,
    topics: [],
  },
  {
    id: 3,
    name: 'archived-project',
    description: 'Archived',
    html_url: 'https://github.com/user/archived-project',
    language: 'Go',
    stargazers_count: 10,
    fork: false,
    archived: true,
    created_at: '2022-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
    homepage: null,
    topics: [],
  },
]

const mockGists = [
  {
    id: 'gist1',
    description: 'A useful gist',
    html_url: 'https://gist.github.com/user/gist1',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-06-01T00:00:00Z',
    public: true,
  },
]

const jsonResponse = (body: unknown, init: Partial<{status: number; headers: Record<string, string>}> = {}) => ({
  ok: (init.status ?? 200) < 400,
  status: init.status ?? 200,
  headers: new Headers(init.headers ?? {}),
  json: () => Promise.resolve(body),
})

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
    expect(result.current.blogPosts).toEqual([])
  })

  it('should fetch repos and gists on mount and set loading false', async () => {
    const fetchMock = vi.fn((url: string) =>
      Promise.resolve(url.includes('/gists') ? jsonResponse(mockGists) : jsonResponse(mockRepos)),
    )
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
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(jsonResponse(mockRepos)).mockResolvedValueOnce(jsonResponse([])),
    )

    const {result} = renderHook(() => useGitHub(uniqueUsername()))

    await waitFor(() => expect(result.current.loading).toBe(false), {timeout: 3000})

    expect(result.current.projects.every(p => !p.title.includes('fork') && !p.title.includes('arch'))).toBe(true)
    expect(result.current.projects).toHaveLength(1)
  })

  it('should transform repos into Project objects', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(jsonResponse(mockRepos)).mockResolvedValueOnce(jsonResponse([])),
    )

    const {result} = renderHook(() => useGitHub(uniqueUsername()))

    await waitFor(() => expect(result.current.loading).toBe(false), {timeout: 3000})

    const project = result.current.projects[0]
    expect(project).toBeDefined()
    expect(project?.title).toBe('My Project')
    expect(project?.language).toBe('TypeScript')
    expect(project?.stars).toBe(42)
  })

  it('should transform gists into BlogPost objects', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(jsonResponse([])).mockResolvedValueOnce(jsonResponse(mockGists)),
    )

    const {result} = renderHook(() => useGitHub(uniqueUsername()))

    await waitFor(() => expect(result.current.loading).toBe(false), {timeout: 3000})

    expect(result.current.blogPosts).toHaveLength(1)
    expect(result.current.blogPosts[0]?.title).toBe('A useful gist')
  })

  it('should handle gist with no description', async () => {
    const noDescGist = {...mockGists[0], description: ''}
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(jsonResponse([]))
        .mockResolvedValueOnce(jsonResponse([noDescGist])),
    )

    const {result} = renderHook(() => useGitHub(uniqueUsername()))

    await waitFor(() => expect(result.current.loading).toBe(false), {timeout: 3000})

    expect(result.current.blogPosts[0]?.title).toBe('Untitled')
  })

  it('should accept a custom username', async () => {
    const username = uniqueUsername()
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse([])).mockResolvedValueOnce(jsonResponse([]))
    vi.stubGlobal('fetch', fetchMock)

    renderHook(() => useGitHub(username))

    await waitFor(() => expect(fetchMock).toHaveBeenCalled(), {timeout: 3000})

    expect(fetchMock.mock.calls[0]?.[0]).toContain(username)
  })

  it('should handle repos with no topics', async () => {
    const repoNoTopics = {...mockRepos[0], topics: undefined as unknown as string[]}
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(jsonResponse([repoNoTopics]))
        .mockResolvedValueOnce(jsonResponse([])),
    )

    const {result} = renderHook(() => useGitHub(uniqueUsername()))

    await waitFor(() => expect(result.current.loading).toBe(false), {timeout: 3000})

    expect(result.current.projects[0]?.topics).toEqual([])
  })

  it('should handle repos with no language', async () => {
    const repoNoLang = {...mockRepos[0], language: null}
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(jsonResponse([repoNoLang]))
        .mockResolvedValueOnce(jsonResponse([])),
    )

    const {result} = renderHook(() => useGitHub(uniqueUsername()))

    await waitFor(() => expect(result.current.loading).toBe(false), {timeout: 3000})

    expect(result.current.projects[0]?.language).toBe('Unknown')
  })

  it('should surface a friendly error for a 403 rate-limit object payload', async () => {
    const resetSeconds = Math.floor(Date.now() / 1000) + 60
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) =>
        Promise.resolve(
          url.includes('/gists')
            ? jsonResponse(mockGists)
            : jsonResponse(
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
    // Blog feed succeeded independently of the repo failure.
    await waitFor(() => expect(result.current.blogLoading).toBe(false), {timeout: 3000})
    expect(result.current.blogError).toBeNull()
    expect(result.current.blogPosts).toHaveLength(1)
  })

  it('should handle malformed JSON responses', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) =>
        Promise.resolve(
          url.includes('/gists')
            ? jsonResponse([])
            : {
                ok: true,
                status: 200,
                headers: new Headers(),
                json: () => Promise.reject(new Error('Unexpected token')),
              },
        ),
      ),
    )

    const {result} = renderHook(() => useGitHub(uniqueUsername()))

    await waitFor(() => expect(result.current.projectsLoading).toBe(false), {timeout: 3000})

    expect(result.current.projectsError).toMatch(/malformed/i)
  })

  it('should reject payloads with the wrong shape', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) =>
        Promise.resolve(url.includes('/gists') ? jsonResponse([]) : jsonResponse([{id: 'not-a-number', name: 123}])),
      ),
    )

    const {result} = renderHook(() => useGitHub(uniqueUsername()))

    await waitFor(() => expect(result.current.projectsLoading).toBe(false), {timeout: 3000})

    expect(result.current.projectsError).toMatch(/unexpected data shape/i)
    expect(result.current.repos).toEqual([])
  })

  it('should keep repo and gist errors independent (partial failure)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) =>
        url.includes('/gists') ? Promise.reject(new Error('network error')) : Promise.resolve(jsonResponse(mockRepos)),
      ),
    )

    const {result} = renderHook(() => useGitHub(uniqueUsername()))

    await waitFor(() => expect(result.current.loading).toBe(false), {timeout: 3000})

    expect(result.current.projectsError).toBeNull()
    expect(result.current.projects.length).toBeGreaterThan(0)
    expect(result.current.blogError).toMatch(/network error/i)
  })

  it('should reuse cached results across remounts without refetching', async () => {
    const username = uniqueUsername()
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(mockRepos))
      .mockResolvedValueOnce(jsonResponse(mockGists))
    vi.stubGlobal('fetch', fetchMock)

    const {result: first, unmount} = renderHook(() => useGitHub(username))
    await waitFor(() => expect(first.current.loading).toBe(false), {timeout: 3000})
    unmount()

    const callsAfterFirstMount = fetchMock.mock.calls.length

    const {result: second} = renderHook(() => useGitHub(username))
    await waitFor(() => expect(second.current.loading).toBe(false), {timeout: 3000})

    expect(fetchMock.mock.calls.length).toBe(callsAfterFirstMount)
    expect(second.current.repos).toHaveLength(mockRepos.length)
    expect(second.current.blogPosts).toHaveLength(mockGists.length)
  })

  it('should refetch when retry is invoked', async () => {
    const username = uniqueUsername()
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(mockRepos))
      .mockResolvedValueOnce(jsonResponse(mockGists))
      .mockResolvedValueOnce(jsonResponse(mockRepos))
      .mockResolvedValueOnce(jsonResponse(mockGists))
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
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/repos')) {
        return new Promise(resolve => {
          resolveRepos = resolve
        })
      }
      return Promise.resolve(jsonResponse([]))
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
