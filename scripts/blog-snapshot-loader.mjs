// Node ESM loader hook used only by `scripts/prerender-blog.ts` when BLOG_SNAPSHOT is set.
//
// The prerender script renders `BlogPostPage` (and transitively `useBlogPosts`) via plain
// Node/tsx execution, not through Vite — so Vite's `resolve.alias` in `vite.config.ts`
// (the client-bundle half of the same fixture mechanism) doesn't apply here. This loader
// intercepts the static `../data/blog-snapshot.json` import and redirects it to
// `process.env.BLOG_SNAPSHOT` so the prerendered output uses the same fixture the client
// bundle was built against. Inactive (no-op) when BLOG_SNAPSHOT is unset.

import process from 'node:process'
import {pathToFileURL} from 'node:url'

export async function resolve(specifier, context, nextResolve) {
  if (process.env.BLOG_SNAPSHOT && specifier.endsWith('data/blog-snapshot.json')) {
    const overridden = pathToFileURL(`${process.cwd()}/${process.env.BLOG_SNAPSHOT}`).href
    return nextResolve(overridden, context)
  }
  return nextResolve(specifier, context)
}
