import type {BlogPost, Project} from '../types'
import {useCallback, useEffect, useState} from 'react'

interface GitHubRepo {
  id: number
  name: string
  description: string | null
  html_url: string
  language: string | null
  stargazers_count: number
  fork: boolean
  archived: boolean
  created_at: string
  updated_at: string
  homepage: string | null
  topics: string[]
}

interface GitHubGist {
  id: string
  description: string | null
  html_url: string
  created_at: string
  updated_at: string
  public: boolean
}

export interface UseGitHubReturn {
  repos: GitHubRepo[]
  projects: Project[]
  blogPosts: BlogPost[]
  /** True while either feed is loading. */
  loading: boolean
  /** First non-null feed error, kept for callers that only care about "something failed". */
  error: string | null
  projectsLoading: boolean
  projectsError: string | null
  blogLoading: boolean
  blogError: string | null
  /** Reset time for an active GitHub rate limit, if one was reported by either feed. */
  rateLimitReset: Date | null
  /** Re-invokes both feed fetches, bypassing the in-memory cache. */
  retry: () => void
}

// Session-scoped cache: successful responses are reused for this long before a
// background refetch is attempted again. Chosen to keep repeated mounts
// (Home, Projects, Blog all use this hook) from re-hitting the GitHub API on
// every navigation while still picking up new repos/gists within a session.
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

interface CacheEntry<T> {
  data: T
  timestamp: number
}

interface InflightRequest<T> {
  controller: AbortController
  promise: Promise<FetchOutcome<T>>
}

const reposMemoryCache = new Map<string, CacheEntry<GitHubRepo[]>>()
const gistsMemoryCache = new Map<string, CacheEntry<GitHubGist[]>>()
const reposInflight = new Map<string, InflightRequest<GitHubRepo[]>>()
const gistsInflight = new Map<string, InflightRequest<GitHubGist[]>>()

const sessionCacheKey = (kind: 'repos' | 'gists', username: string): string => `gh-cache:${kind}:${username}`

function readSessionCache<T>(key: string, validate: (value: unknown) => value is T): CacheEntry<T> | null {
  try {
    if (typeof sessionStorage === 'undefined') return null
    const raw = sessionStorage.getItem(key)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return null
    const entry = parsed as Record<string, unknown>
    if (typeof entry.timestamp !== 'number' || !validate(entry.data)) return null
    return {data: entry.data, timestamp: entry.timestamp}
  } catch {
    return null
  }
}

function writeSessionCache<T>(key: string, entry: CacheEntry<T>): void {
  try {
    if (typeof sessionStorage === 'undefined') return
    sessionStorage.setItem(key, JSON.stringify(entry))
  } catch {
    // Ignore quota/availability errors — session persistence is best-effort.
  }
}

// --- Shape validation: treat decoded JSON as `unknown` and narrow it. ---

const isString = (value: unknown): value is string => typeof value === 'string'
const isNumber = (value: unknown): value is number => typeof value === 'number'
const isBoolean = (value: unknown): value is boolean => typeof value === 'boolean'
const isNullableString = (value: unknown): value is string | null => value === null || typeof value === 'string'

function isGitHubRepo(value: unknown): value is GitHubRepo {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    isNumber(v.id) &&
    isString(v.name) &&
    isNullableString(v.description) &&
    isString(v.html_url) &&
    isNullableString(v.language) &&
    isNumber(v.stargazers_count) &&
    isBoolean(v.fork) &&
    isBoolean(v.archived) &&
    isString(v.created_at) &&
    isString(v.updated_at) &&
    isNullableString(v.homepage) &&
    (v.topics === undefined || (Array.isArray(v.topics) && v.topics.every(isString)))
  )
}

const isGitHubRepoArray = (value: unknown): value is GitHubRepo[] => Array.isArray(value) && value.every(isGitHubRepo)

function isGitHubGist(value: unknown): value is GitHubGist {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    isString(v.id) &&
    isString(v.html_url) &&
    isString(v.created_at) &&
    isString(v.updated_at) &&
    (v.description === null || v.description === undefined || isString(v.description)) &&
    (v.public === undefined || isBoolean(v.public))
  )
}

const isGitHubGistArray = (value: unknown): value is GitHubGist[] => Array.isArray(value) && value.every(isGitHubGist)

// --- Fetch + validation, independent of caching/dedup concerns. ---

