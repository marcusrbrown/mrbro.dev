import {act, renderHook} from '@testing-library/react'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {getAnimationClasses, getStaggerDelay, useScrollAnimation} from '../../src/hooks/UseScrollAnimation'
import {prefersReducedMotion} from '../../src/utils/accessibility'

// Mock accessibility module
vi.mock('../../src/utils/accessibility', () => ({
  prefersReducedMotion: vi.fn(() => false),
}))
const mockPrefersReducedMotion = vi.mocked(prefersReducedMotion)

// Mock IntersectionObserver
const mockObserve = vi.fn()
const mockUnobserve = vi.fn()
const mockDisconnect = vi.fn()
let _intersectionCallback: IntersectionObserverCallback

const MockIntersectionObserver = vi.fn().mockImplementation((callback: IntersectionObserverCallback) => {
  intersectionCallback = callback
  return {
    observe: mockObserve,
    unobserve: mockUnobserve,
    disconnect: mockDisconnect,
  }
})

vi.stubGlobal('IntersectionObserver', MockIntersectionObserver)

describe('useScrollAnimation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    mockPrefersReducedMotion.mockReturnValue(false)
    MockIntersectionObserver.mockImplementation((callback: IntersectionObserverCallback) => {
      intersectionCallback = callback
      return {
        observe: mockObserve,
        unobserve: mockUnobserve,
        disconnect: mockDisconnect,
      }
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('initialization', () => {
    it('should return initial idle animation state', () => {
      const {result} = renderHook(() => useScrollAnimation())

      expect(result.current.animationState).toBe('idle')
      expect(result.current.isInView).toBe(false)
      expect(result.current.ref).toBeDefined()
    })

    it('should return triggerAnimation and resetAnimation functions', () => {
      const {result} = renderHook(() => useScrollAnimation())

      expect(typeof result.current.triggerAnimation).toBe('function')
      expect(typeof result.current.resetAnimation).toBe('function')
    })
  })

  describe('triggerAnimation with reduced motion', () => {
    it('should immediately set to visible when reduced motion is preferred', () => {
      mockPrefersReducedMotion.mockReturnValue(true)
      const {result} = renderHook(() => useScrollAnimation({respectReducedMotion: true}))

      act(() => {
        result.current.triggerAnimation()
      })

      expect(result.current.animationState).toBe('visible')
    })
  })

  describe('triggerAnimation without reduced motion', () => {
    it('should transition to entering then visible state', async () => {
      mockPrefersReducedMotion.mockReturnValue(false)
      const {result} = renderHook(() => useScrollAnimation())

      act(() => {
        result.current.triggerAnimation()
      })

      expect(result.current.animationState).toBe('entering')
    })

    it('should transition to visible after requestAnimationFrame', () => {
      mockPrefersReducedMotion.mockReturnValue(false)
      const mockRaf = vi.fn().mockImplementation((cb: FrameRequestCallback) => {
        cb(0)
        return 1
      })
      vi.stubGlobal('requestAnimationFrame', mockRaf)

      const {result} = renderHook(() => useScrollAnimation())

      act(() => {
        result.current.triggerAnimation()
      })

      expect(result.current.animationState).toBe('visible')
    })

    it('should apply delay when configured', () => {
      mockPrefersReducedMotion.mockReturnValue(false)
      const {result} = renderHook(() => useScrollAnimation({delay: 200}))

      act(() => {
        result.current.triggerAnimation()
      })

      expect(result.current.animationState).toBe('entering')

      act(() => {
        vi.advanceTimersByTime(200)
      })

      expect(result.current.animationState).toBe('visible')
    })
  })

  describe('resetAnimation', () => {
    it('should reset animation state to idle', () => {
      const mockRaf = vi.fn().mockImplementation((cb: FrameRequestCallback) => {
        cb(0)
        return 1
      })
      vi.stubGlobal('requestAnimationFrame', mockRaf)
      mockPrefersReducedMotion.mockReturnValue(false)
      const {result} = renderHook(() => useScrollAnimation())

      act(() => {
        result.current.triggerAnimation()
      })

      act(() => {
        result.current.resetAnimation()
      })

      expect(result.current.animationState).toBe('idle')
    })
  })

  describe('options', () => {
    it('should accept custom threshold', () => {
      const {result} = renderHook(() => useScrollAnimation({threshold: 0.5}))
      expect(result.current.animationState).toBe('idle')
    })

    it('should accept custom rootMargin', () => {
      const {result} = renderHook(() => useScrollAnimation({rootMargin: '100px'}))
      expect(result.current.animationState).toBe('idle')
    })

    it('should accept triggerOnce: false', () => {
      const {result} = renderHook(() => useScrollAnimation({triggerOnce: false}))
      expect(result.current.animationState).toBe('idle')
    })
  })
})

describe('getAnimationClasses', () => {
  it('should return base class for idle state', () => {
    expect(getAnimationClasses('idle')).toBe('animate animate--idle')
  })

  it('should return entering classes', () => {
    expect(getAnimationClasses('entering')).toBe('animate animate--entering')
  })

  it('should return visible classes', () => {
    expect(getAnimationClasses('visible')).toBe('animate animate--visible')
  })

  it('should return exiting classes', () => {
    expect(getAnimationClasses('exiting')).toBe('animate animate--exiting')
  })

  it('should use custom base class', () => {
    expect(getAnimationClasses('visible', 'my-anim')).toBe('my-anim my-anim--visible')
  })
})

describe('getStaggerDelay', () => {
  it('should calculate stagger delay for index 0', () => {
    expect(getStaggerDelay(0)).toBe(0)
  })

  it('should calculate stagger delay with increment', () => {
    expect(getStaggerDelay(3)).toBe(300)
  })

  it('should respect base delay', () => {
    expect(getStaggerDelay(0, 100)).toBe(100)
    expect(getStaggerDelay(1, 100)).toBe(200)
  })

  it('should use custom increment', () => {
    expect(getStaggerDelay(3, 0, 50)).toBe(150)
  })

  it('should combine base delay and increment', () => {
    expect(getStaggerDelay(2, 100, 200)).toBe(500)
  })
})
