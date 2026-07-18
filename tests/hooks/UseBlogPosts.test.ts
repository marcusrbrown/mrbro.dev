import type {BlogSnapshot} from '../../src/types'
import {renderHook} from '@testing-library/react'
import {beforeEach, describe, expect, it, vi} from 'vitest'

const buildPost = (overrides: Partial<BlogSnapshot['posts'][number]> = {}) => ({
  slug: overrides.slug ?? 'post-slug',
  frontmatter: {
    title: 'Post Title',
    date: '2024-01-01',
    summary: 'A summary',
    tags: ['tag-a'],
    ...overrides.frontmatter,
  },
  html: overrides.html ?? '<p>Body</p>',
  gistId: overrides.gistId ?? 'gist-1',
  gistUrl: overrides.gistUrl ?? 'https://gist.github.com/marcusrbrown/gist-1',
  gistUpdatedAt: overrides.gistUpdatedAt ?? '2024-01-01T00:00:00.000Z',
})

describe('useBlogPosts', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('sorts posts reverse-chronologically by frontmatter date', async () => {
    vi.doMock('../../src/data/blog-snapshot.json', () => ({
      default: {
        posts: [
          buildPost({slug: 'oldest', frontmatter: {title: 'Oldest', date: '2024-01-01', summary: 's'}}),
          buildPost({slug: 'newest', frontmatter: {title: 'Newest', date: '2024-03-01', summary: 's'}}),
          buildPost({slug: 'middle', frontmatter: {title: 'Middle', date: '2024-02-01', summary: 's'}}),
        ],
        generatedAt: '2024-04-01T00:00:00.000Z',
        generator: 'blog-refresh',
      },
    }))

    const {useBlogPosts} = await import('../../src/hooks/UseBlogPosts')
    const {result} = renderHook(() => useBlogPosts())

    expect(result.current.posts.map(post => post.slug)).toStrictEqual(['newest', 'middle', 'oldest'])
  })

  it('exposes getPostBySlug for full post lookup', async () => {
    vi.doMock('../../src/data/blog-snapshot.json', () => ({
      default: {
        posts: [buildPost({slug: 'known-slug'})],
        generatedAt: '2024-04-01T00:00:00.000Z',
        generator: 'blog-refresh',
      },
    }))

    const {useBlogPosts} = await import('../../src/hooks/UseBlogPosts')
    const {result} = renderHook(() => useBlogPosts())

    expect(result.current.getPostBySlug('known-slug')?.html).toBe('<p>Body</p>')
    expect(result.current.getPostBySlug('missing-slug')).toBeUndefined()
  })

  it('returns an empty posts list for an empty snapshot', async () => {
    vi.doMock('../../src/data/blog-snapshot.json', () => ({
      default: {posts: [], generatedAt: '2024-04-01T00:00:00.000Z', generator: 'blog-refresh'},
    }))

    const {useBlogPosts} = await import('../../src/hooks/UseBlogPosts')
    const {result} = renderHook(() => useBlogPosts())

    expect(result.current.posts).toStrictEqual([])
  })
})
