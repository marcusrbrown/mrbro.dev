#!/usr/bin/env tsx

/**
 * Post-build prerender script.
 *
 * Runs after `vite build`. For each post in the committed snapshot, renders the post
 * page tree (via a `StaticRouter` + `react-dom/server`) into the built `dist/index.html`
 * shell, substituting per-post head tags (title, description, OG tags, canonical URL),
 * and writes `dist/blog/<slug>/index.html` — a file GitHub Pages serves directly for
 * crawlers and direct loads, bypassing the SPA 404 redirect trick entirely.
 *
 * Also emits `dist/feed.xml` (RSS via the `feed` package) and `dist/sitemap.xml` from the
 * same snapshot. Dual CLI/library shape mirrors `scripts/analyze-build.ts`. Every
 * dependency here (`react-dom/server`, `react-router-dom`, `feed`) is imported only from
 * this script — none of it enters the client bundle.
 */

import type {BlogPostFull, BlogSnapshot} from '../src/types'
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs'
import {join} from 'node:path'
import process from 'node:process'
import {Feed} from 'feed'
import React from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {Route, Routes, StaticRouter} from 'react-router-dom'

import BlogPostPage from '../src/pages/BlogPostPage'

export const SITE_URL = 'https://mrbro.dev'
export const SITE_TITLE = 'Marcus R. Brown - Developer Portfolio & Blog'
export const SITE_DESCRIPTION =
  'Full-stack developer showcasing projects, blog posts, and GitHub repositories. Specializing in TypeScript, React, and modern web technologies.'

const DEFAULT_DIST_PATH = 'dist'
const DEFAULT_SNAPSHOT_PATH = 'src/data/blog-snapshot.json'
const SHELL_ROUTES: readonly string[] = ['/', '/blog', '/projects', '/about']

