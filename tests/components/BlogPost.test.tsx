import {render, screen} from '@testing-library/react'
import {describe, expect, it} from 'vitest'
import BlogPost from '../../src/components/BlogPost'

describe('BlogPost Component', () => {
  const defaultProps = {
    title: 'My Blog Post',
    date: '2024-01-15',
    summary: 'This is a summary of the blog post.',
    url: 'https://example.com/post/1',
  }

  it('should render the post title', () => {
    render(<BlogPost {...defaultProps} />)
    expect(screen.getByRole('heading', {name: 'My Blog Post'})).toBeInTheDocument()
  })

  it('should render the post date', () => {
    render(<BlogPost {...defaultProps} />)
    expect(screen.getByText('2024-01-15')).toBeInTheDocument()
  })

  it('should render the post summary', () => {
    render(<BlogPost {...defaultProps} />)
    expect(screen.getByText('This is a summary of the blog post.')).toBeInTheDocument()
  })

  it('should render the read more link', () => {
    render(<BlogPost {...defaultProps} />)
    const link = screen.getByRole('link', {name: 'Read more'})
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', 'https://example.com/post/1')
  })

  it('should open link in new tab', () => {
    render(<BlogPost {...defaultProps} />)
    const link = screen.getByRole('link', {name: 'Read more'})
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('should render as an article element', () => {
    render(<BlogPost {...defaultProps} />)
    expect(screen.getByRole('article')).toBeInTheDocument()
  })

  it('should set dateTime attribute on time element', () => {
    render(<BlogPost {...defaultProps} />)
    const timeEl = screen.getByText('2024-01-15')
    expect(timeEl.tagName.toLowerCase()).toBe('time')
    expect(timeEl).toHaveAttribute('dateTime', '2024-01-15')
  })
})
