import type {Project} from '../../src/types'
import {act, renderHook} from '@testing-library/react'
import {describe, expect, it} from 'vitest'
import {useProjectFilter} from '../../src/hooks/UseProjectFilter'

const makeProject = (overrides: Partial<Project> = {}): Project => ({
  id: '1',
  title: 'Test Project',
  description: 'A test project',
  url: 'https://github.com/test/project',
  language: 'TypeScript',
  stars: 10,
  topics: [],
  lastUpdated: new Date().toISOString(),
  ...overrides,
})

const projects: Project[] = [
  makeProject({
    id: '1',
    title: 'React App',
    language: 'TypeScript',
    topics: ['react', 'typescript', 'open-source'],
    lastUpdated: new Date().toISOString(), // Active
  }),
  makeProject({
    id: '2',
    title: 'Node Server',
    language: 'JavaScript',
    topics: ['nodejs', 'personal'],
    lastUpdated: new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000).toISOString(), // Recent (~6 months ago)
  }),
  makeProject({
    id: '3',
    title: 'Python Tool',
    language: 'Python',
    topics: ['python', 'tool'],
    lastUpdated: new Date(Date.now() - 18 * 30 * 24 * 60 * 60 * 1000).toISOString(), // Archived (~18 months ago)
  }),
]