type FetchOutcome<T> = {ok: true; data: T} | {ok: false; error: string; rateLimitReset: Date | null; isAbort?: boolean}

function parseRateLimitReset(response: Response): Date | null {
  const resetHeader = response.headers.get('X-RateLimit-Reset')
  if (!resetHeader) return null
  const resetSeconds = Number(resetHeader)
  if (!Number.isFinite(resetSeconds)) return null
  return new Date(resetSeconds * 1000)
}

function formatResetTime(reset: Date): string {
  try {
    return reset.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})
  } catch {
    return reset.toISOString()
  }
}

async function fetchGitHubJson<T>(
  url: string,
  signal: AbortSignal,
  validate: (value: unknown) => value is T,
): Promise<FetchOutcome<T>> {
  let response: Response
  try {
    response = await fetch(url, {signal, headers: {Accept: 'application/vnd.github+json'}})
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return {ok: false, error: 'Request cancelled.', rateLimitReset: null, isAbort: true}
    }
    return {ok: false, error: 'Network error while contacting GitHub.', rateLimitReset: null}
  }

  if (typeof response?.ok !== 'boolean') {
    return {ok: false, error: 'Network error while contacting GitHub.', rateLimitReset: null}
  }

  if (!response.ok) {
    const rateLimitReset = parseRateLimitReset(response)
    if ((response.status === 403 || response.status === 429) && rateLimitReset) {
      return {
        ok: false,
        error: `GitHub API rate limit exceeded. Try again after ${formatResetTime(rateLimitReset)}.`,
        rateLimitReset,
      }
    }
    return {ok: false, error: `GitHub API error (status ${response.status}).`, rateLimitReset}
  }

  let json: unknown
  try {
    json = await response.json()
  } catch {
    return {ok: false, error: 'Received malformed data from GitHub.', rateLimitReset: null}
  }

  if (!validate(json)) {
    return {ok: false, error: 'Received unexpected data shape from GitHub.', rateLimitReset: null}
  }

  return {ok: true, data: json}
}

interface LoadFeedOptions<T> {
  cacheKey: string
  memoryCache: Map<string, CacheEntry<T>>
  inflight: Map<string, InflightRequest<T>>
  sessionKey: string
  url: string
  validate: (value: unknown) => value is T
  bypassCache: boolean
}

// Dedupes concurrent requests for the same resource and serves fresh
// responses from the module cache within CACHE_TTL_MS. The underlying fetch
// uses its own AbortController so that one consumer unmounting doesn't cancel
// the shared request for others still awaiting it. In-flight entries are always
// cleared once the request settles so stale resolved promises don't outlive the
// cache TTL.
async function loadFeed<T>(options: LoadFeedOptions<T>): Promise<FetchOutcome<T>> {
  const {cacheKey, memoryCache, inflight, sessionKey, url, validate, bypassCache} = options

  if (!bypassCache) {
    const cached = memoryCache.get(cacheKey) ?? readSessionCache(sessionKey, validate)
    if (cached) memoryCache.set(cacheKey, cached)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return {ok: true, data: cached.data}
    }
  }

  const request = inflight.get(cacheKey)
  if (!request) {
    const controller = new AbortController()
    const promise = fetchGitHubJson(url, controller.signal, validate).then(outcome => {
      if (outcome.ok) {
        const entry: CacheEntry<T> = {data: outcome.data, timestamp: Date.now()}
        memoryCache.set(cacheKey, entry)
        writeSessionCache(sessionKey, entry)
      }
      return outcome
    })

    inflight.set(cacheKey, {controller, promise})
    promise.then(
      () => {
        if (inflight.get(cacheKey)?.promise === promise) inflight.delete(cacheKey)
      },
      () => {
        if (inflight.get(cacheKey)?.promise === promise) inflight.delete(cacheKey)
      },
    )

    return promise
  }

  return request.promise
}

const transformReposToProjects = (repos: GitHubRepo[]): Project[] =>
  repos
    .filter(repo => !repo.fork && !repo.archived && repo.description)
    .sort((a, b) => b.stargazers_count - a.stargazers_count)
    .slice(0, 12)
    .map(repo => ({
      id: repo.id.toString(),
      title: repo.name
        .replaceAll('-', ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' '),
      description: repo.description || 'No description available',
      url: repo.html_url,
      language: repo.language || 'Unknown',
      stars: repo.stargazers_count,
      homepage: repo.homepage,
      topics: repo.topics || [],
      lastUpdated: repo.updated_at,
      imageUrl: undefined,
    }))

