// Utility functions for interacting with the GitHub API
import type {GitHubRepository} from '../types'

const GITHUB_API_URL = 'https://api.github.com'

// Fetch repositories for the specified user
export const fetchRepositories = async (username: string): Promise<GitHubRepository[]> => {
  try {
    const response = await fetch(`${GITHUB_API_URL}/users/${username}/repos`)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    return await response.json()
  } catch (error) {
    console.error('Error fetching repositories:', error)
    throw error
  }
}
