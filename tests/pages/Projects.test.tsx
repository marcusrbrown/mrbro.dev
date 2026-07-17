import type {Project} from '../../src/types'
import {fireEvent, render, screen} from '@testing-library/react'
import {MemoryRouter} from 'react-router-dom'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import {useGitHub} from '../../src/hooks/UseGitHub'
import Projects from '../../src/pages/Projects'

// Mock dependencies
vi.mock('../../src/hooks/UseGitHub', () => ({
  useGitHub: vi.fn(),
}))

vi.mock('../../src/hooks/UsePageTitle', () => ({
  usePageTitle: vi.fn(),
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
            description: 'A test project',
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
  default: ({isOpen, onClose}: {isOpen: boolean; onClose: () => void}) =>
    isOpen ? (
      <div data-testid="project-modal">
        <button type="button" onClick={onClose}>
          Close Modal
        </button>
      </div>
    ) : null,
}))
const mockUseGitHub = vi.mocked(useGitHub)

const ProjectsWrapper: React.FC = () => (
  <MemoryRouter>
    <Projects />
  </MemoryRouter>
)

describe('Projects Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render loading state', () => {
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

    render(<ProjectsWrapper />)
    expect(screen.getByText('Loading Projects...')).toBeInTheDocument()
  })

  it('should render loading message text', () => {
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

    render(<ProjectsWrapper />)
    expect(screen.getByText('Fetching the latest projects from GitHub...')).toBeInTheDocument()
  })

  it('should render error state', () => {
    mockUseGitHub.mockReturnValue({
      projects: [],
      repos: [],
      loading: false,
      error: 'Connection failed',
      projectsLoading: false,
      projectsError: 'Connection failed',
      rateLimitReset: null,
      retry: vi.fn(),
    })

    render(<ProjectsWrapper />)
    expect(screen.getByText('Error Loading Projects')).toBeInTheDocument()
    expect(screen.getByText(/Unable to load projects: Connection failed/)).toBeInTheDocument()
  })

  it('should render try again button in error state', () => {
    mockUseGitHub.mockReturnValue({
      projects: [],
      repos: [],
      loading: false,
      error: 'Connection failed',
      projectsLoading: false,
      projectsError: 'Connection failed',
      rateLimitReset: null,
      retry: vi.fn(),
    })

    render(<ProjectsWrapper />)
    expect(screen.getByRole('button', {name: 'Try Again'})).toBeInTheDocument()
  })

  it('should call retry instead of reloading the page when Try Again is clicked', () => {
    const retry = vi.fn()
    mockUseGitHub.mockReturnValue({
      projects: [],
      repos: [],
      loading: false,
      error: 'Connection failed',
      projectsLoading: false,
      projectsError: 'Connection failed',
      rateLimitReset: null,
      retry,
    })

    render(<ProjectsWrapper />)
    fireEvent.click(screen.getByRole('button', {name: 'Try Again'}))
    expect(retry).toHaveBeenCalledOnce()
  })

  it('should render project gallery when loaded', () => {
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

    render(<ProjectsWrapper />)
    expect(screen.getByTestId('project-gallery')).toBeInTheDocument()
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

    render(<ProjectsWrapper />)

    // Initially no modal
    expect(screen.queryByTestId('project-modal')).not.toBeInTheDocument()

    // Click preview button
    fireEvent.click(screen.getByRole('button', {name: 'Preview Project'}))

    // Modal should be open
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

    render(<ProjectsWrapper />)

    // Open the modal
    fireEvent.click(screen.getByRole('button', {name: 'Preview Project'}))
    expect(screen.getByTestId('project-modal')).toBeInTheDocument()

    // Close the modal
    fireEvent.click(screen.getByRole('button', {name: 'Close Modal'}))
    expect(screen.queryByTestId('project-modal')).not.toBeInTheDocument()
  })
})
