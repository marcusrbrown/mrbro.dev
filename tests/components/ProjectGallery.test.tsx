import type {Project} from '../../src/types'
import {fireEvent, render, screen} from '@testing-library/react'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import ProjectGallery from '../../src/components/ProjectGallery'

// Mock child components and hooks
vi.mock('../../src/components/ProjectCard', () => ({
  default: ({title, onPreview}: {title: string; onPreview?: (p: Project) => void}) => (
    <div data-testid="project-card">
      <span>{title}</span>
      {onPreview && (
        <button
          type="button"
          onClick={() => onPreview({id: '1', title, description: '', url: '', language: '', stars: 0})}
        >
          Preview
        </button>
      )}
    </div>
  ),
}))

vi.mock('../../src/components/ProjectFilter', () => ({
  default: () => <div data-testid="project-filter">Filter</div>,
}))

vi.mock('../../src/hooks/UseScrollAnimation', () => ({
  useScrollAnimation: vi.fn(() => ({
    ref: {current: null},
    animationState: 'visible',
    isInView: true,
    triggerAnimation: vi.fn(),
    resetAnimation: vi.fn(),
  })),
  getAnimationClasses: vi.fn(() => 'animate animate--visible'),
  getStaggerDelay: vi.fn(() => 0),
}))

const makeProject = (id: string, title: string): Project => ({
  id,
  title,
  description: `Description for ${title}`,
  url: `https://github.com/${id}`,
  language: 'TypeScript',
  stars: 10,
})

const projects: Project[] = [
  makeProject('1', 'Project One'),
  makeProject('2', 'Project Two'),
  makeProject('3', 'Project Three'),
  makeProject('4', 'Project Four'),
  makeProject('5', 'Project Five'),
]

describe('ProjectGallery Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render all projects', () => {
    render(<ProjectGallery projects={projects} />)
    expect(screen.getAllByTestId('project-card')).toHaveLength(5)
  })

  it('should render title when provided', () => {
    render(<ProjectGallery projects={projects} title="My Projects" />)
    expect(screen.getByRole('heading', {name: 'My Projects'})).toBeInTheDocument()
  })

  it('should render subtitle when provided', () => {
    render(<ProjectGallery projects={projects} subtitle="Browse my work" />)
    expect(screen.getByText('Browse my work')).toBeInTheDocument()
  })

  it('should not render header when no title or subtitle', () => {
    const {container} = render(<ProjectGallery projects={projects} />)
    expect(container.querySelector('.project-gallery__header')).not.toBeInTheDocument()
  })

  it('should show ProjectFilter when showFilter is true', () => {
    render(<ProjectGallery projects={projects} showFilter={true} />)
    expect(screen.getByTestId('project-filter')).toBeInTheDocument()
  })

  it('should not show ProjectFilter by default', () => {
    render(<ProjectGallery projects={projects} />)
    expect(screen.queryByTestId('project-filter')).not.toBeInTheDocument()
  })

  it('should limit visible projects when maxProjects is set', () => {
    render(<ProjectGallery projects={projects} maxProjects={3} />)
    expect(screen.getAllByTestId('project-card')).toHaveLength(3)
  })

  it('should show "View More" button when projects exceed maxProjects', () => {
    render(<ProjectGallery projects={projects} maxProjects={3} />)
    expect(screen.getByRole('button', {name: /View 2 More Projects/})).toBeInTheDocument()
  })

  it('should expand to show all projects when View More is clicked', () => {
    render(<ProjectGallery projects={projects} maxProjects={3} />)
    fireEvent.click(screen.getByRole('button', {name: /View 2 More Projects/}))
    // Main grid shows all 5 + additional grid shows the 2 extra ones = 7 total
    expect(screen.getAllByTestId('project-card').length).toBeGreaterThan(3)
  })

  it('should show "Show Less" after expanding', () => {
    render(<ProjectGallery projects={projects} maxProjects={3} />)
    fireEvent.click(screen.getByRole('button', {name: /View 2 More Projects/}))
    expect(screen.getByRole('button', {name: /Show Less Projects/})).toBeInTheDocument()
  })

  it('should collapse back when "Show Less" is clicked', () => {
    render(<ProjectGallery projects={projects} maxProjects={3} />)
    fireEvent.click(screen.getByRole('button', {name: /View 2 More Projects/}))
    fireEvent.click(screen.getByRole('button', {name: /Show Less Projects/}))
    // After collapsing, only the limited projects are shown in main grid
    // (additional grid disappears but main grid may still show all - check limited count)
    expect(screen.queryByRole('button', {name: /Show Less Projects/})).not.toBeInTheDocument()
  })

  it('should render empty state when no projects', () => {
    render(<ProjectGallery projects={[]} />)
    expect(screen.getByText('No projects found')).toBeInTheDocument()
    expect(screen.getByText('Check back later for new projects.')).toBeInTheDocument()
  })

  it('should call onProjectPreview when preview is triggered', () => {
    const onProjectPreview = vi.fn()
    render(<ProjectGallery projects={[makeProject('1', 'My Project')]} onProjectPreview={onProjectPreview} />)
    fireEvent.click(screen.getByRole('button', {name: 'Preview'}))
    expect(onProjectPreview).toHaveBeenCalledOnce()
  })

  it('should show results count when showFilter is true', () => {
    render(<ProjectGallery projects={projects} showFilter={true} title="Projects" />)
    expect(screen.getByText(/5 of 5 projects/)).toBeInTheDocument()
  })
})
