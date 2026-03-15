/**
 * @vitest-environment happy-dom
 */

import {renderHook, waitFor} from '@testing-library/react'
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

describe('useGitHub', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('should start in loading state', () => {
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise(() => {})))
    const {result} = renderHook(() => useGitHub())
    expect(result.current.loading).toBe(true)
    expect(result.current.error).toBeNull()
  })

  it('should return initial empty arrays', () => {
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise(() => {})))
    const {result} = renderHook(() => useGitHub())
    expect(result.current.repos).toEqual([])
    expect(result.current.projects).toEqual([])
    expect(result.current.blogPosts).toEqual([])
  })

  it('should fetch repos and gists on mount and set loading false', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce({json: () => Promise.resolve(mockRepos)})
        .mockResolvedValueOnce({json: () => Promise.resolve(mockGists)}),
    )

    const {result} = renderHook(() => useGitHub())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.error).toBeNull()
    expect(result.current.repos).toHaveLength(mockRepos.length)
  })

  it('should filter out forked and archived repos', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce({json: () => Promise.resolve(mockRepos)})
        .mockResolvedValueOnce({json: () => Promise.resolve([])}),
    )

    const {result} = renderHook(() => useGitHub())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.projects.every(p => !p.title.includes('fork') && !p.title.includes('arch'))).toBe(true)
    expect(result.current.projects).toHaveLength(1)
  })

  it('should transform repos into Project objects', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce({json: () => Promise.resolve(mockRepos)})
        .mockResolvedValueOnce({json: () => Promise.resolve([])}),
    )

    const {result} = renderHook(() => useGitHub())

    await waitFor(() => expect(result.current.loading).toBe(false))

    const project = result.current.projects[0]
    expect(project).toBeDefined()
    expect(project?.title).toBe('My Project')
    expect(project?.language).toBe('TypeScript')
    expect(project?.stars).toBe(42)
  })

  it('should transform gists into BlogPost objects', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce({json: () => Promise.resolve([])})
        .mockResolvedValueOnce({json: () => Promise.resolve(mockGists)}),
    )

    const {result} = renderHook(() => useGitHub())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.blogPosts).toHaveLength(1)
    expect(result.current.blogPosts[0]?.title).toBe('A useful gist')
  })

  it('should handle gist with no description', async () => {
    const noDescGist = {...mockGists[0], description: ''}
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce({json: () => Promise.resolve([])})
        .mockResolvedValueOnce({json: () => Promise.resolve([noDescGist])}),
    )

    const {result} = renderHook(() => useGitHub())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.blogPosts[0]?.title).toBe('Untitled')
  })

  it('should set error state when fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new Error('network error')))

    const {result} = renderHook(() => useGitHub())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.error).toBe('Failed to fetch data from GitHub')
  })

  it('should accept a custom username', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({json: () => Promise.resolve([])})
      .mockResolvedValueOnce({json: () => Promise.resolve([])})
    vi.stubGlobal('fetch', fetchMock)

    renderHook(() => useGitHub('testuser'))

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())

    expect(fetchMock.mock.calls[0]?.[0]).toContain('testuser')
  })

  it('should handle repos with no topics', async () => {
    const repoNoTopics = {...mockRepos[0], topics: undefined as unknown as string[]}
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce({json: () => Promise.resolve([repoNoTopics])})
        .mockResolvedValueOnce({json: () => Promise.resolve([])}),
    )

    const {result} = renderHook(() => useGitHub())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.projects[0]?.topics).toEqual([])
  })

  it('should handle repos with no language', async () => {
    const repoNoLang = {...mockRepos[0], language: null}
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce({json: () => Promise.resolve([repoNoLang])})
        .mockResolvedValueOnce({json: () => Promise.resolve([])}),
    )

    const {result} = renderHook(() => useGitHub())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.projects[0]?.language).toBe('Unknown')
  })
})
