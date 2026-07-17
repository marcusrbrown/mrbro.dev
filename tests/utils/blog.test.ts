import type {BlogFrontmatter, BlogPostFull} from '../../src/types'
import {describe, expect, it} from 'vitest'
import {
  detectSlugCollisions,
  isPathSafeSlug,
  isSlugResolutionError,
  isValidBlogFrontmatter,
  resolveSlug,
  slugify,
  toBlogPostMeta,
  validateBlogFrontmatter,
} from '../../src/utils/blog'

describe('blog utilities', () => {
  const validFrontmatter: BlogFrontmatter = {
    title: 'Hello World',
    date: '2026-07-17',
    summary: 'A short summary of the post.',
  }

  describe('validateBlogFrontmatter / isValidBlogFrontmatter', () => {
    it('accepts valid frontmatter', () => {
      const result = validateBlogFrontmatter(validFrontmatter)
      expect(result.ok).toBe(true)
      if (result.ok) expect(result.value).toEqual(validFrontmatter)
      expect(isValidBlogFrontmatter(validFrontmatter)).toBe(true)
    })

    it('rejects frontmatter missing title, date, and summary', () => {
      const result = validateBlogFrontmatter({})
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.errors.some(e => e.includes('title'))).toBe(true)
        expect(result.errors.some(e => e.includes('date'))).toBe(true)
        expect(result.errors.some(e => e.includes('summary'))).toBe(true)
      }
    })

    it('rejects a malformed date string without crashing', () => {
      const result = validateBlogFrontmatter({
        title: 'Post',
        date: 'not-a-date',
        summary: 'Summary',
      })
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.errors.some(e => e.toLowerCase().includes('date'))).toBe(true)
    })

    it('rejects non-object input without crashing', () => {
      expect(validateBlogFrontmatter(null).ok).toBe(false)
      expect(validateBlogFrontmatter('nope').ok).toBe(false)
      expect(validateBlogFrontmatter(42).ok).toBe(false)
    })
  })

  describe('slugify', () => {
    it('produces a URL-safe slug from unicode/punctuation titles', () => {
      expect(slugify('Café: A Résumé & Étude!')).toBe('cafe-a-resume-etude')
      expect(slugify('  Leading and trailing  ')).toBe('leading-and-trailing')
      expect(slugify('Multiple---Hyphens')).toBe('multiple-hyphens')
    })
  })

  describe('isPathSafeSlug', () => {
    it('rejects path traversal, slashes, empty strings, and reserved names', () => {
      expect(isPathSafeSlug('../escape')).toBe(false)
      expect(isPathSafeSlug('a/b')).toBe(false)
      expect(isPathSafeSlug('.')).toBe(false)
      expect(isPathSafeSlug('..')).toBe(false)
      expect(isPathSafeSlug('%2e%2e')).toBe(false)
      expect(isPathSafeSlug('a/./b')).toBe(false)
      expect(isPathSafeSlug('')).toBe(false)
      expect(isPathSafeSlug('blog')).toBe(false)
    })

    it('accepts normal slugs', () => {
      expect(isPathSafeSlug('hello-world')).toBe(true)
    })
  })

  describe('resolveSlug', () => {
    it('derives a slug from the title when no explicit slug is given', () => {
      const result = resolveSlug({title: 'Hello World'})
      expect(result).toBe('hello-world')
    })

    it('lets an explicit slug field win over the derived title slug', () => {
      const result = resolveSlug({title: 'Hello World', slug: 'custom-slug'})
      expect(result).toBe('custom-slug')
    })

    it('returns an error for a path-unsafe explicit slug', () => {
      const result = resolveSlug({title: 'Whatever', slug: '../escape'})
      expect(isSlugResolutionError(result)).toBe(true)
      if (isSlugResolutionError(result)) {
        expect(result.slug).toBe('../escape')
        expect(result.reason).toContain('../escape')
      }
    })

    it('returns an error for a reserved slug derived from the title', () => {
      const result = resolveSlug({title: 'Blog'})
      expect(isSlugResolutionError(result)).toBe(true)
    })
  })

  describe('detectSlugCollisions', () => {
    it('reports no collisions for unique slugs', () => {
      const collisions = detectSlugCollisions([
        {slug: 'post-one', identifier: 'gist-1'},
        {slug: 'post-two', identifier: 'gist-2'},
      ])
      expect(collisions).toEqual([])
    })

    it('names both posts sharing a duplicate slug', () => {
      const collisions = detectSlugCollisions([
        {slug: 'post-one', identifier: 'gist-1'},
        {slug: 'post-one', identifier: 'gist-2'},
        {slug: 'post-two', identifier: 'gist-3'},
      ])
      expect(collisions).toEqual([{slug: 'post-one', identifiers: ['gist-1', 'gist-2']}])
    })
  })

  describe('toBlogPostMeta', () => {
    it('narrows a full post down to card-facing meta', () => {
      const post: BlogPostFull = {
        slug: 'hello-world',
        frontmatter: {
          title: 'Hello World',
          date: '2026-07-17',
          summary: 'A short summary.',
          tags: ['tag-a', 'tag-b'],
        },
        html: '<p>Body</p>',
        gistId: 'gist-1',
        gistUrl: 'https://gist.github.com/marcusrbrown/gist-1',
        gistUpdatedAt: '2026-07-17T00:00:00.000Z',
      }

      expect(toBlogPostMeta(post)).toEqual({
        slug: 'hello-world',
        title: 'Hello World',
        date: '2026-07-17',
        summary: 'A short summary.',
        tags: ['tag-a', 'tag-b'],
      })
    })
  })
})
