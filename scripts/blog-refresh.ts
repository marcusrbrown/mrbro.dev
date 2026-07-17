#!/usr/bin/env tsx

/**
 * Blog snapshot refresh script.
 *
 * Fetches public gists for `marcusrbrown`, filters by frontmatter convention (only
 * gists carrying a valid `title`/`date`/`summary` YAML frontmatter block are posts),
 * validates and renders each candidate to sanitized HTML with Shiki-highlighted code
 * fences, and writes `src/data/blog-snapshot.json`.
 *
 * Fails safe: any fetch failure or hard-fail condition (a previously published post
 * whose frontmatter has gone invalid) leaves the existing snapshot file untouched and
 * exits non-zero. New invalid candidates are warned about and excluded without failing
 * the run. Dual CLI/library shape mirrors `scripts/analyze-build.ts`.
 */

import type {Element, Root as HastRoot} from 'hast'
import type {BundledLanguage, Highlighter} from 'shiki'
import type {BlogFrontmatter, BlogPostFull, BlogSnapshot} from '../src/types'
import {readFileSync, writeFileSync} from 'node:fs'
import process from 'node:process'
import rehypeSanitize, {defaultSchema, type Options as SanitizeSchema} from 'rehype-sanitize'
import rehypeStringify from 'rehype-stringify'
import remarkGfm from 'remark-gfm'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import {createHighlighter} from 'shiki'
import {unified} from 'unified'
import {visit} from 'unist-util-visit'
import {parse as parseYaml} from 'yaml'

import {detectSlugCollisions, isSlugResolutionError, resolveSlug, validateBlogFrontmatter} from '../src/utils/blog'

export const GENERATOR = 'blog-refresh'
const DEFAULT_SNAPSHOT_PATH = 'src/data/blog-snapshot.json'
const DEFAULT_USERNAME = 'marcusrbrown'
const LOG_TRUNCATE_LENGTH = 200
const SHIKI_LANGUAGES: BundledLanguage[] = [
  'typescript',
  'javascript',
  'tsx',
  'jsx',
  'json',
  'css',
  'html',
  'markdown',
  'bash',
  'shell',
  'yaml',
  'python',
  'rust',
  'go',
]
const SHIKI_THEMES = {light: 'github-light', dark: 'github-dark'} as const

const sanitizeSchema: SanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    code: [...(defaultSchema.attributes?.code ?? []), ['className', /^language-./]],
  },
}

interface GistFile {
  content: string
}

/** Minimal shape of a single candidate gist, decoupled from the raw GitHub API response. */
export interface RefreshCandidate {
  gistId: string
  gistUrl: string
  gistUpdatedAt: string
  files: Record<string, GistFile>
}

interface FrontmatterSplit {
  frontmatter: unknown
  body: string
}

/**
 * Splits a Markdown document into its YAML frontmatter block and body. Returns `null`
 * when no `---`-delimited frontmatter block is present, or when the YAML fails to parse.
 */
export const splitFrontmatter = (source: string): FrontmatterSplit | null => {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(source)
  if (!match) {
    return null
  }

  const [, rawFrontmatter, body] = match
  try {
    const frontmatter: unknown = parseYaml(rawFrontmatter ?? '')
    return {frontmatter, body: body ?? ''}
  } catch {
    return null
  }
}

type MarkdownSourceResult = {filename: string; content: string} | {error: string}

/**
 * Selects the Markdown source file for a candidate gist: the sole `.md` file wins
 * automatically; multiple `.md` files require an explicit frontmatter `source` field
 * naming one of them, otherwise selection fails naming every candidate file.
 */
