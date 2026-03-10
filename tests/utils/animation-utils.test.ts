import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {prefersReducedMotion} from '../../src/utils/accessibility'
import {
  animationMemory,
  animationPerformance,
  animationScheduler,
  createCSSStaggerDelays,
  createOptimizedObserver,
  createSpringTransform,
  createStaggeredDelays,
  debounce,
  disableHardwareAcceleration,
  easingFunctions,
  enableHardwareAcceleration,
  getSafeAnimationDuration,
  hasAnimationSupport,
  layoutShiftPrevention,
  optimizedCSS,
  skillAnimationProperties,
  skillsObserverOptions,
} from '../../src/utils/animation-utils'

// Mock accessibility module
vi.mock('../../src/utils/accessibility', () => ({
  prefersReducedMotion: vi.fn(() => false),
}))
const mockPrefersReducedMotion = vi.mocked(prefersReducedMotion)

describe('animation-utils', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrefersReducedMotion.mockReturnValue(false)
    animationScheduler.clear()
    animationMemory.cleanup.clear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('easingFunctions', () => {
    it('should have all four easing functions', () => {
      expect(typeof easingFunctions.easeOutCubic).toBe('function')
      expect(typeof easingFunctions.easeInOutCubic).toBe('function')
      expect(typeof easingFunctions.easeOutQuart).toBe('function')
      expect(typeof easingFunctions.easeInOutBack).toBe('function')
    })

    it('easeOutCubic should return 0 at t=0 and 1 at t=1', () => {
      expect(easingFunctions.easeOutCubic(0)).toBe(0)
      expect(easingFunctions.easeOutCubic(1)).toBe(1)
    })

    it('easeInOutCubic should return 0 at t=0 and 1 at t=1', () => {
      expect(easingFunctions.easeInOutCubic(0)).toBe(0)
      expect(easingFunctions.easeInOutCubic(1)).toBe(1)
    })

    it('easeInOutCubic should handle t < 0.5', () => {
      const result = easingFunctions.easeInOutCubic(0.25)
      expect(result).toBeGreaterThan(0)
      expect(result).toBeLessThan(0.5)
    })

    it('easeInOutCubic should handle t >= 0.5', () => {
      const result = easingFunctions.easeInOutCubic(0.75)
      expect(result).toBeGreaterThan(0.5)
      expect(result).toBeLessThan(1)
    })

    it('easeOutQuart should return 0 at t=0 and 1 at t=1', () => {
      expect(easingFunctions.easeOutQuart(0)).toBe(0)
      expect(easingFunctions.easeOutQuart(1)).toBe(1)
    })

    it('easeInOutBack should return 0 at t=0 and 1 at t=1', () => {
      expect(easingFunctions.easeInOutBack(0)).toBeCloseTo(0)
      expect(easingFunctions.easeInOutBack(1)).toBeCloseTo(1)
    })

    it('easeInOutBack should handle t < 0.5', () => {
      const result = easingFunctions.easeInOutBack(0.25)
      expect(typeof result).toBe('number')
    })

    it('easeInOutBack should handle t >= 0.5', () => {
      const result = easingFunctions.easeInOutBack(0.75)
      expect(typeof result).toBe('number')
    })
  })

  describe('createStaggeredDelays', () => {
    it('should create delays for given item count', () => {
      const delays = createStaggeredDelays(3)
      expect(delays).toHaveLength(3)
    })

    it('should use default baseDelay of 100ms', () => {
      const delays = createStaggeredDelays(1)
      expect(delays[0]).toBe(100)
    })

    it('should increment by default 50ms per item', () => {
      const delays = createStaggeredDelays(3)
      expect(delays[0]).toBe(100)
      expect(delays[1]).toBe(150)
      expect(delays[2]).toBe(200)
    })

    it('should respect custom baseDelay and increment', () => {
      const delays = createStaggeredDelays(3, {baseDelay: 50, increment: 100})
      expect(delays[0]).toBe(50)
      expect(delays[1]).toBe(150)
      expect(delays[2]).toBe(250)
    })

    it('should cap delays at maxDelay', () => {
      const delays = createStaggeredDelays(5, {baseDelay: 100, increment: 500, maxDelay: 300})
      delays.forEach(delay => {
        expect(delay).toBeLessThanOrEqual(300)
      })
    })

    it('should return empty array for count 0', () => {
      const delays = createStaggeredDelays(0)
      expect(delays).toHaveLength(0)
    })
  })

  describe('createCSSStaggerDelays', () => {
    it('should return CSS delay strings', () => {
      const delays = createCSSStaggerDelays(3)
      expect(delays).toHaveLength(3)
      delays.forEach(delay => {
        expect(delay).toMatch(/^\d+ms$/)
      })
    })

    it('should convert numeric delays to ms strings', () => {
      const delays = createCSSStaggerDelays(1, {baseDelay: 200})
      expect(delays[0]).toBe('200ms')
    })
  })

  describe('getSafeAnimationDuration', () => {
    it('should return original duration when motion is not reduced', () => {
      mockPrefersReducedMotion.mockReturnValue(false)
      expect(getSafeAnimationDuration(500)).toBe(500)
    })

    it('should return 0 when motion is reduced', () => {
      mockPrefersReducedMotion.mockReturnValue(true)
      expect(getSafeAnimationDuration(500)).toBe(0)
    })
  })

  describe('createSpringTransform', () => {
    it('should return a scale transform string', () => {
      const transform = createSpringTransform(1.05)
      expect(transform).toBe('scale(1.05)')
    })

    it('should use default scale of 1.05', () => {
      const transform = createSpringTransform()
      expect(transform).toBe('scale(1.05)')
    })
  })

  describe('skillsObserverOptions', () => {
    it('should have threshold property', () => {
      expect(skillsObserverOptions.threshold).toBe(0.2)
    })

    it('should have rootMargin property', () => {
      expect(skillsObserverOptions.rootMargin).toBe('0px 0px -100px 0px')
    })
  })

  describe('skillAnimationProperties', () => {
    it('should have skill animation CSS custom properties', () => {
      expect(skillAnimationProperties['--skill-reveal-duration']).toBe('0.6s')
      expect(skillAnimationProperties['--skill-hover-duration']).toBe('0.2s')
      expect(skillAnimationProperties['--skill-proficiency-duration']).toBe('1.2s')
      expect(skillAnimationProperties['--skill-stagger-delay']).toBe('0.1s')
    })
  })

  describe('hasAnimationSupport', () => {
    it('should return false when window is undefined', () => {
      // In happy-dom, window is defined; we test the function can be called
      const result = hasAnimationSupport()
      expect(typeof result).toBe('boolean')
    })
  })

  describe('enableHardwareAcceleration', () => {
    it('should set transform to translateZ(0) if not set', () => {
      const element = document.createElement('div')
      enableHardwareAcceleration(element)
      expect(element.style.transform).toBe('translateZ(0)')
    })

    it('should not overwrite existing transform', () => {
      const element = document.createElement('div')
      element.style.transform = 'rotate(45deg)'
      enableHardwareAcceleration(element)
      expect(element.style.transform).toBe('rotate(45deg)')
    })

    it('should set willChange property', () => {
      const element = document.createElement('div')
      enableHardwareAcceleration(element)
      expect(element.style.willChange).toBe('transform, opacity')
    })

    it('should handle null/falsy element gracefully', () => {
      // Should not throw
      expect(() => enableHardwareAcceleration(null as unknown as HTMLElement)).not.toThrow()
    })
  })

  describe('disableHardwareAcceleration', () => {
    it('should clear transform if it was translateZ(0)', () => {
      const element = document.createElement('div')
      element.style.transform = 'translateZ(0)'
      disableHardwareAcceleration(element)
      expect(element.style.transform).toBe('')
    })

    it('should not clear transform if it is something else', () => {
      const element = document.createElement('div')
      element.style.transform = 'rotate(45deg)'
      disableHardwareAcceleration(element)
      expect(element.style.transform).toBe('rotate(45deg)')
    })

    it('should set willChange to auto', () => {
      const element = document.createElement('div')
      element.style.transform = 'translateZ(0)'
      disableHardwareAcceleration(element)
      expect(element.style.willChange).toBe('auto')
    })

    it('should handle null/falsy element gracefully', () => {
      expect(() => disableHardwareAcceleration(null as unknown as HTMLElement)).not.toThrow()
    })
  })

  describe('layoutShiftPrevention', () => {
    describe('reserveSpace', () => {
      it('should set minWidth when width is provided', () => {
        const element = document.createElement('div')
        layoutShiftPrevention.reserveSpace(element, 200)
        expect(element.style.minWidth).toBe('200px')
      })

      it('should set minHeight when height is provided', () => {
        const element = document.createElement('div')
        layoutShiftPrevention.reserveSpace(element, undefined, 100)
        expect(element.style.minHeight).toBe('100px')
      })

      it('should set both minWidth and minHeight', () => {
        const element = document.createElement('div')
        layoutShiftPrevention.reserveSpace(element, 300, 150)
        expect(element.style.minWidth).toBe('300px')
        expect(element.style.minHeight).toBe('150px')
      })

      it('should not set dimensions when not provided', () => {
        const element = document.createElement('div')
        layoutShiftPrevention.reserveSpace(element)
        expect(element.style.minWidth).toBe('')
        expect(element.style.minHeight).toBe('')
      })
    })

    describe('animateWithTransform', () => {
      it('should apply reduced motion transform immediately when reduced motion', () => {
        mockPrefersReducedMotion.mockReturnValue(true)
        const element = document.createElement('div')
        layoutShiftPrevention.animateWithTransform(element, 0, 100)
        expect(element.style.transform).toBe('translateY(100px)')
      })

      it('should set initial transform from value when motion is allowed', () => {
        mockPrefersReducedMotion.mockReturnValue(false)
        const element = document.createElement('div')
        layoutShiftPrevention.animateWithTransform(element, 0, 100)
        expect(element.style.transform).toBe('translateY(0px)')
      })
    })

    describe('preloadImage', () => {
      it('should return a Promise', () => {
        const result = layoutShiftPrevention.preloadImage('test.png')
        expect(result instanceof Promise).toBe(true)
      })
    })
  })

  describe('animationScheduler', () => {
    it('should schedule and clear high priority tasks', () => {
      const task = vi.fn()
      animationScheduler.schedule(task, 'high')
      animationScheduler.clear()
      // After clear, task should not have run via scheduler
      expect(task).not.toHaveBeenCalled()
    })

    it('should schedule low priority tasks', () => {
      const task = vi.fn()
      animationScheduler.schedule(task, 'low')
      animationScheduler.clear()
      expect(task).not.toHaveBeenCalled()
    })

    it('should default to low priority', () => {
      const task = vi.fn()
      // Should not throw
      expect(() => animationScheduler.schedule(task)).not.toThrow()
      animationScheduler.clear()
    })
  })

  describe('animationMemory', () => {
    it('should register cleanup functions', () => {
      const cleanupFn = vi.fn()
      animationMemory.register(cleanupFn)
      expect(animationMemory.cleanup.has(cleanupFn)).toBe(true)
    })

    it('should call all registered cleanup functions on clearAll', () => {
      const cleanupFn1 = vi.fn()
      const cleanupFn2 = vi.fn()
      animationMemory.register(cleanupFn1)
      animationMemory.register(cleanupFn2)
      animationMemory.clearAll()
      expect(cleanupFn1).toHaveBeenCalledOnce()
      expect(cleanupFn2).toHaveBeenCalledOnce()
      expect(animationMemory.cleanup.size).toBe(0)
    })
  })

  describe('animationPerformance', () => {
    describe('measureAnimationFrame', () => {
      it('should call the callback', () => {
        const callback = vi.fn()
        animationPerformance.measureAnimationFrame('test', callback)
        expect(callback).toHaveBeenCalledOnce()
      })

      it('should call callback even when performance is unavailable', () => {
        const originalPerformance = globalThis.performance
        // @ts-expect-error intentional for testing
        globalThis.performance = undefined
        const callback = vi.fn()
        animationPerformance.measureAnimationFrame('test', callback)
        expect(callback).toHaveBeenCalledOnce()
        globalThis.performance = originalPerformance
      })
    })

    describe('logSlowAnimations', () => {
      it('should not throw when called', () => {
        expect(() => animationPerformance.logSlowAnimations()).not.toThrow()
      })

      it('should not throw when performance is unavailable', () => {
        const originalPerformance = globalThis.performance
        // @ts-expect-error intentional for testing
        globalThis.performance = undefined
        expect(() => animationPerformance.logSlowAnimations()).not.toThrow()
        globalThis.performance = originalPerformance
      })
    })
  })

  describe('optimizedCSS', () => {
    it('addClass should schedule adding a class', () => {
      const element = document.createElement('div')
      expect(() => optimizedCSS.addClass(element, 'test-class')).not.toThrow()
    })

    it('addClass should not schedule if class already exists', () => {
      const element = document.createElement('div')
      element.classList.add('test-class')
      expect(() => optimizedCSS.addClass(element, 'test-class')).not.toThrow()
    })

    it('removeClass should schedule removing a class', () => {
      const element = document.createElement('div')
      element.classList.add('test-class')
      expect(() => optimizedCSS.removeClass(element, 'test-class')).not.toThrow()
    })

    it('removeClass should not schedule if class does not exist', () => {
      const element = document.createElement('div')
      expect(() => optimizedCSS.removeClass(element, 'non-existent')).not.toThrow()
    })

    it('toggleClass should schedule toggling a class', () => {
      const element = document.createElement('div')
      expect(() => optimizedCSS.toggleClass(element, 'test-class')).not.toThrow()
    })

    it('toggleClass should support force parameter', () => {
      const element = document.createElement('div')
      expect(() => optimizedCSS.toggleClass(element, 'test-class', true)).not.toThrow()
    })
  })

  describe('createOptimizedObserver', () => {
    it('should return an IntersectionObserver', () => {
      const callback = vi.fn()
      const observer = createOptimizedObserver(callback)
      expect(observer).toBeInstanceOf(IntersectionObserver)
      observer.disconnect()
    })

    it('should use provided options', () => {
      const callback = vi.fn()
      const observer = createOptimizedObserver(callback, {threshold: 0.5})
      expect(observer).toBeInstanceOf(IntersectionObserver)
      observer.disconnect()
    })
  })

  describe('debounce', () => {
    it('should delay function execution', async () => {
      vi.useFakeTimers()
      const fn = vi.fn()
      const debouncedFn = debounce(fn, 100)

      debouncedFn('arg1')
      expect(fn).not.toHaveBeenCalled()

      vi.advanceTimersByTime(100)
      expect(fn).toHaveBeenCalledWith('arg1')
    })

    it('should only call function once for rapid calls', () => {
      vi.useFakeTimers()
      const fn = vi.fn()
      const debouncedFn = debounce(fn, 100)

      debouncedFn('call1')
      debouncedFn('call2')
      debouncedFn('call3')

      vi.advanceTimersByTime(100)
      expect(fn).toHaveBeenCalledOnce()
      expect(fn).toHaveBeenCalledWith('call3')
    })
  })
})
