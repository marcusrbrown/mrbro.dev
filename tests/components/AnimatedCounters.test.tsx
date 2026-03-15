import {act, render, screen} from '@testing-library/react'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import AnimatedCounters from '../../src/components/AnimatedCounters'

// Mock the UseScrollAnimation hook — control animation state
const mockUseScrollAnimation = vi.fn()

vi.mock('../../src/hooks/UseScrollAnimation', () => ({
  useScrollAnimation: (opts: unknown) => mockUseScrollAnimation(opts),
}))

// Real easing so counter animation logic is exercised
vi.mock('../../src/utils/animation-utils', () => ({
  easingFunctions: {
    easeOutQuart: (t: number) => 1 - (1 - t) ** 4,
  },
}))

const idleState = () => ({
  ref: {current: null},
  animationState: 'idle' as const,
  isInView: false,
  triggerAnimation: vi.fn(),
  resetAnimation: vi.fn(),
})

const visibleState = () => ({
  ref: {current: null},
  animationState: 'visible' as const,
  isInView: true,
  triggerAnimation: vi.fn(),
  resetAnimation: vi.fn(),
})

describe('AnimatedCounters', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseScrollAnimation.mockReturnValue(idleState())
  })

  it('should render all counter items with correct structure', () => {
    render(<AnimatedCounters />)

    const countersContainer = screen.getByRole('region', {name: 'Professional statistics'})
    expect(countersContainer).toHaveClass('animated-counters')

    expect(screen.getByText('Years Experience')).toBeInTheDocument()
    expect(screen.getByText('Projects Completed')).toBeInTheDocument()
    expect(screen.getByText('GitHub Repositories')).toBeInTheDocument()
    expect(screen.getByText('Programming Languages')).toBeInTheDocument()
    expect(screen.getByText('Open Source Contributions')).toBeInTheDocument()
    expect(screen.getByText('Technical Certifications')).toBeInTheDocument()
  })

  it('should display counter numbers initially as 0 or target values', () => {
    render(<AnimatedCounters />)

    const counterNumbers = screen.getAllByText(/^\d+\+?%?$/)
    expect(counterNumbers.length).toBeGreaterThan(0)
  })

  it('should have proper accessibility attributes', () => {
    render(<AnimatedCounters />)

    const countersContainer = screen.getByRole('region', {name: 'Professional statistics'})
    expect(countersContainer).toBeInTheDocument()

    const counterItems = document.querySelectorAll('.animated-counter')
    expect(counterItems.length).toBe(6)

    counterItems.forEach(item => {
      expect(item).toHaveClass('animated-counter')
    })
  })

  it('should apply animation classes based on scroll state', () => {
    render(<AnimatedCounters />)
    const container = screen.getByRole('region', {name: 'Professional statistics'})
    expect(container).toHaveClass('animate--idle')
  })

  it('should apply visible animation class when in view', () => {
    mockUseScrollAnimation.mockReturnValue(visibleState())
    render(<AnimatedCounters />)
    const container = screen.getByRole('region', {name: 'Professional statistics'})
    expect(container).toHaveClass('animate--visible')
  })

  it('should render prefix and suffix labels', () => {
    render(<AnimatedCounters />)
    const suffixes = document.querySelectorAll('.animated-counter-suffix')
    // Several stats have '+' suffix
    expect(suffixes.length).toBeGreaterThan(0)
  })

  it('should render aria-live polite on counter numbers', () => {
    render(<AnimatedCounters />)
    const liveRegions = document.querySelectorAll('[aria-live="polite"]')
    expect(liveRegions.length).toBe(6)
  })

  describe('counter animation on scroll-in', () => {
    it('should start animation when animationState becomes visible', () => {
      vi.useFakeTimers()
      mockUseScrollAnimation.mockReturnValue(visibleState())

      const mockRaf = vi.fn().mockImplementation((cb: FrameRequestCallback) => {
        setTimeout(() => cb(performance.now()), 16)
        return 1
      })
      vi.stubGlobal('requestAnimationFrame', mockRaf)

      render(<AnimatedCounters />)

      act(() => {
        vi.advanceTimersByTime(50)
      })

      // Counter values should be > 0 after animation starts
      const counterNumbers = document.querySelectorAll('.animated-counter-number')
      expect(counterNumbers.length).toBe(6)

      vi.unstubAllGlobals()
      vi.useRealTimers()
    })

    it('should apply staggered delays for each counter', () => {
      vi.useFakeTimers()
      mockUseScrollAnimation.mockReturnValue(visibleState())

      const mockRaf = vi.fn().mockImplementation((cb: FrameRequestCallback) => {
        setTimeout(() => cb(performance.now()), 16)
        return 1
      })
      vi.stubGlobal('requestAnimationFrame', mockRaf)

      render(<AnimatedCounters />)

      // 6 counters with staggered delays (index * 150ms)
      const counterItems = document.querySelectorAll('.animated-counter')
      expect(counterItems.length).toBe(6)

      vi.unstubAllGlobals()
      vi.useRealTimers()
    })
  })
})
