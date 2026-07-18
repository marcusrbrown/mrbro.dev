import type {GitHubRepository} from '../../src/types'
import {describe, expect, it, vi} from 'vitest'
import {fetchRepositories} from '../../src/utils/github'

describe('github utilities', () => {
  const repositories: GitHubRepository[] = [
    {
      id: 1,
      name: 'repo-one',
      full_name: 'user/repo-one',
      description: 'First repository',
      html_url: 'https://github.com/user/repo-one',
      homepage: null,
      language: 'TypeScript',
      stargazers_count: 100,
      topics: ['typescript'],
      updated_at: '2024-01-01T00:00:00Z',
    },
  ]

  it('fetches repositories', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ok: true, json: async () => repositories}))
    await expect(fetchRepositories('testuser')).resolves.toEqual(repositories)
    expect(fetch).toHaveBeenCalledWith('https://api.github.com/users/testuser/repos')
  })

  it('throws on an unsuccessful response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ok: false, status: 404}))
    await expect(fetchRepositories('missing')).rejects.toThrow('HTTP error! status: 404')
  })
})