/** Escapes HTML-significant characters for safe interpolation into head tag attributes/text. */
export const escapeHtml = (input: string): string => {
  return input
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

/** Renders a post's page tree to static markup via `StaticRouter`, for injection into the shell. */
export const renderPostMarkup = (slug: string): string => {
  return renderToStaticMarkup(
    React.createElement(
      StaticRouter,
      {location: `/blog/${slug}`},
      React.createElement(
        Routes,
        null,
        React.createElement(Route, {path: '/blog/:slug', element: React.createElement(BlogPostPage)}),
      ),
    ),
  )
}

/**
 * Builds the per-post `<head>` tag block (title, description, OG tags, canonical URL,
 * feed autodiscovery) with all frontmatter-derived strings HTML-escaped.
 */
export const buildPostHeadTags = (post: BlogPostFull): string => {
  const title = escapeHtml(post.frontmatter.title)
  const description = escapeHtml(post.frontmatter.summary)
  const canonicalUrl = `${SITE_URL}/blog/${escapeHtml(post.slug)}`
  const fullTitle = `${title} | ${SITE_TITLE}`

  return [
    `<title>${fullTitle}</title>`,
    `<meta name="title" content="${fullTitle}">`,
    `<meta name="description" content="${description}">`,
    `<meta property="og:type" content="article">`,
    `<meta property="og:url" content="${canonicalUrl}">`,
    `<meta property="og:title" content="${title}">`,
    `<meta property="og:description" content="${description}">`,
    `<meta property="twitter:card" content="summary_large_image">`,
    `<meta property="twitter:url" content="${canonicalUrl}">`,
    `<meta property="twitter:title" content="${title}">`,
    `<meta property="twitter:description" content="${description}">`,
    `<link rel="canonical" href="${canonicalUrl}">`,
  ].join('\n    ')
}

/**
 * Substitutes the shell's `<title>`, description/OG meta tags, and canonical link with
 * post-specific values, and injects the rendered post markup into `#root`.
 */
export const buildPostHtml = (shellHtml: string, post: BlogPostFull, bodyMarkup: string): string => {
  let html = shellHtml

  // Remove the shell's own title, meta name/og/twitter/canonical tags — the
  // post-specific block (including its own <title>) is appended before </head>.
  html = html
    .replace(/<title>.*?<\/title>\n?/, '')
    .replace(/<meta name="title"[^>]*>\n?/, '')
    .replace(/<meta name="description"[^>]*>\n?/, '')
    .replace(/<meta property="og:type"[^>]*>\n?/, '')
    .replace(/<meta property="og:url"[^>]*>\n?/, '')
    .replace(/<meta property="og:title"[^>]*>\n?/, '')
    .replace(/<meta property="og:description"[^>]*>\n?/, '')
    .replace(/<meta property="og:image"[^>]*>\n?/, '')
    .replace(/<meta property="twitter:card"[^>]*>\n?/, '')
    .replace(/<meta property="twitter:url"[^>]*>\n?/, '')
    .replace(/<meta property="twitter:title"[^>]*>\n?/, '')
    .replace(/<meta property="twitter:description"[^>]*>\n?/, '')
    .replace(/<meta property="twitter:image"[^>]*>\n?/, '')
    .replace(/<link rel="canonical"[^>]*>\n?/, '')

  html = html.replace('</head>', `    ${buildPostHeadTags(post)}\n</head>`)

  html = html.replace('<div id="root"></div>', `<div id="root">${bodyMarkup}</div>`)

  return html
}

/** Builds the RSS feed XML for the given posts. Returns a valid channel-only feed when empty. */
export const buildFeedXml = (posts: readonly BlogPostFull[]): string => {
  const feed = new Feed({
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    id: `${SITE_URL}/`,
    link: `${SITE_URL}/`,
    language: 'en',
    favicon: `${SITE_URL}/favicon.ico`,
    copyright: `Copyright © ${new Date().getFullYear()} Marcus R. Brown`,
    feedLinks: {
      rss: `${SITE_URL}/feed.xml`,
    },
  })

  for (const post of posts) {
    const url = `${SITE_URL}/blog/${post.slug}`
    feed.addItem({
      title: post.frontmatter.title,
      id: url,
      link: url,
      description: post.frontmatter.summary,
      content: post.html,
      date: new Date(post.frontmatter.date),
    })
  }

  return feed.rss2()
}

/** Builds the sitemap XML covering shell routes and post URLs. */
export const buildSitemapXml = (posts: readonly BlogPostFull[]): string => {
  const urls = [
    ...SHELL_ROUTES.map(route => `${SITE_URL}${route === '/' ? '/' : route}`),
    ...posts.map(post => `${SITE_URL}/blog/${post.slug}`),
  ]

  const entries = urls.map(url => `  <url>\n    <loc>${escapeHtml(url)}</loc>\n  </url>`).join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`
}

export interface PrerenderOptions {
  distPath?: string
  snapshotPath?: string
}

const readSnapshot = (snapshotPath: string): BlogSnapshot => {
  const raw = readFileSync(snapshotPath, 'utf8')
  return JSON.parse(raw) as BlogSnapshot
}

/**
 * Runs the full prerender pipeline: reads the built shell and snapshot, writes a
 * `dist/blog/<slug>/index.html` per post, and writes `dist/feed.xml` + `dist/sitemap.xml`.
 */
export const prerenderBlog = (options: PrerenderOptions = {}): void => {
  const distPath = options.distPath ?? DEFAULT_DIST_PATH
  // E2E fixture mechanism (Unit 6 KTD): BLOG_SNAPSHOT overrides the snapshot path at
  // build time (e.g. `BLOG_SNAPSHOT=tests/fixtures/blog-snapshot.json pnpm build`),
  // mirroring the alias in `vite.config.ts` so the prerender step reads the same
  // fixture the client bundle was built against.
  const snapshotPath = options.snapshotPath ?? process.env.BLOG_SNAPSHOT ?? DEFAULT_SNAPSHOT_PATH

  const shellPath = join(distPath, 'index.html')
  const shellHtml = readFileSync(shellPath, 'utf8')
  const snapshot = readSnapshot(snapshotPath)

  for (const post of snapshot.posts) {
    const bodyMarkup = renderPostMarkup(post.slug)
    const postHtml = buildPostHtml(shellHtml, post, bodyMarkup)
    const postDir = join(distPath, 'blog', post.slug)
    mkdirSync(postDir, {recursive: true})
    writeFileSync(join(postDir, 'index.html'), postHtml)
  }

  const feedXml = buildFeedXml(snapshot.posts)
  writeFileSync(join(distPath, 'feed.xml'), feedXml)

  const sitemapXml = buildSitemapXml(snapshot.posts)
  writeFileSync(join(distPath, 'sitemap.xml'), sitemapXml)

  console.log(
    `✅ Blog prerender complete: ${snapshot.posts.length} post page(s), feed.xml, sitemap.xml written to ${distPath}`,
  )
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const distPath = DEFAULT_DIST_PATH
  if (!existsSync(join(distPath, 'index.html'))) {
    console.error(`❌ ${join(distPath, 'index.html')} not found — run \`vite build\` before prerendering.`)
    process.exit(1)
  }

  try {
    prerenderBlog()
  } catch (error) {
    console.error('❌ Blog prerender failed:', error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}
