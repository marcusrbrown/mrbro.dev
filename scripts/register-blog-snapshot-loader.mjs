// Registers `scripts/blog-snapshot-loader.mjs` as a Node ESM loader hook. Loaded via
// `tsx --import ./scripts/register-blog-snapshot-loader.mjs scripts/prerender-blog.ts`
// (see `pnpm build`), so the hook is active whenever the prerender script runs. No-op
// when BLOG_SNAPSHOT is unset (see `blog-snapshot-loader.mjs`).

import {register} from 'node:module'

register('./blog-snapshot-loader.mjs', import.meta.url)
