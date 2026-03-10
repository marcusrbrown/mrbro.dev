import type {GitHubIssue, GitHubRepository} from '../../src/types'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {fetchBlogPosts, fetchRepositories} from '../../src/utils/github'

describe('github utilities', () => {
  const mockRepositories: GitHubRepository[] = [
    {
      id: 1,
      name: 'repo-one',
      full_name: 'user/repo-one',
      description: 'First repository',
      html_url: 'https://github.com/user/repo-one',
      homepage: null,
      language: 'TypeScript',
      stargazers_count: 100,
      topics: ['typescript', 'react'],
      updated_at: '2024-01-01T00:00:00Z',
    },
  ]

  const mockIssues: GitHubIssue[] = [
    {
      id: 1,
      number: 1,
      title: 'Blog Post 1',
      body: 'Content of blog post 1',
      html_url: 'https://github.com/user/repo/issues/1',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      labels: [{id: 1, name: 'blog', color: 'blue', description: null}],
      state: 'open',
    },
    {
      id: 2,
      number: 2,
      title: 'Non-blog Issue',
      body: 'Not a blog post',
      html_url: 'https://github.com/user/repo/issues/2',
      created_at: '2024-01-02T00:00:00Z',
      updated_at: '2024-01-02T00:00:00Z',
      labels: [{id: 2, name: 'bug', color: 'red', description: null}],
      state: 'open',
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('fetchRepositories', () => {
    it('should fetch and return repositories', async () => {
      globalThis.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockRepositories,
      } as Response)

      const repos = await fetchRepositories('testuser')
      expect(repos).toEqual(mockRepositories)
      expect(fetch).toHaveBeenCalledWith('https://api.github.com/users/testuser/repos')
    })

    it('should throw when response is not ok', async () => {
      globalThis.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({message: 'Not Found'}),
      } as Response)

      await expect(fetchRepositories('nonexistent')).rejects.toThrow('HTTP error! status: 404')
    })

    it('should throw and log when fetch fails', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
      globalThis.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'))

      await expect(fetchRepositories('testuser')).rejects.toThrow('Network error')
      expect(consoleSpy).toHaveBeenCalled()
    })
  })

  describe('fetchBlogPosts', () => {
    it('should fetch and return only blog-labeled issues', async () => {
      globalThis.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockIssues,
      } as Response)

      const posts = await fetchBlogPosts('user/repo')
      expect(posts).toHaveLength(1)
      expect(posts[0]?.title).toBe('Blog Post 1')
    })

    it('should use correct API endpoint', async () => {
      globalThis.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [],
      } as Response)

      await fetchBlogPosts('user/my-blog')
      expect(fetch).toHaveBeenCalledWith('https://api.github.com/repos/user/my-blog/issues')
    })

    it('should return empty array when no blog-labeled issues', async () => {
      const issuesWithoutBlogLabel: GitHubIssue[] = [
        {
          id: 3,
          number: 3,
          title: 'Feature Request',
          body: null,
          html_url: 'https://github.com/user/repo/issues/3',
          created_at: '2024-01-03T00:00:00Z',
          updated_at: '2024-01-03T00:00:00Z',
          labels: [{id: 3, name: 'feature', color: 'green', description: null}],
          state: 'open',
        },
      ]

      globalThis.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => issuesWithoutBlogLabel,
      } as Response)

      const posts = await fetchBlogPosts('user/repo')
      expect(posts).toHaveLength(0)
    })

    it('should filter out issues with missing labels', async () => {
      const issuesWithMissingLabels = [
        {
          id: 4,
          number: 4,
          title: 'No Labels',
          body: null,
          html_url: 'https://github.com/user/repo/issues/4',
          created_at: '2024-01-04T00:00:00Z',
          updated_at: '2024-01-04T00:00:00Z',
          labels: null, // malformed
          state: 'open',
        },
        {
          id: 5,
          number: 5,
          title: 'Blog With Labels',
          body: 'Content',
          html_url: 'https://github.com/user/repo/issues/5',
          created_at: '2024-01-05T00:00:00Z',
          updated_at: '2024-01-05T00:00:00Z',
          labels: [{id: 1, name: 'blog', color: 'blue', description: null}],
          state: 'open',
        },
      ]

      globalThis.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => issuesWithMissingLabels,
      } as Response)

      const posts = await fetchBlogPosts('user/repo')
      // Only the issue with valid blog label should be returned
      expect(posts).toHaveLength(1)
      expect(posts[0]?.title).toBe('Blog With Labels')
    })

    it('should throw when response is not ok', async () => {
      globalThis.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({message: 'Internal Server Error'}),
      } as Response)

      await expect(fetchBlogPosts('user/repo')).rejects.toThrow('HTTP error! status: 500')
    })

    it('should throw and log when fetch fails', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
      globalThis.fetch = vi.fn().mockRejectedValueOnce(new Error('Network failure'))

      await expect(fetchBlogPosts('user/repo')).rejects.toThrow('Network failure')
      expect(consoleSpy).toHaveBeenCalled()
    })
  })
})
