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

const MockIntersectionObserver = vi.fn().mockImplementation((_callback: IntersectionObserverCallback) => {
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
    MockIntersectionObserver.mockImplementation((_callback: IntersectionObserverCallback) => {
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

// ---- Behavioral tests: IO callback fires, element in view, exit animation ----
describe('useScrollAnimation — IntersectionObserver behavior', () => {
  let capturedIOCallback: IntersectionObserverCallback | null = null
  const ioObserve = vi.fn()
  const ioDisconnect = vi.fn()

  // Class-based mock so `new IntersectionObserver(callback)` works
  class BehaviouralIO implements IntersectionObserver {
    readonly root = null
    readonly rootMargin = ''
    readonly thresholds = [0]
    readonly observe = ioObserve
    readonly unobserve = vi.fn()
    readonly disconnect = ioDisconnect
    readonly takeRecords = vi.fn(() => [] as IntersectionObserverEntry[])

    constructor(callback: IntersectionObserverCallback) {
      capturedIOCallback = callback
    }
  }

  // Helper: render hook with a real DOM element attached
  const renderWithElement = (options: Parameters<typeof useScrollAnimation>[0] = {}) => {
    const element = document.createElement('div')
    document.body.append(element)

    const {result, rerender, unmount} = renderHook(
      (opts: Parameters<typeof useScrollAnimation>[0]) => useScrollAnimation(opts),
      {initialProps: {threshold: 0.1, ...options}},
    )

    ;(result.current.ref as {current: HTMLElement}).current = element
    // Rerender with slightly changed threshold to force the IO effect to re-run
    rerender({threshold: 0.15, ...options})

    return {result, rerender, unmount, element}
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    capturedIOCallback = null
    vi.mocked(prefersReducedMotion).mockReturnValue(false)
    vi.stubGlobal('IntersectionObserver', BehaviouralIO)
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      cb(0)
      return 1
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver)
  })

  it('should observe the attached element', () => {
    const {element} = renderWithElement()
    expect(ioObserve).toHaveBeenCalledWith(element)
    element.remove()
  })

  it('should set isInView and transition to visible when element enters viewport', () => {
    const {result, element} = renderWithElement()

    act(() => {
      capturedIOCallback?.(
        [{isIntersecting: true, target: element} as unknown as IntersectionObserverEntry],
        {} as IntersectionObserver,
      )
    })

    expect(result.current.isInView).toBe(true)
    expect(result.current.animationState).toBe('visible')
    element.remove()
  })

  it('should set isInView false when element leaves viewport', () => {
    const {result, element} = renderWithElement({triggerOnce: false})

    // Enter
    act(() => {
      capturedIOCallback?.(
        [{isIntersecting: true, target: element} as unknown as IntersectionObserverEntry],
        {} as IntersectionObserver,
      )
    })

    // Leave
    act(() => {
      capturedIOCallback?.(
        [{isIntersecting: false, target: element} as unknown as IntersectionObserverEntry],
        {} as IntersectionObserver,
      )
    })

    expect(result.current.isInView).toBe(false)
    element.remove()
  })

  it('should play exit animation when triggerOnce is false and element leaves', () => {
    const {result, element} = renderWithElement({triggerOnce: false})

    act(() => {
      capturedIOCallback?.(
        [{isIntersecting: true, target: element} as unknown as IntersectionObserverEntry],
        {} as IntersectionObserver,
      )
    })
    expect(result.current.animationState).toBe('visible')

    act(() => {
      capturedIOCallback?.(
        [{isIntersecting: false, target: element} as unknown as IntersectionObserverEntry],
        {} as IntersectionObserver,
      )
    })
    expect(result.current.animationState).toBe('exiting')

    act(() => {
      vi.advanceTimersByTime(200)
    })
    expect(result.current.animationState).toBe('idle')
    element.remove()
  })

  it('should NOT trigger exit animation when triggerOnce is true', () => {
    const {result, element} = renderWithElement({triggerOnce: true})

    act(() => {
      capturedIOCallback?.(
        [{isIntersecting: true, target: element} as unknown as IntersectionObserverEntry],
        {} as IntersectionObserver,
      )
    })
    expect(result.current.animationState).toBe('visible')

    act(() => {
      capturedIOCallback?.(
        [{isIntersecting: false, target: element} as unknown as IntersectionObserverEntry],
        {} as IntersectionObserver,
      )
    })
    // Should remain visible — not exit when triggerOnce is true
    expect(result.current.animationState).toBe('visible')
    element.remove()
  })

  it('should disconnect IO on unmount', () => {
    const {unmount, element} = renderWithElement()
    unmount()
    expect(ioDisconnect).toHaveBeenCalled()
    element.remove()
  })

  it('should immediately trigger animation when IntersectionObserver is not supported', () => {
    // Remove IO to simulate unsupported browser
    Reflect.deleteProperty(window, 'IntersectionObserver')

    const element = document.createElement('div')
    document.body.append(element)

    const {result, rerender} = renderHook(
      (opts: Parameters<typeof useScrollAnimation>[0]) => useScrollAnimation(opts),
      {initialProps: {threshold: 0.1}},
    )
    ;(result.current.ref as {current: HTMLElement}).current = element
    rerender({threshold: 0.15})

    act(() => {
      vi.advanceTimersByTime(10)
    })

    expect(result.current.animationState).toBe('visible')
    element.remove()
    // Restore
    vi.stubGlobal('IntersectionObserver', BehaviouralIO)
  })
})