const transformGistsToBlogPosts = (gists: GitHubGist[]): BlogPost[] =>
  gists.map(gist => ({
    id: gist.id,
    title: gist.description || 'Untitled',
    summary: '',
    date: gist.created_at,
    url: gist.html_url,
  }))

export const useGitHub = (username = 'marcusrbrown'): UseGitHubReturn => {
  const [repos, setRepos] = useState<GitHubRepo[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([])
  const [projectsLoading, setProjectsLoading] = useState(true)
  const [projectsError, setProjectsError] = useState<string | null>(null)
  const [blogLoading, setBlogLoading] = useState(true)
  const [blogError, setBlogError] = useState<string | null>(null)
  const [rateLimitReset, setRateLimitReset] = useState<Date | null>(null)
  const [retryToken, setRetryToken] = useState(0)

  const retry = useCallback(() => {
    reposMemoryCache.delete(username)
    gistsMemoryCache.delete(username)
    setRetryToken(token => token + 1)
  }, [username])

  useEffect(() => {
    let cancelled = false
    const bypassCache = retryToken > 0

    const cachedRepos = readSessionCache(sessionCacheKey('repos', username), isGitHubRepoArray)
    if (cachedRepos) {
      setRepos(cachedRepos.data)
      setProjects(transformReposToProjects(cachedRepos.data))
    }
    const cachedGists = readSessionCache(sessionCacheKey('gists', username), isGitHubGistArray)
    if (cachedGists) setBlogPosts(transformGistsToBlogPosts(cachedGists.data))

    const runRepos = async () => {
      setProjectsLoading(true)
      const outcome = await loadFeed({
        cacheKey: username,
        memoryCache: reposMemoryCache,
        inflight: reposInflight,
        sessionKey: sessionCacheKey('repos', username),
        url: `https://api.github.com/users/${username}/repos?sort=updated&per_page=100`,
        validate: isGitHubRepoArray,
        bypassCache,
      })

      if (cancelled) return

      if (outcome.ok) {
        setRepos(outcome.data)
        setProjects(transformReposToProjects(outcome.data))
        setProjectsError(null)
      } else if (!outcome.isAbort) {
        setProjectsError(outcome.error)
        if (outcome.rateLimitReset) setRateLimitReset(outcome.rateLimitReset)

        // Render stale last-good data during transient failures rather than
        // blanking the section.
        const stale = readSessionCache(sessionCacheKey('repos', username), isGitHubRepoArray)
        if (stale) {
          setRepos(stale.data)
          setProjects(transformReposToProjects(stale.data))
        }
      }

      if (!cancelled) setProjectsLoading(false)
    }

    const runGists = async () => {
      setBlogLoading(true)
      const outcome = await loadFeed({
        cacheKey: username,
        memoryCache: gistsMemoryCache,
        inflight: gistsInflight,
        sessionKey: sessionCacheKey('gists', username),
        url: `https://api.github.com/users/${username}/gists`,
        validate: isGitHubGistArray,
        bypassCache,
      })

      if (cancelled) return

      if (outcome.ok) {
        setBlogPosts(transformGistsToBlogPosts(outcome.data))
        setBlogError(null)
      } else if (!outcome.isAbort) {
        setBlogError(outcome.error)
        if (outcome.rateLimitReset) setRateLimitReset(outcome.rateLimitReset)

        const stale = readSessionCache(sessionCacheKey('gists', username), isGitHubGistArray)
        if (stale) {
          setBlogPosts(transformGistsToBlogPosts(stale.data))
        }
      }

      if (!cancelled) setBlogLoading(false)
    }

    runRepos().catch(error => {
      if (!cancelled) {
        setProjectsError(error instanceof Error ? error.message : 'Network error while contacting GitHub.')
        setProjectsLoading(false)
      }
    })
    runGists().catch(error => {
      if (!cancelled) {
        setBlogError(error instanceof Error ? error.message : 'Network error while contacting GitHub.')
        setBlogLoading(false)
      }
    })

    return () => {
      cancelled = true
    }
  }, [username, retryToken])

  return {
    repos,
    projects,
    blogPosts,
    loading: projectsLoading || blogLoading,
    error: projectsError ?? blogError ?? null,
    projectsLoading,
    projectsError,
    blogLoading,
    blogError,
    rateLimitReset,
    retry,
  }
}
