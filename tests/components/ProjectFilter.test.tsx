import type {ProjectFilters} from '../../src/hooks/UseProjectFilter'
import {fireEvent, render, screen} from '@testing-library/react'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import ProjectFilter from '../../src/components/ProjectFilter'

const defaultAvailableFilters = {
  technologies: ['TypeScript', 'React', 'Node.js'],
  types: ['Open Source', 'Personal'],
  status: ['Active', 'Recent', 'Archived'],
}

const emptyActiveFilters: ProjectFilters = {
  technologies: [],
  types: [],
  status: [],
}

describe('ProjectFilter Component', () => {
  const defaultProps = {
    availableFilters: defaultAvailableFilters,
    activeFilters: emptyActiveFilters,
    onTechnologyFilter: vi.fn(),
    onTypeFilter: vi.fn(),
    onStatusFilter: vi.fn(),
    onClearAll: vi.fn(),
    onClearCategory: vi.fn(),
    hasActiveFilters: false,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render Filter Projects heading', () => {
    render(<ProjectFilter {...defaultProps} />)
    expect(screen.getByRole('heading', {name: 'Filter Projects'})).toBeInTheDocument()
  })

  it('should render technology filter chips', () => {
    render(<ProjectFilter {...defaultProps} />)
    expect(screen.getByRole('button', {name: 'TypeScript'})).toBeInTheDocument()
    expect(screen.getByRole('button', {name: 'React'})).toBeInTheDocument()
    expect(screen.getByRole('button', {name: 'Node.js'})).toBeInTheDocument()
  })

  it('should render type filter chips', () => {
    render(<ProjectFilter {...defaultProps} />)
    expect(screen.getByRole('button', {name: 'Open Source'})).toBeInTheDocument()
    expect(screen.getByRole('button', {name: 'Personal'})).toBeInTheDocument()
  })

  it('should render status filter chips', () => {
    render(<ProjectFilter {...defaultProps} />)
    expect(screen.getByRole('button', {name: 'Active'})).toBeInTheDocument()
    expect(screen.getByRole('button', {name: 'Recent'})).toBeInTheDocument()
    expect(screen.getByRole('button', {name: 'Archived'})).toBeInTheDocument()
  })

  it('should not show "Clear All" button when no active filters', () => {
    render(<ProjectFilter {...defaultProps} hasActiveFilters={false} />)
    expect(screen.queryByLabelText('Clear all filters')).not.toBeInTheDocument()
  })

  it('should show "Clear All" button when there are active filters', () => {
    render(<ProjectFilter {...defaultProps} hasActiveFilters={true} />)
    expect(screen.getByLabelText('Clear all filters')).toBeInTheDocument()
  })

  it('should call onClearAll when Clear All button is clicked', () => {
    const onClearAll = vi.fn()
    render(<ProjectFilter {...defaultProps} hasActiveFilters={true} onClearAll={onClearAll} />)
    fireEvent.click(screen.getByLabelText('Clear all filters'))
    expect(onClearAll).toHaveBeenCalledOnce()
  })

  it('should call onTechnologyFilter when technology chip is clicked', () => {
    const onTechnologyFilter = vi.fn()
    render(<ProjectFilter {...defaultProps} onTechnologyFilter={onTechnologyFilter} />)
    fireEvent.click(screen.getByRole('button', {name: 'TypeScript'}))
    expect(onTechnologyFilter).toHaveBeenCalledWith('TypeScript')
  })

  it('should call onTypeFilter when type chip is clicked', () => {
    const onTypeFilter = vi.fn()
    render(<ProjectFilter {...defaultProps} onTypeFilter={onTypeFilter} />)
    fireEvent.click(screen.getByRole('button', {name: 'Open Source'}))
    expect(onTypeFilter).toHaveBeenCalledWith('Open Source')
  })

  it('should call onStatusFilter when status chip is clicked', () => {
    const onStatusFilter = vi.fn()
    render(<ProjectFilter {...defaultProps} onStatusFilter={onStatusFilter} />)
    fireEvent.click(screen.getByRole('button', {name: 'Active'}))
    expect(onStatusFilter).toHaveBeenCalledWith('Active')
  })

  it('should show active state for active technology filters', () => {
    const activeFilters: ProjectFilters = {technologies: ['TypeScript'], types: [], status: []}
    render(<ProjectFilter {...defaultProps} activeFilters={activeFilters} />)
    const button = screen.getByRole('button', {name: 'TypeScript'})
    expect(button).toHaveAttribute('aria-pressed', 'true')
    expect(button).toHaveClass('project-filter__chip--active')
  })

  it('should show active state for active type filters', () => {
    const activeFilters: ProjectFilters = {technologies: [], types: ['Open Source'], status: []}
    render(<ProjectFilter {...defaultProps} activeFilters={activeFilters} />)
    const button = screen.getByRole('button', {name: 'Open Source'})
    expect(button).toHaveAttribute('aria-pressed', 'true')
    expect(button).toHaveClass('project-filter__chip--active')
  })

  it('should show active state for active status filters', () => {
    const activeFilters: ProjectFilters = {technologies: [], types: [], status: ['Active']}
    render(<ProjectFilter {...defaultProps} activeFilters={activeFilters} />)
    const button = screen.getByRole('button', {name: 'Active'})
    expect(button).toHaveAttribute('aria-pressed', 'true')
  })

  it('should show clear category button for technologies when active', () => {
    const activeFilters: ProjectFilters = {technologies: ['TypeScript'], types: [], status: []}
    render(<ProjectFilter {...defaultProps} activeFilters={activeFilters} />)
    expect(screen.getByLabelText('Clear technology filters')).toBeInTheDocument()
  })

  it('should call onClearCategory when clear technology button is clicked', () => {
    const onClearCategory = vi.fn()
    const activeFilters: ProjectFilters = {technologies: ['TypeScript'], types: [], status: []}
    render(<ProjectFilter {...defaultProps} activeFilters={activeFilters} onClearCategory={onClearCategory} />)
    fireEvent.click(screen.getByLabelText('Clear technology filters'))
    expect(onClearCategory).toHaveBeenCalledWith('technologies')
  })

  it('should show clear category button for types when active', () => {
    const activeFilters: ProjectFilters = {technologies: [], types: ['Open Source'], status: []}
    render(<ProjectFilter {...defaultProps} activeFilters={activeFilters} />)
    expect(screen.getByLabelText('Clear type filters')).toBeInTheDocument()
  })

  it('should call onClearCategory when clear types button is clicked', () => {
    const onClearCategory = vi.fn()
    const activeFilters: ProjectFilters = {technologies: [], types: ['Open Source'], status: []}
    render(<ProjectFilter {...defaultProps} activeFilters={activeFilters} onClearCategory={onClearCategory} />)
    fireEvent.click(screen.getByLabelText('Clear type filters'))
    expect(onClearCategory).toHaveBeenCalledWith('types')
  })

  it('should show clear category button for status when active', () => {
    const activeFilters: ProjectFilters = {technologies: [], types: [], status: ['Active']}
    render(<ProjectFilter {...defaultProps} activeFilters={activeFilters} />)
    expect(screen.getByLabelText('Clear status filters')).toBeInTheDocument()
  })

  it('should call onClearCategory when clear status button is clicked', () => {
    const onClearCategory = vi.fn()
    const activeFilters: ProjectFilters = {technologies: [], types: [], status: ['Active']}
    render(<ProjectFilter {...defaultProps} activeFilters={activeFilters} onClearCategory={onClearCategory} />)
    fireEvent.click(screen.getByLabelText('Clear status filters'))
    expect(onClearCategory).toHaveBeenCalledWith('status')
  })

  it('should show active filter count summary when filters are active', () => {
    const activeFilters: ProjectFilters = {technologies: ['TypeScript'], types: ['Open Source'], status: ['Active']}
    render(<ProjectFilter {...defaultProps} activeFilters={activeFilters} hasActiveFilters={true} />)
    expect(screen.getByText(/3 filters active/)).toBeInTheDocument()
  })

  it('should show singular "filter" when only one filter is active', () => {
    const activeFilters: ProjectFilters = {technologies: ['TypeScript'], types: [], status: []}
    render(<ProjectFilter {...defaultProps} activeFilters={activeFilters} hasActiveFilters={true} />)
    expect(screen.getByText(/1 filter active/)).toBeInTheDocument()
  })

  it('should not render technology section when no technologies available', () => {
    const noTechFilters = {...defaultAvailableFilters, technologies: []}
    render(<ProjectFilter {...defaultProps} availableFilters={noTechFilters} />)
    expect(screen.queryByRole('heading', {name: 'Technologies'})).not.toBeInTheDocument()
  })

  it('should not render type section when no types available', () => {
    const noTypeFilters = {...defaultAvailableFilters, types: []}
    render(<ProjectFilter {...defaultProps} availableFilters={noTypeFilters} />)
    expect(screen.queryByRole('heading', {name: 'Project Type'})).not.toBeInTheDocument()
  })

  it('should not render status section when no statuses available', () => {
    const noStatusFilters = {...defaultAvailableFilters, status: []}
    render(<ProjectFilter {...defaultProps} availableFilters={noStatusFilters} />)
    expect(screen.queryByRole('heading', {name: 'Status'})).not.toBeInTheDocument()
  })
})