export const selectMarkdownSource = (files: Record<string, GistFile>): MarkdownSourceResult => {
  const markdownEntries = Object.entries(files).filter(([name]) => name.toLowerCase().endsWith('.md'))

  if (markdownEntries.length === 0) {
    return {error: 'No Markdown file found in gist'}
  }

  if (markdownEntries.length === 1) {
    const [filename, file] = markdownEntries[0] as [string, GistFile]
    return {filename, content: file.content}
  }

  const sortedNames = markdownEntries.map(([name]) => name).sort((a, b) => a.localeCompare(b))

  for (const [filename, file] of markdownEntries) {
    const split = splitFrontmatter(file.content)
    if (!split) continue
    const frontmatter = split.frontmatter as {source?: unknown} | null
    if (frontmatter && typeof frontmatter === 'object' && frontmatter.source === filename) {
      return {filename, content: file.content}
    }
  }

  return {
    error: `Multiple Markdown files found (${sortedNames.join(', ')}) with no frontmatter "source" field naming one of them`,
  }
}

/** Escapes HTML-significant characters and truncates to ~200 chars for safe log/summary output. */
export const truncateForLog = (input: string): string => {
  const escaped = input
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')

  if (escaped.length <= LOG_TRUNCATE_LENGTH) {
    return escaped
  }

  return `${escaped.slice(0, LOG_TRUNCATE_LENGTH)}…`
}

const getCodeText = (node: Element): string => {
  return node.children
    .filter((child): child is {type: 'text'; value: string} => child.type === 'text')
    .map(child => child.value)
    .join('')
}

const getLanguageFromClassName = (node: Element): string => {
  const className = node.properties?.className
  const classes = Array.isArray(className) ? className : []
  const languageClass = classes.find(cls => typeof cls === 'string' && cls.startsWith('language-'))
  return typeof languageClass === 'string' ? languageClass.slice('language-'.length) : 'text'
}

/** Rehype plugin: replaces sanitized `<pre><code>` fences with Shiki-highlighted markup. */
const rehypeShikiHighlight = (highlighter: Highlighter) => () => (tree: HastRoot) => {
  visit(tree, 'element', (node, index, parent) => {
    if (node.tagName !== 'pre' || !parent || index === undefined) {
      return
    }

    const codeNode = node.children.find(
      (child): child is Element => child.type === 'element' && child.tagName === 'code',
    )
    if (!codeNode) {
      return
    }

    const language = getLanguageFromClassName(codeNode)
    const text = getCodeText(codeNode)
    const loadedLanguages = highlighter.getLoadedLanguages()
    const safeLanguage = loadedLanguages.includes(language) ? language : 'text'

    const hast = highlighter.codeToHast(text, {
      lang: safeLanguage,
      themes: SHIKI_THEMES,
      defaultColor: false,
    })

    const preNode = hast.children.find((child): child is Element => child.type === 'element') as Element | undefined
    if (!preNode) {
      return
    }

    const existingClass = typeof preNode.properties?.class === 'string' ? preNode.properties.class : ''
    preNode.properties = {
      ...preNode.properties,
      class: [existingClass, 'code-block__content'].filter(Boolean).join(' '),
    }

    parent.children[index] = {
      type: 'element',
      tagName: 'div',
      properties: {className: ['code-block']},
      children: [preNode],
    }
  })
}

const renderMarkdown = async (body: string, highlighter: Highlighter): Promise<string> => {
  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypeSanitize, sanitizeSchema)
    .use(rehypeShikiHighlight(highlighter))
    .use(rehypeStringify)
    .process(body)

  return String(file)
}

export interface RefreshWarning {
  gistId: string
  reason: string
}

export interface BuildSnapshotResult {
  snapshot: BlogSnapshot
  warnings: RefreshWarning[]
  /** Non-null when a hard-fail condition occurred; `snapshot` is the untouched previous snapshot in that case. */
  fatalError: string | null
}

const stableStringify = (snapshot: BlogSnapshot): string => `${JSON.stringify(snapshot, null, 2)}\n`

/**
 * Builds the new blog snapshot from fetched candidates and the previous snapshot
 * (the slug registry). Implements the fail-safe matrix:
 * - a previously published gist whose frontmatter is now invalid hard-fails, naming the slug
 * - a new candidate with invalid frontmatter is excluded with a warning
 * - a previously published gist absent from `candidates` is dropped silently
 */
