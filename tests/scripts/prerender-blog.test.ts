import type {BlogPostFull, BlogSnapshot} from '../../src/types'
import {existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

const buildPost = (overrides: Partial<BlogPostFull> = {}): BlogPostFull => ({
  slug: overrides.slug ?? 'post-slug',
  frontmatter: {
    title: 'Post Title',
    date: '2024-01-01',
    summary: 'A summary',
    ...overrides.frontmatter,
  },
  html: overrides.html ?? '<p>Rendered body content.</p>',
  gistId: overrides.gistId ?? 'gist-1',
  gistUrl: overrides.gistUrl ?? 'https://gist.github.com/marcusrbrown/gist-1',
  gistUpdatedAt: overrides.gistUpdatedAt ?? '2024-01-01T00:00:00.000Z',
})

// `BlogPostPage` (rendered by the prerender script via `StaticRouter`) reads posts from the
// `useBlogPosts` hook, which is backed by a *static* import of `src/data/blog-snapshot.json`.
// The prerender integration tests below exercise arbitrary fixture posts, so the hook is
// mocked here to serve those same posts by slug — independent of the real committed snapshot.
let mockPostsBySlug = new Map<string, BlogPostFull>()

vi.mock('../../src/hooks/UseBlogPosts', () => ({
  useBlogPosts: () => ({
    posts: [],
    getPostBySlug: (slug: string) => mockPostsBySlug.get(slug),
  }),
}))

vi.mock('../../src/hooks/UsePageTitle', () => ({
  usePageTitle: () => undefined,
}))

const {
  buildFeedXml,
  buildPostHeadTags,
  buildPostHtml,
  buildSitemapXml,
  escapeHtml,
  prerenderBlog,
  SITE_TITLE,
  SITE_URL,
} = await import('../../scripts/prerender-blog')

const SHELL_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Marcus R. Brown - Developer Portfolio & Blog</title>
    <meta name="title" content="Marcus R. Brown - Developer Portfolio & Blog">
    <meta name="description" content="Full-stack developer showcasing projects.">
    <meta property="og:type" content="website">
    <meta property="og:url" content="https://mrbro.dev/">
    <meta property="og:title" content="Marcus R. Brown - Developer Portfolio & Blog">
    <meta property="og:description" content="Full-stack developer showcasing projects.">
    <meta property="og:image" content="https://mrbro.dev/og-image.png">
    <meta property="twitter:card" content="summary_large_image">
    <meta property="twitter:url" content="https://mrbro.dev/">
    <meta property="twitter:title" content="Marcus R. Brown - Developer Portfolio & Blog">
    <meta property="twitter:description" content="Full-stack developer showcasing projects.">
    <meta property="twitter:image" content="https://mrbro.dev/og-image.png">
    <link rel="canonical" href="https://mrbro.dev/">
    <link rel="alternate" type="application/rss+xml" title="Marcus R. Brown - Blog" href="/feed.xml">
</head>
<body>
    <div id="root"></div>
    <script type="module" src="/assets/main.js"></script>
</body>
</html>
`

describe('prerender-blog script', () => {
  describe('escapeHtml', () => {
    it('escapes HTML-significant characters', () => {
      expect(escapeHtml(`"/><script>`)).toBe('&quot;/&gt;&lt;script&gt;')
    })
  })

  describe('buildPostHeadTags', () => {
    it('escapes hostile frontmatter title in head tags', () => {
      const post = buildPost({frontmatter: {title: '"/><script>', date: '2024-01-01', summary: 'Sum'}})
      const headTags = buildPostHeadTags(post)

      expect(headTags).not.toContain('"/><script>')
      expect(headTags).toContain('&quot;/&gt;&lt;script&gt;')
      expect(headTags).toContain('<meta property="og:type" content="article">')
      expect(headTags).toContain(`<link rel="canonical" href="${SITE_URL}/blog/post-slug">`)
    })

    it('includes title, description, OG tags, and canonical URL for a normal post', () => {
      const post = buildPost({
        slug: 'my-post',
        frontmatter: {title: 'My Post', date: '2024-01-01', summary: 'A great post'},
      })
      const headTags = buildPostHeadTags(post)

      expect(headTags).toContain(`<title>My Post | ${SITE_TITLE}</title>`)
      expect(headTags).toContain('<meta name="description" content="A great post">')
      expect(headTags).toContain('<meta property="og:title" content="My Post">')
      expect(headTags).toContain(`<link rel="canonical" href="${SITE_URL}/blog/my-post">`)
    })
  })

  describe('buildPostHtml', () => {
    it('substitutes shell head tags and injects rendered body content', () => {
      const post = buildPost({
        slug: 'my-post',
        frontmatter: {title: 'My Post', date: '2024-01-01', summary: 'A great post'},
      })
      const bodyMarkup = '<div class="blog-post-page"><h1>My Post</h1><p>Body content here</p></div>'

      const html = buildPostHtml(SHELL_HTML, post, bodyMarkup)

      expect(html).toContain(`<title>My Post | ${SITE_TITLE}</title>`)
      expect(html).toContain('<meta property="og:type" content="article">')
      expect(html).toContain(`<link rel="canonical" href="${SITE_URL}/blog/my-post">`)
      expect(html).toContain(bodyMarkup)
      expect(html).not.toContain('<div id="root"></div>')
      // Shell's original website-level og:type should not remain duplicated.
      expect((html.match(/og:type/g) ?? []).length).toBe(1)
    })

    it('escapes a hostile frontmatter title in the emitted head HTML', () => {
      const post = buildPost({frontmatter: {title: '"/><script>alert(1)</script>', date: '2024-01-01', summary: 'Sum'}})
      const html = buildPostHtml(SHELL_HTML, post, '<div>body</div>')

      expect(html).not.toContain('<script>alert(1)</script>')
      expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
    })
  })

  describe('buildFeedXml', () => {
    it('produces a valid RSS feed with post entries', () => {
      const posts = [
        buildPost({slug: 'post-a', frontmatter: {title: 'Post A', date: '2024-01-01', summary: 'Summary A'}}),
        buildPost({slug: 'post-b', frontmatter: {title: 'Post B', date: '2024-02-01', summary: 'Summary B'}}),
      ]

      const xml = buildFeedXml(posts)

      expect(xml).toContain('<?xml version="1.0"')
      expect(xml).toContain('<rss')
      expect(xml).toContain('Post A')
      expect(xml).toContain('Post B')
      expect(xml).toContain(`${SITE_URL}/blog/post-a`)
      expect(xml).toContain(`${SITE_URL}/blog/post-b`)
    })

    it('neutralizes a hostile frontmatter title in feed XML via CDATA wrapping', () => {
      const post = buildPost({frontmatter: {title: '"/><script>alert(1)</script>', date: '2024-01-01', summary: 'Sum'}})
      const xml = buildFeedXml([post])

      // The `feed` library wraps text nodes in CDATA, neutralizing the hostile title as an
      // XML-injection vector: it appears verbatim only inside a CDATA section, never as a
      // bare unescaped tag in the surrounding XML structure.
      expect(xml).toContain('<title><![CDATA["/><script>alert(1)</script>]]></title>')
      expect(xml).not.toMatch(/<title>"\/><script>/)
    })

    it('produces a valid channel-only feed for zero posts', () => {
      const xml = buildFeedXml([])

      expect(xml).toContain('<?xml version="1.0"')
      expect(xml).toContain('<rss')
      expect(xml).toContain('<channel>')
      expect(xml).not.toContain('<item>')
    })
  })

  describe('buildSitemapXml', () => {
    it('includes shell routes and post URLs', () => {
      const posts = [buildPost({slug: 'my-post'})]
      const xml = buildSitemapXml(posts)

      expect(xml).toContain('<?xml version="1.0"')
      expect(xml).toContain('<urlset')
      expect(xml).toContain(`<loc>${SITE_URL}/</loc>`)
      expect(xml).toContain(`<loc>${SITE_URL}/blog</loc>`)
      expect(xml).toContain(`<loc>${SITE_URL}/projects</loc>`)
      expect(xml).toContain(`<loc>${SITE_URL}/about</loc>`)
      expect(xml).toContain(`<loc>${SITE_URL}/blog/my-post</loc>`)
    })

    it('produces a valid sitemap with only shell routes for zero posts', () => {
      const xml = buildSitemapXml([])

      expect(xml).toContain('<urlset')
      expect(xml).toContain(`<loc>${SITE_URL}/</loc>`)
      expect(xml).not.toContain('/blog/')
    })
  })

  describe('prerenderBlog (integration)', () => {
    let tmpDir: string
    let distPath: string
    let snapshotPath: string

    beforeEach(() => {
      tmpDir = mkdtempSync(join(tmpdir(), 'prerender-blog-test-'))
      distPath = join(tmpDir, 'dist')
      snapshotPath = join(tmpDir, 'blog-snapshot.json')
    })

    afterEach(() => {
      rmSync(tmpDir, {recursive: true, force: true})
    })

    const writeShell = () => {
      mkdirSync(distPath, {recursive: true})
      writeFileSync(join(distPath, 'index.html'), SHELL_HTML)
    }

    const writeSnapshot = (snapshot: BlogSnapshot) => {
      writeFileSync(snapshotPath, JSON.stringify(snapshot))
      mockPostsBySlug = new Map(snapshot.posts.map(post => [post.slug, post]))
    }

    it('emits a slug directory per post with escaped head tags, canonical URL, and rendered body content', () => {
      writeShell()
      writeSnapshot({
        posts: [
          buildPost({
            slug: 'first-post',
            frontmatter: {title: 'First Post', date: '2024-01-01', summary: 'Summary one'},
          }),
          buildPost({
            slug: 'second-post',
            frontmatter: {title: 'Second "/><script> Post', date: '2024-02-01', summary: 'Summary two'},
            html: '<p>Second post body.</p>',
          }),
        ],
        generatedAt: '2024-04-01T00:00:00.000Z',
        generator: 'blog-refresh',
      })

      prerenderBlog({distPath, snapshotPath})

      const firstHtml = readFileSync(join(distPath, 'blog', 'first-post', 'index.html'), 'utf8')
      expect(firstHtml).toContain(`<title>First Post | ${SITE_TITLE}</title>`)
      expect(firstHtml).toContain(`<link rel="canonical" href="${SITE_URL}/blog/first-post">`)
      expect(firstHtml).toContain('<meta property="og:type" content="article">')
      // Prerendered body content present, not the empty shell.
      expect(firstHtml).not.toContain('<div id="root"></div>')
      expect(firstHtml).toContain('blog-post-page')

      const secondHtml = readFileSync(join(distPath, 'blog', 'second-post', 'index.html'), 'utf8')
      expect(secondHtml).not.toContain('<script>')
      expect(secondHtml).toContain('&quot;/&gt;&lt;script&gt;')
      expect(secondHtml).toContain('Second post body.')

      const feedXml = readFileSync(join(distPath, 'feed.xml'), 'utf8')
      expect(feedXml).toContain('First Post')
      // Hostile title is CDATA-wrapped by the `feed` library, not injected as a bare tag.
      expect(feedXml).toContain('<title><![CDATA[Second "/><script> Post]]></title>')
      expect(feedXml).not.toMatch(/<title>Second "\/><script>/)

      const sitemapXml = readFileSync(join(distPath, 'sitemap.xml'), 'utf8')
      expect(sitemapXml).toContain(`${SITE_URL}/blog/first-post`)
      expect(sitemapXml).toContain(`${SITE_URL}/blog/second-post`)
    })

    it('creates no blog directories and still writes valid feed/sitemap XML for zero posts', () => {
      writeShell()
      writeSnapshot({posts: [], generatedAt: '2024-04-01T00:00:00.000Z', generator: 'blog-refresh'})

      prerenderBlog({distPath, snapshotPath})

      expect(existsSync(join(distPath, 'blog'))).toBe(false)

      const feedXml = readFileSync(join(distPath, 'feed.xml'), 'utf8')
      expect(feedXml).toContain('<?xml version="1.0"')
      expect(feedXml).toContain('<channel>')

      const sitemapXml = readFileSync(join(distPath, 'sitemap.xml'), 'utf8')
      expect(sitemapXml).toContain('<urlset')
      expect(sitemapXml).toContain(`${SITE_URL}/`)
    })
  })

  describe('feed autodiscovery', () => {
    it('is present in the built shell HTML', () => {
      expect(SHELL_HTML).toContain('<link rel="alternate" type="application/rss+xml"')
      expect(SHELL_HTML).toContain('href="/feed.xml"')
    })
  })
})
