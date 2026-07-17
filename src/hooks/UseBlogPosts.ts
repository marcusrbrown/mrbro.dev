// mrbro.dev/src/hooks/UseBlogPosts.ts

import type {BlogPostFull, BlogPostMeta, BlogSnapshot} from '../types'
import blogSnapshot from '../data/blog-snapshot.json'
import {toBlogPostMeta} from '../utils/blog'

const snapshot = blogSnapshot as BlogSnapshot

/**
 * Sorts posts by frontmatter date, most recent first. Ties are broken by slug for
 * a stable, deterministic order.
 */
const sortPostsReverseChronological = (posts: readonly BlogPostFull[]): BlogPostFull[] => {
  return [...posts].sort((a, b) => {
    const dateDiff = new Date(b.frontmatter.date).getTime() - new Date(a.frontmatter.date).getTime()
    if (dateDiff !== 0) {
      return dateDiff
    }
    return a.slug.localeCompare(b.slug)
  })
}

const sortedPosts = sortPostsReverseChronological(snapshot.posts)
const postsMeta: BlogPostMeta[] = sortedPosts.map(post => toBlogPostMeta(post))
const postsBySlug = new Map<string, BlogPostFull>(sortedPosts.map(post => [post.slug, post]))

export interface UseBlogPostsReturn {
  /** Card-facing metadata for all posts, sorted reverse-chronologically. */
  posts: BlogPostMeta[]
  /** Looks up a full post (including rendered HTML body) by slug. */
  getPostBySlug: (slug: string) => BlogPostFull | undefined
}

/**
 * Snapshot-backed blog posts hook. Reads statically from the committed
 * `src/data/blog-snapshot.json` — synchronous, no loading/error states.
 */
export const useBlogPosts = (): UseBlogPostsReturn => {
  return {
    posts: postsMeta,
    getPostBySlug: (slug: string) => postsBySlug.get(slug),
  }
}
