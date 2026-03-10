import {render, screen} from '@testing-library/react'
import {MemoryRouter} from 'react-router-dom'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import {useGitHub} from '../../src/hooks/UseGitHub'
import Blog from '../../src/pages/Blog'

// Mock dependencies
vi.mock('../../src/hooks/UseGitHub', () => ({
  useGitHub: vi.fn(),
}))

vi.mock('../../src/hooks/UsePageTitle', () => ({
  usePageTitle: vi.fn(),
}))

vi.mock('../../src/components/BlogPost', () => ({
  default: ({title}: {title: string}) => <div data-testid="blog-post">{title}</div>,
}))
const mockUseGitHub = vi.mocked(useGitHub)

const BlogWrapper: React.FC = () => (
  <MemoryRouter>
    <Blog />
  </MemoryRouter>
)

describe('Blog Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render loading state', () => {
    mockUseGitHub.mockReturnValue({
      projects: [],
      blogPosts: [],
      repos: [],
      loading: true,
      error: null,
    })

    render(<BlogWrapper />)
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('should render error state', () => {
    mockUseGitHub.mockReturnValue({
      projects: [],
      blogPosts: [],
      repos: [],
      loading: false,
      error: 'Network error',
    })

    render(<BlogWrapper />)
    expect(screen.getByText('Error loading blog posts.')).toBeInTheDocument()
  })

  it('should render blog title when loaded', () => {
    mockUseGitHub.mockReturnValue({
      projects: [],
      blogPosts: [
        {id: '1', title: 'First Post', summary: 'A summary', date: '2024-01-01', url: 'https://example.com/1'},
        {id: '2', title: 'Second Post', summary: 'Another summary', date: '2024-01-02', url: 'https://example.com/2'},
      ],
      repos: [],
      loading: false,
      error: null,
    })

    render(<BlogWrapper />)
    expect(screen.getByRole('heading', {name: 'Blog'})).toBeInTheDocument()
  })

  it('should render blog posts when loaded', () => {
    mockUseGitHub.mockReturnValue({
      projects: [],
      blogPosts: [
        {id: '1', title: 'First Post', summary: 'A summary', date: '2024-01-01', url: 'https://example.com/1'},
        {id: '2', title: 'Second Post', summary: 'Another summary', date: '2024-01-02', url: 'https://example.com/2'},
      ],
      repos: [],
      loading: false,
      error: null,
    })

    render(<BlogWrapper />)
    const posts = screen.getAllByTestId('blog-post')
    expect(posts).toHaveLength(2)
    expect(screen.getByText('First Post')).toBeInTheDocument()
    expect(screen.getByText('Second Post')).toBeInTheDocument()
  })

  it('should render empty state when no blog posts', () => {
    mockUseGitHub.mockReturnValue({
      projects: [],
      blogPosts: [],
      repos: [],
      loading: false,
      error: null,
    })

    render(<BlogWrapper />)
    expect(screen.getByText('No blog posts available.')).toBeInTheDocument()
  })
})
