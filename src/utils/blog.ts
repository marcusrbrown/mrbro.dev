/**
 * Blog content model utilities.
 *
 * Defines frontmatter validation (Ajv, mirroring `schema-validation.ts`) and pure
 * slug helpers (derivation, path-safety rejection, collision detection) shared by
 * the refresh script, prerender script, and client-side blog pages.
 */

import type {BlogFrontmatter, BlogPostFull} from '../types'
import Ajv, {type ErrorObject} from 'ajv'
import addFormats from 'ajv-formats'

import blogFrontmatterSchema from '../schemas/blog-frontmatter.schema.json'

/** Route segments reserved by the app shell; a derived/explicit slug may not collide with these. */
export const RESERVED_SLUGS: readonly string[] = ['blog']

export type BlogValidationResult = {ok: true; value: BlogFrontmatter} | {ok: false; errors: string[]}

const ajv = new Ajv({
  allErrors: true,
  verbose: true,
  strict: false,
  removeAdditional: false,
  useDefaults: false,
  coerceTypes: false,
})

addFormats(ajv)

const validateFrontmatterSchema = ajv.compile<BlogFrontmatter>(blogFrontmatterSchema)

const errorFormatters: Record<string, (error: ErrorObject, path: string) => string> = {
  required: (error, path) => {
    const missingProperty = error.params?.missingProperty
    return `Missing required property: ${path}.${missingProperty}`
  },
  type: (error, path) => {
    const expectedType = error.params?.type
    return `Invalid type at ${path}: expected ${expectedType}, got ${typeof error.data}`
  },
  format: (error, path) => {
    const format = error.params?.format
    return `Invalid format at ${path}: expected ${format} format`
  },
  minLength: (error, path) => {
    const minLength = error.params?.limit
    return `Value too short at ${path}: minimum length is ${minLength}`
  },
  maxLength: (error, path) => {
    const maxLength = error.params?.limit
    return `Value too long at ${path}: maximum length is ${maxLength}`
  },
  maxItems: (error, path) => {
    const limit = error.params?.limit
    return `Too many items at ${path}: maximum is ${limit}`
  },
  uniqueItems: (_, path) => {
    return `Duplicate items are not allowed at ${path}`
  },
  additionalProperties: (error, path) => {
    const additionalProperty = error.params?.additionalProperty
    return `Unexpected property at ${path}: ${additionalProperty} is not allowed`
  },
}

/** Formats Ajv validation errors into human-readable messages. */
export const formatValidationErrors = (errors: ErrorObject[]): string[] => {
  return errors.map(error => {
    const path = error.instancePath || 'root'
    const message = error.message || 'validation failed'
    const formatter = errorFormatters[error.keyword]
    if (formatter) {
      return formatter(error, path)
    }
    return `Validation error at ${path}: ${message}`
  })
}

/** Validates unknown data against the blog frontmatter schema. */
export const validateBlogFrontmatter = (data: unknown): BlogValidationResult => {
  const isValid = validateFrontmatterSchema(data)

  if (isValid) {
    return {ok: true, value: data}
  }

  const errors = validateFrontmatterSchema.errors ?? []
  return {ok: false, errors: formatValidationErrors(errors)}
}

/** Type guard confirming `data` is a valid `BlogFrontmatter` object. */
export const isValidBlogFrontmatter = (data: unknown): data is BlogFrontmatter => {
  return validateBlogFrontmatter(data).ok
}

/**
 * Converts a title into a URL-safe slug: lowercased, unicode-normalized (diacritics
 * stripped), non-alphanumeric runs collapsed to single hyphens, leading/trailing
 * hyphens trimmed.
 */
export const slugify = (title: string): string => {
  return title
    .normalize('NFKD')
    .replaceAll(/[\u0300-\u036F]/g, '')
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/^-+|-+$/g, '')
}

/**
 * Rejects slugs that are unsafe as a filesystem/route path segment: empty, dot/encoded
 * segments, separators, normalization changes, or a reserved app route collision.
 */
export const isPathSafeSlug = (slug: string): boolean => {
  if (slug.length === 0 || slug === '.' || slug === '..') {
    return false
  }
  if (slug.includes('/') || slug.includes('\\') || /%2e|%2f/i.test(slug)) {
    return false
  }
  const segments = slug.split('/')
  if (segments.some(segment => segment === '.' || segment === '..') || slug.normalize() !== slug) {
    return false
  }
  try {
    if (new URL(`https://example.test/${slug}`).pathname !== `/${slug}`) {
      return false
    }
  } catch {
    return false
  }
  if (RESERVED_SLUGS.includes(slug)) {
    return false
  }
  return true
}

export interface SlugResolutionError {
  slug: string
  reason: string
}

/**
 * Resolves the slug for a post: an explicit `frontmatter.slug` wins over a derived
 * slug from the title. Returns an error (rather than throwing) when the resolved
 * slug is path-unsafe, so callers can aggregate validation failures.
 */
export const resolveSlug = (frontmatter: Pick<BlogFrontmatter, 'slug' | 'title'>): string | SlugResolutionError => {
  const candidate = frontmatter.slug && frontmatter.slug.length > 0 ? frontmatter.slug : slugify(frontmatter.title)

  if (!isPathSafeSlug(candidate)) {
    return {slug: candidate, reason: `Slug "${candidate}" is not a valid path segment`}
  }

  return candidate
}

export const isSlugResolutionError = (value: string | SlugResolutionError): value is SlugResolutionError => {
  return typeof value !== 'string'
}

export interface SlugCollision {
  slug: string
  /** Identifiers (e.g. gist IDs or slugs) of the posts sharing this slug. */
  identifiers: string[]
}

/**
 * Detects slug collisions across a set of posts. Each entry must carry a `slug` and
 * an `identifier` used to name the conflicting posts in error output.
 */
export const detectSlugCollisions = (entries: {slug: string; identifier: string}[]): SlugCollision[] => {
  const bySlug = new Map<string, string[]>()

  for (const entry of entries) {
    const identifiers = bySlug.get(entry.slug) ?? []
    identifiers.push(entry.identifier)
    bySlug.set(entry.slug, identifiers)
  }

  const collisions: SlugCollision[] = []
  for (const [slug, identifiers] of bySlug) {
    if (identifiers.length > 1) {
      collisions.push({slug, identifiers})
    }
  }

  return collisions
}

/** Narrows a full snapshot post down to the card-facing meta subset. */
export const toBlogPostMeta = (post: BlogPostFull) => {
  return {
    slug: post.slug,
    title: post.frontmatter.title,
    date: post.frontmatter.date,
    summary: post.frontmatter.summary,
    tags: post.frontmatter.tags,
  }
}