export const buildSnapshot = async (
  candidates: RefreshCandidate[],
  previousSnapshot: BlogSnapshot,
): Promise<BuildSnapshotResult> => {
  const highlighter = await createHighlighter({themes: [SHIKI_THEMES.light, SHIKI_THEMES.dark], langs: SHIKI_LANGUAGES})
  const previousByGistId = new Map(previousSnapshot.posts.map(post => [post.gistId, post]))
  const warnings: RefreshWarning[] = []
  const posts: BlogPostFull[] = []

  for (const candidate of candidates) {
    const wasPublished = previousByGistId.has(candidate.gistId)

    const sourceResult = selectMarkdownSource(candidate.files)
    if ('error' in sourceResult) {
      if (wasPublished) {
        const previousSlug = previousByGistId.get(candidate.gistId)?.slug ?? candidate.gistId
        highlighter.dispose()
        return {
          snapshot: previousSnapshot,
          warnings,
          fatalError: `Previously published post "${previousSlug}" (gist ${candidate.gistId}) is no longer valid: ${sourceResult.error}`,
        }
      }
      warnings.push({gistId: candidate.gistId, reason: sourceResult.error})
      continue
    }

    const split = splitFrontmatter(sourceResult.content)
    if (!split) {
      if (wasPublished) {
        const previousSlug = previousByGistId.get(candidate.gistId)?.slug ?? candidate.gistId
        highlighter.dispose()
        return {
          snapshot: previousSnapshot,
          warnings,
          fatalError: `Previously published post "${previousSlug}" (gist ${candidate.gistId}) is no longer valid: missing or malformed frontmatter`,
        }
      }
      // Not a frontmatter-carrying candidate at all — silently excluded (not a "post" attempt).
      continue
    }

    const validation = validateBlogFrontmatter(split.frontmatter)
    if (!validation.isValid) {
      if (wasPublished) {
        const previousSlug = previousByGistId.get(candidate.gistId)?.slug ?? candidate.gistId
        highlighter.dispose()
        return {
          snapshot: previousSnapshot,
          warnings,
          fatalError: `Previously published post "${previousSlug}" (gist ${candidate.gistId}) is no longer valid: ${validation.errors.join('; ')}`,
        }
      }
      warnings.push({gistId: candidate.gistId, reason: `Invalid frontmatter: ${validation.errors.join('; ')}`})
      continue
    }

    const frontmatter = split.frontmatter as BlogFrontmatter
    const previousPost = previousByGistId.get(candidate.gistId)
    const slug = previousPost
      ? previousPost.slug
      : (() => {
          const resolved = resolveSlug(frontmatter)
          return isSlugResolutionError(resolved) ? resolved : resolved
        })()

    if (isSlugResolutionError(slug)) {
      if (wasPublished) {
        highlighter.dispose()
        return {
          snapshot: previousSnapshot,
          warnings,
          fatalError: `Previously published post (gist ${candidate.gistId}) is no longer valid: ${slug.reason}`,
        }
      }
      warnings.push({gistId: candidate.gistId, reason: slug.reason})
      continue
    }

    const html = await renderMarkdown(split.body, highlighter)

    posts.push({
      slug,
      frontmatter,
      html,
      gistId: candidate.gistId,
      gistUrl: candidate.gistUrl,
      gistUpdatedAt: candidate.gistUpdatedAt,
    })
  }

  highlighter.dispose()

  const collisions = detectSlugCollisions(posts.map(post => ({slug: post.slug, identifier: post.gistId})))
  if (collisions.length > 0) {
    const message = collisions.map(c => `"${c.slug}" (${c.identifiers.join(', ')})`).join('; ')
    return {
      snapshot: previousSnapshot,
      warnings,
      fatalError: `Slug collision(s) detected: ${message}`,
    }
  }

  posts.sort((a, b) => {
    const dateDiff = new Date(b.frontmatter.date).getTime() - new Date(a.frontmatter.date).getTime()
    if (dateDiff !== 0) return dateDiff
    return a.slug.localeCompare(b.slug)
  })

  const candidateSnapshot: BlogSnapshot = {
    posts,
    generatedAt: previousSnapshot.generatedAt,
    generator: GENERATOR,
  }

  const unchanged =
    stableStringify({...candidateSnapshot, generatedAt: previousSnapshot.generatedAt}) ===
    stableStringify(previousSnapshot)

  return {
    snapshot: unchanged ? candidateSnapshot : {...candidateSnapshot, generatedAt: new Date().toISOString()},
    warnings,
    fatalError: null,
  }
}

