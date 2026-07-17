import type {Project} from '../../src/types'
import {fireEvent, render, screen} from '@testing-library/react'
import {MemoryRouter} from 'react-router-dom'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import {useBlogPosts} from '../../src/hooks/UseBlogPosts'
import {useGitHub} from '../../src/hooks/UseGitHub'
import Home from '../../src/pages/Home'

// Mock hooks
vi.mock('../../src/hooks/UseGitHub', () => ({
  useGitHub: vi.fn(),
}))

vi.mock('../../src/hooks/UseBlogPosts', () => ({
  useBlogPosts: vi.fn(),
}))

vi.mock('../../src/hooks/UsePageTitle', () => ({
  usePageTitle: vi.fn(),
}))

vi.mock('../../src/hooks/UseAnalytics', () => ({
  useErrorTracking: vi.fn(() => ({trackError: vi.fn(), trackApiError: vi.fn()})),
  useProjectTracking: vi.fn(() => ({
    trackProjectClick: vi.fn(),
    trackProjectModal: vi.fn(),
    trackProjectView: vi.fn(),
    trackProjectHover: vi.fn(),
  })),
  useSectionTracking: vi.fn(() => ({current: null})),
}))

// Mock all child components
vi.mock('../../src/components/HeroSection', () => ({
  default: () => <div data-testid="hero-section">Hero</div>,
}))

vi.mock('../../src/components/SkillsShowcase', () => ({
  default: () => <div data-testid="skills-showcase">Skills</div>,
}))

vi.mock('../../src/components/AboutSection', () => ({
  default: () => <div data-testid="about-section">About</div>,
}))

vi.mock('../../src/components/ContactCta', () => ({
  default: () => <div data-testid="contact-cta">Contact</div>,
}))

vi.mock('../../src/components/SmoothScrollNav', () => ({
  default: () => <div data-testid="smooth-scroll-nav">Nav</div>,
}))

vi.mock('../../src/components/ProjectGallery', () => ({
  default: ({onProjectPreview}: {onProjectPreview: (project: Project) => void}) => (
    <div data-testid="project-gallery">
      <button
        type="button"
        onClick={() =>
          onProjectPreview({
            id: 'proj1',
            title: 'Test Project',
            description: 'desc',
            url: 'https://github.com/test',
            language: 'TypeScript',
            stars: 5,
          })
        }
      >
        Preview Project
      </button>
    </div>
  ),
}))

vi.mock('../../src/components/ProjectPreviewModal', () => ({
  default: ({isOpen, onClose, onNavigate}: {isOpen: boolean; onClose: () => void; onNavigate: (p: Project) => void}) =>
    isOpen ? (
      <div data-testid="project-modal">
        <button type="button" onClick={onClose}>
          Close Modal
        </button>
        <button
          type="button"
          onClick={() =>
            onNavigate({
              id: 'proj2',
              title: 'Next Project',
              description: 'desc',
              url: 'https://github.com/next',
              language: 'JavaScript',
              stars: 3,
            })
          }
        >
          Navigate Project
        </button>
      </div>
    ) : null,
}))

vi.mock('../../src/components/BlogPost', () => ({
  default: ({title}: {title: string}) => <div data-testid="blog-post">{title}</div>,
}))

vi.mock('../../src/components/LoadingStates', () => ({
  default: ({loading, error, children}: {loading: boolean; error: string | null; children: React.ReactNode}) => {
    if (loading) return <div data-testid="loading-state">Loading...</div>
    if (error) return <div data-testid="error-state">Error: {error}</div>
    return <>{children}</>
  },
  BlogPostSkeleton: () => <div data-testid="blog-skeleton">Loading post...</div>,
  ProjectCardSkeleton: () => <div data-testid="project-skeleton">Loading project...</div>,
}))

vi.mock('../../src/styles/landing-page.css', () => ({}))
const mockUseGitHub = vi.mocked(useGitHub)
const mockUseBlogPosts = vi.mocked(useBlogPosts)

const HomeWrapper: React.FC = () => (
  <MemoryRouter>
    <Home />
  </MemoryRouter>
)

