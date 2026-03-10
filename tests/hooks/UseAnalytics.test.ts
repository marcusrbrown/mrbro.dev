import {act, renderHook} from '@testing-library/react'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import {
  useAnalyticsTracking,
  useContactTracking,
  useDownloadTracking,
  useErrorTracking,
  useNavigationTracking,
  usePerformanceTracking,
  useProjectTracking,
  useSearchTracking,
  useSectionTracking,
  useSkillTracking,
  useThemeTracking,
} from '../../src/hooks/UseAnalytics'
import {analytics} from '../../src/utils/analytics'

// Mock the analytics utility
vi.mock('../../src/utils/analytics', () => ({
  analytics: {
    track: vi.fn(),
    trackContactClick: vi.fn(),
    trackExternalLink: vi.fn(),
    trackProjectInteraction: vi.fn(),
    trackSkillInteraction: vi.fn(),
    trackNavigation: vi.fn(),
    trackThemeChange: vi.fn(),
    trackError: vi.fn(),
    trackSearch: vi.fn(),
    trackDownload: vi.fn(),
    trackSectionView: vi.fn(),
  },
}))

describe('UseAnalytics hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('useContactTracking', () => {
    it('should provide trackContactClick function', () => {
      const {result} = renderHook(() => useContactTracking())
      expect(typeof result.current.trackContactClick).toBe('function')
    })

    it('should call analytics.trackContactClick when trackContactClick is called', () => {
      const {result} = renderHook(() => useContactTracking())

      act(() => {
        result.current.trackContactClick('email', 'contact-form')
      })

      expect(analytics.trackContactClick).toHaveBeenCalledWith('email', 'contact-form')
    })

    it('should provide trackExternalLink function', () => {
      const {result} = renderHook(() => useContactTracking())
      expect(typeof result.current.trackExternalLink).toBe('function')
    })

    it('should call analytics.trackExternalLink when trackExternalLink is called', () => {
      const {result} = renderHook(() => useContactTracking())

      act(() => {
        result.current.trackExternalLink('https://github.com', 'contact')
      })

      expect(analytics.trackExternalLink).toHaveBeenCalledWith('https://github.com', 'contact')
    })
  })

  describe('useProjectTracking', () => {
    it('should provide all project tracking functions', () => {
      const {result} = renderHook(() => useProjectTracking())
      expect(typeof result.current.trackProjectView).toBe('function')
      expect(typeof result.current.trackProjectClick).toBe('function')
      expect(typeof result.current.trackProjectHover).toBe('function')
      expect(typeof result.current.trackProjectModal).toBe('function')
    })

    it('should call analytics for trackProjectClick', () => {
      const {result} = renderHook(() => useProjectTracking())

      act(() => {
        result.current.trackProjectClick('proj-1', 'gallery')
      })

      expect(analytics.trackProjectInteraction).toHaveBeenCalledWith('click', 'proj-1', 'gallery')
    })

    it('should call analytics for trackProjectView', () => {
      const {result} = renderHook(() => useProjectTracking())

      act(() => {
        result.current.trackProjectView('proj-1')
      })

      expect(analytics.trackProjectInteraction).toHaveBeenCalledWith('view', 'proj-1', 'gallery')
    })

    it('should call analytics for trackProjectHover', () => {
      const {result} = renderHook(() => useProjectTracking())

      act(() => {
        result.current.trackProjectHover('proj-1')
      })

      expect(analytics.trackProjectInteraction).toHaveBeenCalledWith('hover', 'proj-1', 'gallery')
    })

    it('should call analytics for trackProjectModal', () => {
      const {result} = renderHook(() => useProjectTracking())

      act(() => {
        result.current.trackProjectModal('open', 'proj-1')
      })

      expect(analytics.trackProjectInteraction).toHaveBeenCalledWith('open', 'proj-1', 'modal')
    })
  })

  describe('useSkillTracking', () => {
    it('should provide all skill tracking functions', () => {
      const {result} = renderHook(() => useSkillTracking())
      expect(typeof result.current.trackSkillHover).toBe('function')
      expect(typeof result.current.trackSkillClick).toBe('function')
      expect(typeof result.current.trackSkillView).toBe('function')
    })

    it('should call analytics for trackSkillHover', () => {
      const {result} = renderHook(() => useSkillTracking())

      act(() => {
        result.current.trackSkillHover('TypeScript', 'languages')
      })

      expect(analytics.trackSkillInteraction).toHaveBeenCalledWith('hover', 'TypeScript', 'languages')
    })

    it('should call analytics for trackSkillClick', () => {
      const {result} = renderHook(() => useSkillTracking())

      act(() => {
        result.current.trackSkillClick('React')
      })

      expect(analytics.trackSkillInteraction).toHaveBeenCalledWith('click', 'React', undefined)
    })

    it('should call analytics for trackSkillView', () => {
      const {result} = renderHook(() => useSkillTracking())

      act(() => {
        result.current.trackSkillView('Node.js', 'backend')
      })

      expect(analytics.trackSkillInteraction).toHaveBeenCalledWith('view', 'Node.js', 'backend')
    })
  })

  describe('useNavigationTracking', () => {
    it('should provide navigation tracking functions', () => {
      const {result} = renderHook(() => useNavigationTracking())
      expect(typeof result.current.trackNavigation).toBe('function')
      expect(typeof result.current.trackScrollToSection).toBe('function')
    })

    it('should call analytics for trackNavigation', () => {
      const {result} = renderHook(() => useNavigationTracking())

      act(() => {
        result.current.trackNavigation('projects', 'click')
      })

      expect(analytics.trackNavigation).toHaveBeenCalledWith('projects', 'click')
    })

    it('should call analytics for trackScrollToSection', () => {
      const {result} = renderHook(() => useNavigationTracking())

      act(() => {
        result.current.trackScrollToSection('about')
      })

      expect(analytics.trackNavigation).toHaveBeenCalledWith('about', 'scroll')
    })
  })

  describe('useThemeTracking', () => {
    it('should provide theme tracking functions', () => {
      const {result} = renderHook(() => useThemeTracking())
      expect(typeof result.current.trackThemeChange).toBe('function')
      expect(typeof result.current.trackThemeToggle).toBe('function')
    })

    it('should call analytics for trackThemeChange', () => {
      const {result} = renderHook(() => useThemeTracking())

      act(() => {
        result.current.trackThemeChange('light', 'dark')
      })

      expect(analytics.trackThemeChange).toHaveBeenCalledWith('light', 'dark')
    })

    it('should call analytics.track for trackThemeToggle', () => {
      const {result} = renderHook(() => useThemeTracking())

      act(() => {
        result.current.trackThemeToggle('dark')
      })

      expect(analytics.track).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'Theme',
          action: 'toggle',
          label: 'dark',
        }),
      )
    })
  })

  describe('useErrorTracking', () => {
    it('should provide error tracking functions', () => {
      const {result} = renderHook(() => useErrorTracking())
      expect(typeof result.current.trackError).toBe('function')
      expect(typeof result.current.trackApiError).toBe('function')
    })

    it('should call analytics.trackError for trackError', () => {
      const {result} = renderHook(() => useErrorTracking())

      act(() => {
        result.current.trackError('Something failed', 'useGitHub')
      })

      expect(analytics.trackError).toHaveBeenCalledWith('Something failed', 'useGitHub')
    })

    it('should call analytics.trackError for trackApiError', () => {
      const {result} = renderHook(() => useErrorTracking())

      act(() => {
        result.current.trackApiError('/api/repos', '404 Not Found')
      })

      expect(analytics.trackError).toHaveBeenCalledWith('API: 404 Not Found', '/api/repos')
    })
  })

  describe('useSearchTracking', () => {
    it('should provide search tracking functions', () => {
      const {result} = renderHook(() => useSearchTracking())
      expect(typeof result.current.trackSearch).toBe('function')
      expect(typeof result.current.trackSearchFilter).toBe('function')
    })

    it('should call analytics.trackSearch', () => {
      const {result} = renderHook(() => useSearchTracking())

      act(() => {
        result.current.trackSearch('react', 5)
      })

      expect(analytics.trackSearch).toHaveBeenCalledWith('react', 5)
    })

    it('should call analytics.track for trackSearchFilter', () => {
      const {result} = renderHook(() => useSearchTracking())

      act(() => {
        result.current.trackSearchFilter('language', 'TypeScript')
      })

      expect(analytics.track).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'Search',
          action: 'filter',
          label: 'language:TypeScript',
        }),
      )
    })
  })

  describe('usePerformanceTracking', () => {
    it('should provide performance tracking functions', () => {
      const {result} = renderHook(() => usePerformanceTracking())
      expect(typeof result.current.trackPageLoad).toBe('function')
      expect(typeof result.current.trackImageLoad).toBe('function')
      expect(typeof result.current.trackAnimation).toBe('function')
    })

    it('should call analytics.track for trackPageLoad', () => {
      const {result} = renderHook(() => usePerformanceTracking())

      act(() => {
        result.current.trackPageLoad(1500.7)
      })

      expect(analytics.track).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'Performance',
          action: 'page_load',
          value: 1501,
        }),
      )
    })

    it('should call analytics.track for trackImageLoad', () => {
      const {result} = renderHook(() => usePerformanceTracking())

      act(() => {
        result.current.trackImageLoad('hero.jpg', 200.5)
      })

      expect(analytics.track).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'Performance',
          action: 'image_load',
          label: 'hero.jpg',
          value: 201,
        }),
      )
    })

    it('should call analytics.track for trackAnimation', () => {
      const {result} = renderHook(() => usePerformanceTracking())

      act(() => {
        result.current.trackAnimation('slide-in', 300.2)
      })

      expect(analytics.track).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'Performance',
          action: 'animation',
          label: 'slide-in',
          value: 300,
        }),
      )
    })
  })

  describe('useDownloadTracking', () => {
    it('should provide download tracking functions', () => {
      const {result} = renderHook(() => useDownloadTracking())
      expect(typeof result.current.trackDownload).toBe('function')
      expect(typeof result.current.trackResumeDownload).toBe('function')
    })

    it('should call analytics.trackDownload for trackDownload', () => {
      const {result} = renderHook(() => useDownloadTracking())

      act(() => {
        result.current.trackDownload('resume.pdf', 'hero')
      })

      expect(analytics.trackDownload).toHaveBeenCalledWith('resume.pdf', 'hero')
    })

    it('should call analytics.trackDownload for trackResumeDownload', () => {
      const {result} = renderHook(() => useDownloadTracking())

      act(() => {
        result.current.trackResumeDownload('pdf')
      })

      expect(analytics.trackDownload).toHaveBeenCalledWith('resume.pdf', 'resume_section')
    })
  })

  describe('useAnalyticsTracking', () => {
    it('should combine all tracking functions', () => {
      const {result} = renderHook(() => useAnalyticsTracking())

      // Contact
      expect(typeof result.current.trackContactClick).toBe('function')
      expect(typeof result.current.trackExternalLink).toBe('function')
      // Project
      expect(typeof result.current.trackProjectView).toBe('function')
      expect(typeof result.current.trackProjectClick).toBe('function')
      // Skill
      expect(typeof result.current.trackSkillHover).toBe('function')
      // Navigation
      expect(typeof result.current.trackNavigation).toBe('function')
      // Theme
      expect(typeof result.current.trackThemeChange).toBe('function')
      // Error
      expect(typeof result.current.trackError).toBe('function')
      // Performance
      expect(typeof result.current.trackPageLoad).toBe('function')
      // Download
      expect(typeof result.current.trackDownload).toBe('function')
    })
  })

  describe('useSectionTracking', () => {
    it('should return a ref object', () => {
      const {result} = renderHook(() => useSectionTracking('hero'))

      expect(result.current).toBeDefined()
      expect(result.current).toHaveProperty('current')
    })
  })
})
