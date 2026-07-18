import {render, screen} from '@testing-library/react'
import {Route, MemoryRouter as Router, Routes} from 'react-router-dom'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import {useBlogPosts} from '../../src/hooks/UseBlogPosts'
import BlogPostPage from '../../src/pages/BlogPostPage'

vi.mock('../../src/hooks/UseBlogPosts', () => ({
  useBlogPosts: vi.fn(),
}))

vi.mock('../../src/hooks/UsePageTitle', () => ({
  usePageTitle: vi.fn(),
}))

const mockUseBlogPosts = vi.mocked(useBlogPosts)

const renderAtSlug = (slug: string) =>
  render(
    <Router initialEntries={[`/blog/${slug}`]}>
      <Routes>
        <Route path="/blog/:slug" element={<BlogPostPage />} />
      </Routes>
    </Router>,
  )

const fullPost = {
  slug: 'known-post',
  frontmatter: {
    title: 'Known Post',
    date: '2024-01-01',
    summary: 'A summary',
    tags: ['react', 'typescript'],
  },
  html: '<p>Rendered <strong>body</strong> content.</p>',
  gistId: 'gist-1',
  gistUrl: 'https://gist.github.com/marcusrbrown/gist-1',
  gistUpdatedAt: '2024-01-01T00:00:00.000Z',
}

describe('BlogPostPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders header, body, back link, and gist link for a known slug', () => {
    mockUseBlogPosts.mockReturnValue({
      posts: [],
      getPostBySlug: vi.fn((slug: string) => (slug === 'known-post' ? fullPost : undefined)),
    })

    renderAtSlug('known-post')

    expect(screen.getByRole('heading', {level: 1, name: 'Known Post'})).toBeInTheDocument()
    expect(screen.getByText('2024-01-01')).toBeInTheDocument()
    expect(screen.getByLabelText('Tags')).toBeInTheDocument()
    expect(screen.getByText(/Rendered/)).toBeInTheDocument()
    expect(screen.getByRole('link', {name: '← Back to Blog'})).toHaveAttribute('href', '/blog')
    expect(screen.getByRole('link', {name: 'View on GitHub'})).toHaveAttribute(
      'href',
      'https://gist.github.com/marcusrbrown/gist-1',
    )
  })

  it.each(['http://gist.github.com/marcusrbrown/gist-1', 'https://example.com/gist-1', 'not a url'])(
    'does not render an unsafe gist URL as a live link: %s',
    gistUrl => {
      mockUseBlogPosts.mockReturnValue({
        posts: [],
        getPostBySlug: vi.fn(() => ({...fullPost, gistUrl})),
      })

      renderAtSlug('known-post')

      expect(screen.queryByRole('link', {name: 'View on GitHub'})).not.toBeInTheDocument()
      expect(screen.getByText('View on GitHub')).toBeInTheDocument()
    },
  )

  it('renders a designed not-found state for an unknown slug, with a path back to /blog', () => {
    mockUseBlogPosts.mockReturnValue({
      posts: [],
      getPostBySlug: vi.fn(() => undefined),
    })

    renderAtSlug('unknown-slug')

    expect(screen.getByRole('heading', {level: 1, name: 'Post not found'})).toBeInTheDocument()
    expect(screen.getByRole('link', {name: '← Back to Blog'})).toHaveAttribute('href', '/blog')
  })

  it('renders pre-highlighted code block markup with .code-block structure', () => {
    mockUseBlogPosts.mockReturnValue({
      posts: [],
      getPostBySlug: vi.fn(() => ({
        ...fullPost,
        html: '<div class="code-block"><pre><code>const x = 1;</code></pre></div>',
      })),
    })

    renderAtSlug('known-post')

    expect(document.querySelector('.code-block')).toBeInTheDocument()
    expect(document.querySelector('.code-block pre code')).toHaveTextContent('const x = 1;')
  })

  it('maintains heading order: site h1 is the only h1, post title is h1 within page', () => {
    mockUseBlogPosts.mockReturnValue({
      posts: [],
      getPostBySlug: vi.fn(() => fullPost),
    })

    renderAtSlug('known-post')
    expect(screen.getAllByRole('heading', {level: 1})).toHaveLength(1)
  })

  it('renders markup in title/tags inert in the post header (no injected elements)', () => {
    mockUseBlogPosts.mockReturnValue({
      posts: [],
      getPostBySlug: vi.fn(() => ({
        ...fullPost,
        frontmatter: {
          ...fullPost.frontmatter,
          title: '<img src=x onerror=alert(1)>Hostile Title',
          tags: ['<b>bold-tag</b>'],
        },
      })),
    })

    renderAtSlug('known-post')
    expect(screen.getByRole('heading', {level: 1})).toHaveTextContent('<img src=x onerror=alert(1)>Hostile Title')
    expect(document.querySelector('script')).not.toBeInTheDocument()
  })

  it('maintains a sensible tab order through header links (back link before gist link)', () => {
    mockUseBlogPosts.mockReturnValue({
      posts: [],
      getPostBySlug: vi.fn(() => fullPost),
    })

    renderAtSlug('known-post')
    const links = screen.getAllByRole('link')
    const backIndex = links.findIndex(link => link.textContent?.includes('Back to Blog'))
    const gistIndex = links.findIndex(link => link.textContent?.includes('View on GitHub'))
    expect(backIndex).toBeGreaterThanOrEqual(0)
    expect(gistIndex).toBeGreaterThan(backIndex)
  })
})
