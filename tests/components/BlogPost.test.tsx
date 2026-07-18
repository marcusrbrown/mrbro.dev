import {render, screen} from '@testing-library/react'
import {MemoryRouter} from 'react-router-dom'
import {describe, expect, it} from 'vitest'
import BlogPost from '../../src/components/BlogPost'

describe('BlogPost Component', () => {
  const defaultProps = {
    slug: 'my-blog-post',
    title: 'My Blog Post',
    date: '2024-01-15',
    summary: 'This is a summary of the blog post.',
    tags: ['react', 'typescript'],
  }

  const renderWithRouter = (props: typeof defaultProps) =>
    render(
      <MemoryRouter>
        <BlogPost {...props} />
      </MemoryRouter>,
    )

  it('should render the post title', () => {
    renderWithRouter(defaultProps)
    expect(screen.getByRole('heading', {name: 'My Blog Post'})).toBeInTheDocument()
  })

  it('should render the post date', () => {
    renderWithRouter(defaultProps)
    expect(screen.getByText('2024-01-15')).toBeInTheDocument()
  })

  it('should render the post summary', () => {
    renderWithRouter(defaultProps)
    expect(screen.getByText('This is a summary of the blog post.')).toBeInTheDocument()
  })

  it('should link internally to the post slug', () => {
    renderWithRouter(defaultProps)
    const links = screen.getAllByRole('link', {name: /My Blog Post|Read more/})
    for (const link of links) {
      expect(link).toHaveAttribute('href', '/blog/my-blog-post')
    }
  })

  it('should render as an article element', () => {
    renderWithRouter(defaultProps)
    expect(screen.getByRole('article')).toBeInTheDocument()
  })

  it('should set dateTime attribute on time element', () => {
    renderWithRouter(defaultProps)
    const timeEl = screen.getByText('2024-01-15')
    expect(timeEl.tagName.toLowerCase()).toBe('time')
    expect(timeEl).toHaveAttribute('dateTime', '2024-01-15')
  })

  it('should render tags as non-interactive labels', () => {
    renderWithRouter(defaultProps)
    const tagsList = screen.getByLabelText('Tags')
    expect(tagsList).toBeInTheDocument()
    expect(screen.getByText('react')).toBeInTheDocument()
    expect(screen.getByText('typescript')).toBeInTheDocument()
    expect(screen.queryByRole('link', {name: 'react'})).not.toBeInTheDocument()
  })

  it('should render without tags when none are provided', () => {
    const propsWithoutTags: typeof defaultProps = {...defaultProps, tags: []}
    renderWithRouter(propsWithoutTags)
    expect(screen.queryByLabelText('Tags')).not.toBeInTheDocument()
  })

  it('should render markup in title/summary/tags inert (no injected elements)', () => {
    renderWithRouter({
      ...defaultProps,
      title: '<img src=x onerror=alert(1)>Hostile Title',
      summary: '<script>alert(1)</script>Hostile summary',
      tags: ['<b>bold-tag</b>'],
    })

    expect(screen.getByRole('heading')).toHaveTextContent('<img src=x onerror=alert(1)>Hostile Title')
    expect(document.querySelector('script')).not.toBeInTheDocument()
    expect(document.querySelector('.blog-post__tag img')).not.toBeInTheDocument()
  })
})
