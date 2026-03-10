import type {Project} from '../../src/types'
import {fireEvent, render, screen} from '@testing-library/react'
import {describe, expect, it, vi} from 'vitest'
import ProjectCard from '../../src/components/ProjectCard'

// Mock the progressive image hook
vi.mock('../../src/hooks/UseProgressiveImage', () => ({
  useProgressiveImage: vi.fn(() => ({
    imgRef: {current: null},
    isLoaded: false,
    isError: false,
    isInView: false,
  })),
}))

const makeProject = (overrides: Partial<Project> = {}): Project => ({
  id: '1',
  title: 'Test Project',
  description: 'A test project description',
  url: 'https://github.com/test/project',
  language: 'TypeScript',
  stars: 42,
  ...overrides,
})

describe('ProjectCard Component', () => {
  it('should render project title', () => {
    render(<ProjectCard {...makeProject()} />)
    expect(screen.getByRole('heading', {name: 'Test Project'})).toBeInTheDocument()
  })

  it('should render project description', () => {
    render(<ProjectCard {...makeProject()} />)
    expect(screen.getByText('A test project description')).toBeInTheDocument()
  })

  it('should render language badge', () => {
    render(<ProjectCard {...makeProject()} />)
    expect(screen.getByText('TypeScript')).toBeInTheDocument()
  })

  it('should render stars count', () => {
    render(<ProjectCard {...makeProject()} />)
    expect(screen.getByLabelText('42 stars')).toBeInTheDocument()
  })

  it('should render GitHub link', () => {
    render(<ProjectCard {...makeProject()} />)
    expect(screen.getByLabelText('View Test Project on GitHub')).toHaveAttribute(
      'href',
      'https://github.com/test/project',
    )
  })

  it('should not render demo link when no homepage', () => {
    render(<ProjectCard {...makeProject({homepage: null})} />)
    expect(screen.queryByLabelText(/View live demo/)).not.toBeInTheDocument()
  })

  it('should render demo link when homepage is provided', () => {
    render(<ProjectCard {...makeProject({homepage: 'https://myproject.com'})} />)
    expect(screen.getByLabelText('View live demo of Test Project')).toHaveAttribute('href', 'https://myproject.com')
  })

  it('should render preview button', () => {
    render(<ProjectCard {...makeProject()} />)
    expect(screen.getByLabelText('Preview Test Project')).toBeInTheDocument()
  })

  it('should call onPreview when preview button is clicked', () => {
    const onPreview = vi.fn()
    render(<ProjectCard {...makeProject()} onPreview={onPreview} />)

    fireEvent.click(screen.getByLabelText('Preview Test Project'))
    expect(onPreview).toHaveBeenCalledOnce()
  })

  it('should not throw when preview is clicked without onPreview handler', () => {
    render(<ProjectCard {...makeProject()} />)
    expect(() => fireEvent.click(screen.getByLabelText('Preview Test Project'))).not.toThrow()
  })

  it('should render up to 3 topics', () => {
    const project = makeProject({topics: ['react', 'typescript', 'nodejs', 'express', 'mongodb']})
    render(<ProjectCard {...project} />)
    expect(screen.getByText('react')).toBeInTheDocument()
    expect(screen.getByText('typescript')).toBeInTheDocument()
    expect(screen.getByText('nodejs')).toBeInTheDocument()
  })

  it('should show "+more" badge when topics exceed 3', () => {
    const project = makeProject({topics: ['react', 'typescript', 'nodejs', 'express', 'mongodb']})
    render(<ProjectCard {...project} />)
    expect(screen.getByText('+2')).toBeInTheDocument()
  })

  it('should not render topics section when no topics', () => {
    const project = makeProject({topics: []})
    const {container} = render(<ProjectCard {...project} />)
    expect(container.querySelector('.project-card__topics')).not.toBeInTheDocument()
  })

  it('should render updated time when lastUpdated is provided', () => {
    const project = makeProject({lastUpdated: '2024-01-15T00:00:00Z'})
    render(<ProjectCard {...project} />)
    expect(screen.getByText(/Updated/)).toBeInTheDocument()
  })

  it('should not render updated time when lastUpdated is not provided', () => {
    const project = makeProject({lastUpdated: undefined})
    render(<ProjectCard {...project} />)
    expect(screen.queryByText(/Updated/)).not.toBeInTheDocument()
  })

  it('should have article role', () => {
    render(<ProjectCard {...makeProject()} />)
    expect(screen.getByRole('article')).toBeInTheDocument()
  })

  it('should render project image when imageUrl is provided', () => {
    const project = makeProject({imageUrl: 'https://example.com/image.png'})
    render(<ProjectCard {...project} />)
    expect(screen.getByAltText('Test Project project screenshot')).toBeInTheDocument()
  })

  it('should not render image tag when no imageUrl', () => {
    render(<ProjectCard {...makeProject({imageUrl: undefined})} />)
    expect(screen.queryByAltText(/project screenshot/)).not.toBeInTheDocument()
  })
})