describe('useProjectFilter', () => {
  describe('initialization', () => {
    it('should return all projects when no filters are active', () => {
      const {result} = renderHook(() => useProjectFilter(projects))

      expect(result.current.filteredProjects).toHaveLength(3)
      expect(result.current.hasActiveFilters).toBe(false)
    })

    it('should return empty array for empty projects list', () => {
      const {result} = renderHook(() => useProjectFilter([]))

      expect(result.current.filteredProjects).toHaveLength(0)
      expect(result.current.availableFilters.technologies).toHaveLength(0)
      expect(result.current.availableFilters.types).toHaveLength(0)
      expect(result.current.availableFilters.status).toHaveLength(0)
    })

    it('should initialize with empty active filters', () => {
      const {result} = renderHook(() => useProjectFilter(projects))

      expect(result.current.activeFilters.technologies).toHaveLength(0)
      expect(result.current.activeFilters.types).toHaveLength(0)
      expect(result.current.activeFilters.status).toHaveLength(0)
    })
  })

  describe('availableFilters', () => {
    it('should extract technologies from project language and topics', () => {
      const {result} = renderHook(() => useProjectFilter(projects))

      const {technologies} = result.current.availableFilters
      expect(technologies).toContain('TypeScript')
      expect(technologies).toContain('JavaScript')
      expect(technologies).toContain('Python')
    })

    it('should extract types from topics', () => {
      const {result} = renderHook(() => useProjectFilter(projects))

      const {types} = result.current.availableFilters
      expect(types.length).toBeGreaterThan(0)
    })

    it('should extract status from lastUpdated', () => {
      const {result} = renderHook(() => useProjectFilter(projects))

      const {status} = result.current.availableFilters
      expect(status).toContain('Active')
      expect(status).toContain('Recent')
      expect(status).toContain('Archived')
    })

    it('should handle projects without language', () => {
      const projectsNoLang: Project[] = [makeProject({id: '1', language: '', topics: []})]
      const {result} = renderHook(() => useProjectFilter(projectsNoLang))

      expect(result.current.filteredProjects).toHaveLength(1)
    })

    it('should handle projects without topics', () => {
      const projectsNoTopics: Project[] = [makeProject({id: '1', topics: undefined})]
      const {result} = renderHook(() => useProjectFilter(projectsNoTopics))

      expect(result.current.filteredProjects).toHaveLength(1)
    })

    it('should handle projects without lastUpdated', () => {
      const projectsNoDate: Project[] = [makeProject({id: '1', lastUpdated: undefined})]
      const {result} = renderHook(() => useProjectFilter(projectsNoDate))

      expect(result.current.availableFilters.status).toContain('Unknown')
    })
  })

  describe('technology filtering', () => {
    it('should filter projects by technology', () => {
      const {result} = renderHook(() => useProjectFilter(projects))

      act(() => {
        result.current.setTechnologyFilter('TypeScript')
      })

      expect(result.current.filteredProjects).toHaveLength(1)
      expect(result.current.filteredProjects[0]?.id).toBe('1')
      expect(result.current.hasActiveFilters).toBe(true)
    })

    it('should toggle technology filter off when same filter is set again', () => {
      const {result} = renderHook(() => useProjectFilter(projects))

      act(() => {
        result.current.setTechnologyFilter('TypeScript')
      })
      expect(result.current.filteredProjects).toHaveLength(1)

      act(() => {
        result.current.setTechnologyFilter('TypeScript')
      })
      expect(result.current.filteredProjects).toHaveLength(3)
      expect(result.current.hasActiveFilters).toBe(false)
    })

    it('should support multiple technology filters', () => {
      const {result} = renderHook(() => useProjectFilter(projects))

      act(() => {
        result.current.setTechnologyFilter('TypeScript')
      })
      act(() => {
        result.current.setTechnologyFilter('JavaScript')
      })

      expect(result.current.filteredProjects).toHaveLength(2)
    })

    it('should format technology names from topics (nodejs → Node.js)', () => {
      const {result} = renderHook(() => useProjectFilter(projects))

      const {technologies} = result.current.availableFilters
      expect(technologies).toContain('Node.js')
    })
  })

  describe('type filtering', () => {
    it('should filter projects by type', () => {
      const {result} = renderHook(() => useProjectFilter(projects))

      act(() => {
        result.current.setTypeFilter('Open Source')
      })

      expect(result.current.filteredProjects).toHaveLength(1)
      expect(result.current.filteredProjects[0]?.id).toBe('1')
    })

    it('should toggle type filter off when same filter is set again', () => {
      const {result} = renderHook(() => useProjectFilter(projects))

      act(() => {
        result.current.setTypeFilter('Open Source')
      })
      expect(result.current.filteredProjects).toHaveLength(1)

      act(() => {
        result.current.setTypeFilter('Open Source')
      })
      expect(result.current.filteredProjects).toHaveLength(3)
    })
  })

  describe('status filtering', () => {
    it('should filter projects by status', () => {
      const {result} = renderHook(() => useProjectFilter(projects))

      act(() => {
        result.current.setStatusFilter('Active')
      })

      expect(result.current.filteredProjects).toHaveLength(1)
      expect(result.current.filteredProjects[0]?.id).toBe('1')
    })

    it('should toggle status filter off when same filter is set again', () => {
      const {result} = renderHook(() => useProjectFilter(projects))

      act(() => {
        result.current.setStatusFilter('Active')
      })
      expect(result.current.filteredProjects).toHaveLength(1)

      act(() => {
        result.current.setStatusFilter('Active')
      })
      expect(result.current.filteredProjects).toHaveLength(3)
    })

    it('should support multiple status filters', () => {
      const {result} = renderHook(() => useProjectFilter(projects))

      act(() => {
        result.current.setStatusFilter('Active')
      })
      act(() => {
        result.current.setStatusFilter('Recent')
      })

      expect(result.current.filteredProjects).toHaveLength(2)
    })
  })

  describe('combined filters', () => {
    it('should apply technology and status filters together', () => {
      const {result} = renderHook(() => useProjectFilter(projects))

      act(() => {
        result.current.setTechnologyFilter('TypeScript')
        result.current.setStatusFilter('Active')
      })

      // TypeScript project is active → matches both filters
      expect(result.current.filteredProjects).toHaveLength(1)
      expect(result.current.filteredProjects[0]?.id).toBe('1')
    })
  })

  describe('clearAllFilters', () => {
    it('should clear all active filters', () => {
      const {result} = renderHook(() => useProjectFilter(projects))

      act(() => {
        result.current.setTechnologyFilter('TypeScript')
        result.current.setStatusFilter('Active')
      })
      expect(result.current.hasActiveFilters).toBe(true)

      act(() => {
        result.current.clearAllFilters()
      })

      expect(result.current.hasActiveFilters).toBe(false)
      expect(result.current.filteredProjects).toHaveLength(3)
      expect(result.current.activeFilters.technologies).toHaveLength(0)
      expect(result.current.activeFilters.types).toHaveLength(0)
      expect(result.current.activeFilters.status).toHaveLength(0)
    })
  })

  describe('clearFilterCategory', () => {
    it('should clear only the specified filter category', () => {
      const {result} = renderHook(() => useProjectFilter(projects))

      act(() => {
        result.current.setTechnologyFilter('TypeScript')
        result.current.setStatusFilter('Active')
      })
      expect(result.current.activeFilters.technologies).toHaveLength(1)
      expect(result.current.activeFilters.status).toHaveLength(1)

      act(() => {
        result.current.clearFilterCategory('technologies')
      })

      expect(result.current.activeFilters.technologies).toHaveLength(0)
      expect(result.current.activeFilters.status).toHaveLength(1)
    })

    it('should clear types filter category', () => {
      const {result} = renderHook(() => useProjectFilter(projects))

      act(() => {
        result.current.setTypeFilter('Open Source')
      })
      expect(result.current.activeFilters.types).toHaveLength(1)

      act(() => {
        result.current.clearFilterCategory('types')
      })

      expect(result.current.activeFilters.types).toHaveLength(0)
    })
  })

  describe('hasActiveFilters', () => {
    it('should be false when no filters are active', () => {
      const {result} = renderHook(() => useProjectFilter(projects))
      expect(result.current.hasActiveFilters).toBe(false)
    })

    it('should be true when technology filter is active', () => {
      const {result} = renderHook(() => useProjectFilter(projects))

      act(() => {
        result.current.setTechnologyFilter('TypeScript')
      })

      expect(result.current.hasActiveFilters).toBe(true)
    })

    it('should be true when type filter is active', () => {
      const {result} = renderHook(() => useProjectFilter(projects))

      act(() => {
        result.current.setTypeFilter('Open Source')
      })

      expect(result.current.hasActiveFilters).toBe(true)
    })

    it('should be true when status filter is active', () => {
      const {result} = renderHook(() => useProjectFilter(projects))

      act(() => {
        result.current.setStatusFilter('Active')
      })

      expect(result.current.hasActiveFilters).toBe(true)
    })
  })

  describe('project status calculation', () => {
    it('should mark project as Active if updated within 3 months', () => {
      const recentProject = makeProject({
        id: '1',
        lastUpdated: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      })
      const {result} = renderHook(() => useProjectFilter([recentProject]))

      expect(result.current.availableFilters.status).toContain('Active')
    })

    it('should mark project as Recent if updated 3-12 months ago', () => {
      const recentProject = makeProject({
        id: '1',
        lastUpdated: new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000).toISOString(),
      })
      const {result} = renderHook(() => useProjectFilter([recentProject]))

      expect(result.current.availableFilters.status).toContain('Recent')
    })

    it('should mark project as Archived if updated more than 12 months ago', () => {
      const oldProject = makeProject({
        id: '1',
        lastUpdated: new Date(Date.now() - 18 * 30 * 24 * 60 * 60 * 1000).toISOString(),
      })
      const {result} = renderHook(() => useProjectFilter([oldProject]))

      expect(result.current.availableFilters.status).toContain('Archived')
    })
  })
})
