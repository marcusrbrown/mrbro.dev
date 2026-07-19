import {render, screen} from '@testing-library/react'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import AboutSection from '../../src/components/AboutSection'

// Mock the UseScrollAnimation hook
vi.mock('../../src/hooks/UseScrollAnimation', () => ({
  useScrollAnimation: vi.fn(() => ({
    ref: {current: null},
    animationState: 'idle',
    isInView: false,
    triggerAnimation: vi.fn(),
    resetAnimation: vi.fn(),
  })),
}))

// Mock the UseParallax hook
vi.mock('../../src/hooks/UseParallax', () => ({
  useParallax: vi.fn(() => ({
    ref: {current: null},
    transform: 'translate3d(0, 0, 0)',
  })),
}))

describe('AboutSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render the about section with proper structure', () => {
      render(<AboutSection />)

      expect(screen.getByLabelText('About Me')).toBeInTheDocument()
      expect(screen.getByRole('heading', {name: 'About Me'})).toBeInTheDocument()
      expect(screen.getByText(/Passionate full-stack developer/)).toBeInTheDocument()
    })

    it('should render section header with title and subtitle', () => {
      render(<AboutSection />)

      expect(screen.getByRole('heading', {name: 'About Me'})).toBeInTheDocument()
      expect(screen.getByText(/focus on creating exceptional digital experiences/)).toBeInTheDocument()
    })

    it('should render professional story content', () => {
      render(<AboutSection />)

      expect(screen.getByText(/dedicated software engineer with over a decade/)).toBeInTheDocument()
      expect(screen.getByText(/specialized in modern web technologies/)).toBeInTheDocument()
      expect(screen.getByText(/contributing to open-source projects/)).toBeInTheDocument()
    })

    it('should not render removed sub-sections', () => {
      render(<AboutSection />)

      expect(screen.queryByRole('heading', {name: 'Professional Journey'})).not.toBeInTheDocument()
      expect(screen.queryByRole('heading', {name: 'What People Say'})).not.toBeInTheDocument()
      expect(screen.queryByText(/Interested in working together/)).not.toBeInTheDocument()
      expect(screen.queryByTestId('animated-counters')).not.toBeInTheDocument()
      expect(screen.queryByTestId('career-timeline')).not.toBeInTheDocument()
      expect(screen.queryByTestId('testimonials-carousel')).not.toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper semantic structure', () => {
      render(<AboutSection />)

      const section = screen.getByRole('region', {name: 'About Me'})
      expect(section).toHaveAttribute('id', 'about')
      expect(section).toHaveAttribute('aria-labelledby', 'about-heading')
    })

    it('should have proper heading hierarchy', () => {
      render(<AboutSection />)

      const mainHeading = screen.getByRole('heading', {level: 2, name: 'About Me'})
      expect(mainHeading).toHaveAttribute('id', 'about-heading')
    })

    it('should hide decorative elements from screen readers', () => {
      render(<AboutSection />)

      const decorativeElements = screen.getByRole('region', {name: 'About Me'}).querySelector('.about-bg-elements')
      expect(decorativeElements).toHaveAttribute('aria-hidden', 'true')
    })
  })

  describe('Animation Integration', () => {
    it('should use scroll animation hooks for different sections', async () => {
      const {useScrollAnimation} = await import('../../src/hooks/UseScrollAnimation')

      render(<AboutSection />)

      // Should call useScrollAnimation for header and story sections
      expect(useScrollAnimation).toHaveBeenCalledWith({
        threshold: 0.1,
        rootMargin: '100px 0px',
        triggerOnce: true,
      })
    })

    it('should apply inline styles based on animation state', async () => {
      const {useScrollAnimation} = await import('../../src/hooks/UseScrollAnimation')

      // Mock animation state as visible
      vi.mocked(useScrollAnimation).mockReturnValue({
        ref: {current: null},
        animationState: 'visible',
        isInView: true,
        triggerAnimation: vi.fn(),
        resetAnimation: vi.fn(),
      })

      render(<AboutSection />)

      // Check that inline styles are applied for visible state
      const header = screen.getByRole('region', {name: 'About Me'}).querySelector('.section-header')
      expect(header).toHaveStyle('opacity: 1')
      expect(header).toHaveStyle('transform: translateY(0)')
    })

    it('should apply hidden styles when not in view', async () => {
      const {useScrollAnimation} = await import('../../src/hooks/UseScrollAnimation')

      // Mock animation state as not visible
      vi.mocked(useScrollAnimation).mockReturnValue({
        ref: {current: null},
        animationState: 'idle',
        isInView: false,
        triggerAnimation: vi.fn(),
        resetAnimation: vi.fn(),
      })

      render(<AboutSection />)

      // Check that inline styles are applied for hidden state
      const header = screen.getByRole('region', {name: 'About Me'}).querySelector('.section-header')
      expect(header).toHaveStyle('opacity: 0')
      expect(header).toHaveStyle('transform: translateY(2rem)')
    })
  })

  describe('Custom Props', () => {
    it('should accept and apply custom className', () => {
      render(<AboutSection className="custom-about-class" />)

      const section = screen.getByRole('region', {name: 'About Me'})
      expect(section).toHaveClass('about-section', 'custom-about-class')
    })

    it('should handle empty className gracefully', () => {
      render(<AboutSection className="" />)

      const section = screen.getByRole('region', {name: 'About Me'})
      expect(section).toHaveClass('about-section')
      expect(section.className).not.toContain('undefined')
    })
  })

  describe('Layout Structure', () => {
    it('should render components in correct order', () => {
      render(<AboutSection />)

      const section = screen.getByRole('region', {name: 'About Me'})
      const container = section.children[0]
      expect(container).toBeDefined()
      const children = Array.from(container?.children || [])

      // Should have only header and story
      expect(children).toHaveLength(2)
      expect(children[0]).toHaveClass('section-header')
      expect(children[1]).toHaveClass('about-story')
    })

    it('should have proper container structure', () => {
      render(<AboutSection />)

      const section = screen.getByRole('region', {name: 'About Me'})
      const container = section.querySelector('.container')
      expect(container).toBeInTheDocument()

      const bgElements = section.querySelector('.about-bg-elements')
      expect(bgElements).toBeInTheDocument()
    })
  })

  describe('Content Validation', () => {
    it('should contain comprehensive professional story', () => {
      render(<AboutSection />)

      // Check for key story elements
      expect(screen.getByText(/dedicated software engineer/)).toBeInTheDocument()
      expect(screen.getByText(/modern web technologies/)).toBeInTheDocument()
      expect(screen.getByText(/React and TypeScript/)).toBeInTheDocument()
      expect(screen.getByText(/Node.js and cloud platforms/)).toBeInTheDocument()
      expect(screen.getByText(/clean, maintainable code/)).toBeInTheDocument()
      expect(screen.getByText(/contributing to open-source projects/)).toBeInTheDocument()
    })
  })
})
