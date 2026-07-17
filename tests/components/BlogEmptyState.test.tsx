import {render, screen} from '@testing-library/react'
import {describe, expect, it} from 'vitest'
import BlogEmptyState from '../../src/components/BlogEmptyState'

describe('BlogEmptyState Component', () => {
  it('renders friendly copy and a link out, with no bare paragraph as the only content', () => {
    render(<BlogEmptyState />)

    expect(screen.getByRole('heading', {name: 'No posts yet'})).toBeInTheDocument()
    expect(screen.getByRole('status')).toBeInTheDocument()
    const link = screen.getByRole('link', {name: 'View gists on GitHub'})
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', 'https://gist.github.com/marcusrbrown')
  })

  it('respects a custom gists URL', () => {
    render(<BlogEmptyState gistsUrl="https://gist.github.com/someone-else" />)
    expect(screen.getByRole('link', {name: 'View gists on GitHub'})).toHaveAttribute(
      'href',
      'https://gist.github.com/someone-else',
    )
  })

  it('renders an icon marked decorative', () => {
    const {container} = render(<BlogEmptyState />)
    const icon = container.querySelector('svg')
    expect(icon).toHaveAttribute('aria-hidden', 'true')
  })
})