describe('Home Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseBlogPosts.mockReturnValue({posts: [], getPostBySlug: vi.fn()})
  })

  it('should render main sections', () => {
    mockUseGitHub.mockReturnValue({
      projects: [],
      repos: [],
      loading: false,
      error: null,
      projectsLoading: false,
      projectsError: null,
      rateLimitReset: null,
      retry: vi.fn(),
    })

    render(<HomeWrapper />)
    expect(screen.getByTestId('hero-section')).toBeInTheDocument()
    expect(screen.getByTestId('skills-showcase')).toBeInTheDocument()
    expect(screen.getByTestId('about-section')).toBeInTheDocument()
    expect(screen.getByTestId('contact-cta')).toBeInTheDocument()
    expect(screen.getByTestId('smooth-scroll-nav')).toBeInTheDocument()
  })

  it('should render project gallery section', () => {
    mockUseGitHub.mockReturnValue({
      projects: [],
      repos: [],
      loading: false,
      error: null,
      projectsLoading: false,
      projectsError: null,
      rateLimitReset: null,
      retry: vi.fn(),
    })

    render(<HomeWrapper />)
    expect(screen.getByTestId('project-gallery')).toBeInTheDocument()
  })

  it('should render blog posts when available', () => {
    mockUseGitHub.mockReturnValue({
      projects: [],
      repos: [],
      loading: false,
      error: null,
      projectsLoading: false,
      projectsError: null,
      rateLimitReset: null,
      retry: vi.fn(),
    })
    mockUseBlogPosts.mockReturnValue({
      posts: [{slug: 'blog-post-1', title: 'Blog Post 1', summary: 'Summary', date: '2024-01-01'}],
      getPostBySlug: vi.fn(),
    })

    render(<HomeWrapper />)
    expect(screen.getByText('Blog Post 1')).toBeInTheDocument()
  })

  it('should hide the blog preview section when there are no posts', () => {
    mockUseGitHub.mockReturnValue({
      projects: [],
      repos: [],
      loading: false,
      error: null,
      projectsLoading: false,
      projectsError: null,
      rateLimitReset: null,
      retry: vi.fn(),
    })
    mockUseBlogPosts.mockReturnValue({posts: [], getPostBySlug: vi.fn()})

    render(<HomeWrapper />)
    expect(screen.queryByText('Latest Blog Posts')).not.toBeInTheDocument()
  })

  it('should render loading state while fetching', () => {
    mockUseGitHub.mockReturnValue({
      projects: [],
      repos: [],
      loading: true,
      error: null,
      projectsLoading: true,
      projectsError: null,
      rateLimitReset: null,
      retry: vi.fn(),
    })

    render(<HomeWrapper />)
    const loadingStates = screen.getAllByTestId('loading-state')
    expect(loadingStates.length).toBeGreaterThan(0)
  })

  it('should render error state when there is an error', () => {
    mockUseGitHub.mockReturnValue({
      projects: [],
      repos: [],
      loading: false,
      error: 'API error',
      projectsLoading: false,
      projectsError: 'API error',
      rateLimitReset: null,
      retry: vi.fn(),
    })

    render(<HomeWrapper />)
    const errorStates = screen.getAllByTestId('error-state')
    expect(errorStates.length).toBeGreaterThan(0)
  })

  it('should open modal when project is previewed', () => {
    mockUseGitHub.mockReturnValue({
      projects: [],
      repos: [],
      loading: false,
      error: null,
      projectsLoading: false,
      projectsError: null,
      rateLimitReset: null,
      retry: vi.fn(),
    })

    render(<HomeWrapper />)

    expect(screen.queryByTestId('project-modal')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', {name: 'Preview Project'}))
    expect(screen.getByTestId('project-modal')).toBeInTheDocument()
  })

  it('should close modal when close is triggered', () => {
    mockUseGitHub.mockReturnValue({
      projects: [],
      repos: [],
      loading: false,
      error: null,
      projectsLoading: false,
      projectsError: null,
      rateLimitReset: null,
      retry: vi.fn(),
    })

    render(<HomeWrapper />)
    fireEvent.click(screen.getByRole('button', {name: 'Preview Project'}))
    expect(screen.getByTestId('project-modal')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', {name: 'Close Modal'}))
    expect(screen.queryByTestId('project-modal')).not.toBeInTheDocument()
  })

  it('should navigate to a new project when onNavigate is called', () => {
    mockUseGitHub.mockReturnValue({
      projects: [],
      repos: [],
      loading: false,
      error: null,
      projectsLoading: false,
      projectsError: null,
      rateLimitReset: null,
      retry: vi.fn(),
    })

    render(<HomeWrapper />)
    fireEvent.click(screen.getByRole('button', {name: 'Preview Project'}))
    expect(screen.getByTestId('project-modal')).toBeInTheDocument()

    // Navigate to another project - modal should still be open
    fireEvent.click(screen.getByRole('button', {name: 'Navigate Project'}))
    expect(screen.getByTestId('project-modal')).toBeInTheDocument()
  })
})