interface GitHubGistFileResponse {
  content?: string
}

interface GitHubGistResponse {
  id?: string
  html_url?: string
  updated_at?: string
  public?: boolean
  files?: Record<string, GitHubGistFileResponse>
}

const isGistArray = (data: unknown): data is GitHubGistResponse[] => Array.isArray(data)

const toCandidate = (gist: GitHubGistResponse): RefreshCandidate | null => {
  if (typeof gist.id !== 'string' || typeof gist.html_url !== 'string' || typeof gist.updated_at !== 'string') {
    return null
  }

  const files: Record<string, GistFile> = {}
  for (const [name, file] of Object.entries(gist.files ?? {})) {
    if (typeof file.content === 'string') {
      files[name] = {content: file.content}
    }
  }

  return {gistId: gist.id, gistUrl: gist.html_url, gistUpdatedAt: gist.updated_at, files}
}

export interface RefreshOptions {
  snapshotPath?: string
  username?: string
  token?: string | undefined
}

const readPreviousSnapshot = (snapshotPath: string): BlogSnapshot => {
  try {
    const raw = readFileSync(snapshotPath, 'utf8')
    return JSON.parse(raw) as BlogSnapshot
  } catch {
    return {posts: [], generatedAt: new Date().toISOString(), generator: GENERATOR}
  }
}

/**
 * Fetches gists, builds the snapshot, and writes it to disk. Fails safe: any error
 * before a successful build leaves the on-disk snapshot untouched and sets a non-zero
 * `process.exitCode`.
 */
export const refreshBlogSnapshot = async (options: RefreshOptions = {}): Promise<void> => {
  const snapshotPath = options.snapshotPath ?? DEFAULT_SNAPSHOT_PATH
  const username = options.username ?? DEFAULT_USERNAME
  const token = options.token ?? process.env.GITHUB_TOKEN

  const previousSnapshot = readPreviousSnapshot(snapshotPath)

  let gists: GitHubGistResponse[]
  try {
    const headers: Record<string, string> = {accept: 'application/vnd.github+json'}
    if (token) {
      headers.authorization = `Bearer ${token}`
    }

    const response = await fetch(`https://api.github.com/users/${username}/gists?per_page=100`, {headers})
    if (!response.ok) {
      console.error(`❌ Failed to fetch gists: ${response.status} ${response.statusText}`)
      process.exitCode = 1
      return
    }

    const data: unknown = await response.json()
    if (!isGistArray(data)) {
      console.error('❌ Unexpected gist list response shape')
      process.exitCode = 1
      return
    }
    gists = data
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`❌ Failed to fetch gists: ${truncateForLog(message)}`)
    process.exitCode = 1
    return
  }

  const candidates = gists.map(toCandidate).filter((candidate): candidate is RefreshCandidate => candidate !== null)

  const result = await buildSnapshot(candidates, previousSnapshot)

  if (result.fatalError) {
    console.error(`❌ Blog refresh failed: ${truncateForLog(result.fatalError)}`)
    process.exitCode = 1
    return
  }

  for (const warning of result.warnings) {
    console.warn(`⚠️  Excluding gist ${truncateForLog(warning.gistId)}: ${truncateForLog(warning.reason)}`)
  }

  writeFileSync(snapshotPath, stableStringify(result.snapshot))

  console.log(`✅ Blog snapshot refreshed: ${result.snapshot.posts.length} post(s), ${result.warnings.length} excluded`)
  process.exitCode = 0
}

if (import.meta.url === `file://${process.argv[1]}`) {
  refreshBlogSnapshot().catch((error: unknown) => {
    console.error('❌ Unexpected blog refresh error:', error)
    process.exitCode = 1
  })
}
