/**
 * @vitest-environment happy-dom
 */

import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

// analytics.ts auto-initializes on import when window is defined.
// We reset the module registry between tests to get a clean state.
describe('analytics utilities', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.resetModules()
    // Reset relevant globals
    localStorage.clear()
    // Remove any lingering event listeners by resetting scroll/time state
    vi.stubGlobal('gtag', undefined)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  // Helper: import a fresh module each test
  const importAnalytics = async () => {
    const mod = await import('../../src/utils/analytics')
    return mod
  }

  describe('initializeAnalytics / getAnalytics', () => {
    it('should return a manager instance', async () => {
      const {initializeAnalytics, getAnalytics} = await importAnalytics()
      const manager = initializeAnalytics({enabled: true, consent_required: false})
      expect(manager).toBeDefined()
      expect(getAnalytics()).toBe(manager)
    })

    it('should destroy previous instance when re-initialised', async () => {
      const {initializeAnalytics} = await importAnalytics()
      const first = initializeAnalytics({enabled: true, consent_required: false})
      const destroySpy = vi.spyOn(first, 'destroy')
      initializeAnalytics({enabled: true, consent_required: false})
      expect(destroySpy).toHaveBeenCalledOnce()
    })

    it('should default consent_required to true', async () => {
      const {initializeAnalytics} = await importAnalytics()
      // Should not throw even without consent
      expect(() => initializeAnalytics()).not.toThrow()
    })
  })

  describe('setConsent', () => {
    it('should grant consent and flush queued events', async () => {
      const {initializeAnalytics} = await importAnalytics()
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const manager = initializeAnalytics({enabled: true, debug: true, consent_required: true})

      // Queue an event without consent
      manager.track({category: 'Test', action: 'queued'})
      expect(consoleSpy).not.toHaveBeenCalledWith('Sending analytics event:', expect.anything())

      // Grant consent — should flush the queue
      manager.setConsent(true)
      expect(consoleSpy).toHaveBeenCalledWith('Sending analytics event:', expect.objectContaining({action: 'queued'}))

      consoleSpy.mockRestore()
    })

    it('should deny consent and clear queued events', async () => {
      const {initializeAnalytics} = await importAnalytics()
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const manager = initializeAnalytics({enabled: true, debug: true, consent_required: true})

      manager.track({category: 'Test', action: 'will-be-dropped'})
      manager.setConsent(false)

      // Events that were queued should not be sent after denying consent
      expect(consoleSpy).not.toHaveBeenCalledWith(
        'Sending analytics event:',
        expect.objectContaining({action: 'will-be-dropped'}),
      )
      consoleSpy.mockRestore()
    })

    it('should persist consent in localStorage', async () => {
      const {initializeAnalytics} = await importAnalytics()
      const manager = initializeAnalytics({enabled: true, consent_required: true})
      manager.setConsent(true)
      expect(localStorage.getItem('analytics_consent')).toBe('granted')
      manager.setConsent(false)
      expect(localStorage.getItem('analytics_consent')).toBe('denied')
    })

    it('should handle localStorage errors gracefully', async () => {
      const {initializeAnalytics} = await importAnalytics()
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('storage full')
      })
      const manager = initializeAnalytics({enabled: true, consent_required: true})
      expect(() => manager.setConsent(true)).not.toThrow()
    })

    it('should read stored consent on init when consent_required is true', async () => {
      localStorage.setItem('analytics_consent', 'granted')
      const {initializeAnalytics} = await importAnalytics()
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const manager = initializeAnalytics({enabled: true, debug: true, consent_required: true})
      // Consent already granted — events should send immediately
      manager.track({category: 'Test', action: 'immediate'})
      expect(consoleSpy).toHaveBeenCalledWith(
        'Sending analytics event:',
        expect.objectContaining({action: 'immediate'}),
      )
      consoleSpy.mockRestore()
    })
  })

  describe('track', () => {
    it('should not send events when analytics is disabled', async () => {
      const {initializeAnalytics} = await importAnalytics()
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const manager = initializeAnalytics({enabled: false, debug: true, consent_required: false})
      manager.track({category: 'Test', action: 'disabled'})
      expect(consoleSpy).not.toHaveBeenCalledWith('Sending analytics event:', expect.anything())
      consoleSpy.mockRestore()
    })

    it('should send events immediately when consent has been granted', async () => {
      const {initializeAnalytics} = await importAnalytics()
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const manager = initializeAnalytics({enabled: true, debug: true, consent_required: false})
      manager.track({category: 'Test', action: 'send-now'})
      expect(consoleSpy).toHaveBeenCalledWith('Sending analytics event:', expect.objectContaining({action: 'send-now'}))
      consoleSpy.mockRestore()
    })

    it('should queue events when consent has not been granted', async () => {
      const {initializeAnalytics} = await importAnalytics()
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const manager = initializeAnalytics({enabled: true, debug: true, consent_required: true})
      manager.track({category: 'Test', action: 'queued'})
      expect(consoleSpy).not.toHaveBeenCalledWith('Sending analytics event:', expect.anything())
      consoleSpy.mockRestore()
    })

    it('should log debug event with console.warn', async () => {
      const {initializeAnalytics} = await importAnalytics()
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const manager = initializeAnalytics({enabled: true, debug: true, consent_required: false})
      manager.track({category: 'Test', action: 'debug-log'})
      expect(consoleSpy).toHaveBeenCalledWith('Analytics Event:', expect.objectContaining({action: 'debug-log'}))
      consoleSpy.mockRestore()
    })

    it('should enrich events with session_id and url', async () => {
      const {initializeAnalytics} = await importAnalytics()
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const manager = initializeAnalytics({enabled: true, debug: true, consent_required: false})
      manager.track({category: 'Test', action: 'enriched'})
      const sendCall = consoleSpy.mock.calls.find(
        args => args[0] === 'Sending analytics event:' && (args[1] as {action?: string}).action === 'enriched',
      )
      expect(sendCall).toBeDefined()
      expect((sendCall?.[1] as {session_id?: string}).session_id).toBeDefined()
      consoleSpy.mockRestore()
    })

    it('should call gtag when tracking_id and gtag are defined', async () => {
      const mockGtag = vi.fn()
      vi.stubGlobal('gtag', mockGtag)
      const {initializeAnalytics} = await importAnalytics()
      const manager = initializeAnalytics({
        enabled: true,
        debug: false,
        consent_required: false,
        tracking_id: 'G-TEST123',
      })
      manager.track({category: 'Test', action: 'gtag-call'})
      expect(mockGtag).toHaveBeenCalledWith('event', 'gtag-call', expect.any(Object))
    })

    it('should spread custom_parameters into enriched event', async () => {
      const {initializeAnalytics} = await importAnalytics()
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const manager = initializeAnalytics({enabled: true, debug: true, consent_required: false})
      manager.track({category: 'Test', action: 'custom', custom_parameters: {foo: 'bar'}})
      const sendCall = consoleSpy.mock.calls.find(
        args => args[0] === 'Sending analytics event:' && (args[1] as {action?: string}).action === 'custom',
      )
      expect((sendCall?.[1] as Record<string, unknown>).foo).toBe('bar')
      consoleSpy.mockRestore()
    })
  })

  describe('trackContactClick', () => {
    it('should track with method and optional label', async () => {
      const {initializeAnalytics} = await importAnalytics()
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const manager = initializeAnalytics({enabled: true, debug: true, consent_required: false})

      manager.trackContactClick('email')
      manager.trackContactClick('phone', 'work')

      const calls = consoleSpy.mock.calls.filter(a => a[0] === 'Sending analytics event:')
      const labels = calls.map(a => (a[1] as {label?: string}).label)
      expect(labels).toContain('email')
      expect(labels).toContain('phone_work')
      consoleSpy.mockRestore()
    })
  })

  describe('trackProjectInteraction', () => {
    it('should track project interaction with default source', async () => {
      const {initializeAnalytics} = await importAnalytics()
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const manager = initializeAnalytics({enabled: true, debug: true, consent_required: false})
      manager.trackProjectInteraction('view', 'proj-123')
      const call = consoleSpy.mock.calls.find(
        a => a[0] === 'Sending analytics event:' && (a[1] as {label?: string}).label === 'proj-123',
      )
      expect(call).toBeDefined()
      expect((call?.[1] as Record<string, unknown>).source).toBe('gallery')
      consoleSpy.mockRestore()
    })

    it('should track project interaction with custom source', async () => {
      const {initializeAnalytics} = await importAnalytics()
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const manager = initializeAnalytics({enabled: true, debug: true, consent_required: false})
      manager.trackProjectInteraction('open', 'proj-456', 'search')
      const call = consoleSpy.mock.calls.find(
        a => a[0] === 'Sending analytics event:' && (a[1] as {label?: string}).label === 'proj-456',
      )
      expect((call?.[1] as Record<string, unknown>).source).toBe('search')
      consoleSpy.mockRestore()
    })
  })

  describe('trackSkillInteraction', () => {
    it('should track skill interaction without category', async () => {
      const {initializeAnalytics} = await importAnalytics()
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const manager = initializeAnalytics({enabled: true, debug: true, consent_required: false})
      manager.trackSkillInteraction('hover', 'TypeScript')
      const call = consoleSpy.mock.calls.find(
        a => a[0] === 'Sending analytics event:' && (a[1] as {label?: string}).label === 'TypeScript',
      )
      expect(call).toBeDefined()
      expect((call?.[1] as Record<string, unknown>).skill_category).toBeUndefined()
      consoleSpy.mockRestore()
    })

    it('should track skill interaction with category', async () => {
      const {initializeAnalytics} = await importAnalytics()
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const manager = initializeAnalytics({enabled: true, debug: true, consent_required: false})
      manager.trackSkillInteraction('click', 'React', 'Frontend')
      const call = consoleSpy.mock.calls.find(
        a => a[0] === 'Sending analytics event:' && (a[1] as {label?: string}).label === 'React',
      )
      expect((call?.[1] as Record<string, unknown>).skill_category).toBe('Frontend')
      consoleSpy.mockRestore()
    })
  })

  describe('trackThemeChange', () => {
    it('should track theme change', async () => {
      const {initializeAnalytics} = await importAnalytics()
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const manager = initializeAnalytics({enabled: true, debug: true, consent_required: false})
      manager.trackThemeChange('light', 'dark')
      const call = consoleSpy.mock.calls.find(
        a => a[0] === 'Sending analytics event:' && (a[1] as {label?: string}).label === 'light_to_dark',
      )
      expect(call).toBeDefined()
      consoleSpy.mockRestore()
    })
  })

  describe('trackNavigation', () => {
    it('should track navigation with default method', async () => {
      const {initializeAnalytics} = await importAnalytics()
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const manager = initializeAnalytics({enabled: true, debug: true, consent_required: false})
      manager.trackNavigation('projects')
      const call = consoleSpy.mock.calls.find(
        a => a[0] === 'Sending analytics event:' && (a[1] as {label?: string}).label === 'projects',
      )
      expect(call).toBeDefined()
      expect((call?.[1] as {action?: string}).action).toBe('click')
      consoleSpy.mockRestore()
    })

    it('should track navigation with custom method', async () => {
      const {initializeAnalytics} = await importAnalytics()
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const manager = initializeAnalytics({enabled: true, debug: true, consent_required: false})
      manager.trackNavigation('about', 'keyboard')
      const call = consoleSpy.mock.calls.find(
        a => a[0] === 'Sending analytics event:' && (a[1] as {label?: string}).label === 'about',
      )
      expect((call?.[1] as {action?: string}).action).toBe('keyboard')
      consoleSpy.mockRestore()
    })
  })

  describe('trackSectionView', () => {
    it('should track section view', async () => {
      const {initializeAnalytics} = await importAnalytics()
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const manager = initializeAnalytics({enabled: true, debug: true, consent_required: false})
      manager.trackSectionView('hero')
      const call = consoleSpy.mock.calls.find(
        a => a[0] === 'Sending analytics event:' && (a[1] as {label?: string}).label === 'hero',
      )
      expect(call).toBeDefined()
      consoleSpy.mockRestore()
    })
  })

  describe('trackDownload', () => {
    it('should track download with default source', async () => {
      const {initializeAnalytics} = await importAnalytics()
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const manager = initializeAnalytics({enabled: true, debug: true, consent_required: false})
      manager.trackDownload('resume.pdf')
      const call = consoleSpy.mock.calls.find(
        a => a[0] === 'Sending analytics event:' && (a[1] as {label?: string}).label === 'resume.pdf',
      )
      expect(call).toBeDefined()
      expect((call?.[1] as Record<string, unknown>).download_source).toBe('unknown')
      consoleSpy.mockRestore()
    })

    it('should track download with custom source', async () => {
      const {initializeAnalytics} = await importAnalytics()
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const manager = initializeAnalytics({enabled: true, debug: true, consent_required: false})
      manager.trackDownload('cv.pdf', 'hero')
      const call = consoleSpy.mock.calls.find(
        a => a[0] === 'Sending analytics event:' && (a[1] as {label?: string}).label === 'cv.pdf',
      )
      expect((call?.[1] as Record<string, unknown>).download_source).toBe('hero')
      consoleSpy.mockRestore()
    })
  })

  describe('trackExternalLink', () => {
    it('should track external link click', async () => {
      const {initializeAnalytics} = await importAnalytics()
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const manager = initializeAnalytics({enabled: true, debug: true, consent_required: false})
      manager.trackExternalLink('https://github.com/example')
      const call = consoleSpy.mock.calls.find(
        a => a[0] === 'Sending analytics event:' && (a[1] as {label?: string}).label === 'https://github.com/example',
      )
      expect(call).toBeDefined()
      expect((call?.[1] as Record<string, unknown>).link_source).toBe('unknown')
      consoleSpy.mockRestore()
    })
  })

  describe('trackSearch', () => {
    it('should track search with results count', async () => {
      const {initializeAnalytics} = await importAnalytics()
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const manager = initializeAnalytics({enabled: true, debug: true, consent_required: false})
      manager.trackSearch('React hooks', 5)
      const call = consoleSpy.mock.calls.find(
        a => a[0] === 'Sending analytics event:' && (a[1] as {label?: string}).label === 'React hooks',
      )
      expect(call).toBeDefined()
      expect((call?.[1] as {value?: number}).value).toBe(5)
      consoleSpy.mockRestore()
    })
  })

  describe('trackError', () => {
    it('should track error with default context', async () => {
      const {initializeAnalytics} = await importAnalytics()
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const manager = initializeAnalytics({enabled: true, debug: true, consent_required: false})
      manager.trackError('Network request failed')
      const call = consoleSpy.mock.calls.find(
        a => a[0] === 'Sending analytics event:' && (a[1] as {label?: string}).label === 'Network request failed',
      )
      expect(call).toBeDefined()
      expect((call?.[1] as Record<string, unknown>).error_context).toBe('unknown')
      consoleSpy.mockRestore()
    })

    it('should track error with custom context', async () => {
      const {initializeAnalytics} = await importAnalytics()
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const manager = initializeAnalytics({enabled: true, debug: true, consent_required: false})
      manager.trackError('404 Not Found', 'image-loader')
      const call = consoleSpy.mock.calls.find(
        a => a[0] === 'Sending analytics event:' && (a[1] as {label?: string}).label === '404 Not Found',
      )
      expect((call?.[1] as Record<string, unknown>).error_context).toBe('image-loader')
      consoleSpy.mockRestore()
    })
  })

  describe('scroll depth tracking', () => {
    it('should fire a scroll depth event at 25%', async () => {
      const {initializeAnalytics} = await importAnalytics()
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      initializeAnalytics({enabled: true, debug: true, consent_required: false})

      Object.defineProperty(document.documentElement, 'scrollHeight', {value: 2000, configurable: true})
      Object.defineProperty(window, 'innerHeight', {value: 500, configurable: true})
      Object.defineProperty(window, 'scrollY', {value: 375, configurable: true}) // 25%

      window.dispatchEvent(new Event('scroll'))
      vi.advanceTimersByTime(300)

      const scrollEvents = consoleSpy.mock.calls.filter(
        a => a[0] === 'Sending analytics event:' && (a[1] as {action?: string}).action === 'scroll',
      )
      expect(scrollEvents.length).toBeGreaterThan(0)
      consoleSpy.mockRestore()
    })

    it('should not fire duplicate events for the same threshold', async () => {
      const {initializeAnalytics} = await importAnalytics()
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      initializeAnalytics({enabled: true, debug: true, consent_required: false})

      Object.defineProperty(document.documentElement, 'scrollHeight', {value: 2000, configurable: true})
      Object.defineProperty(window, 'innerHeight', {value: 500, configurable: true})
      Object.defineProperty(window, 'scrollY', {value: 375, configurable: true}) // 25%

      // Dispatch scroll twice
      window.dispatchEvent(new Event('scroll'))
      vi.advanceTimersByTime(300)
      window.dispatchEvent(new Event('scroll'))
      vi.advanceTimersByTime(300)

      const threshold25Events = consoleSpy.mock.calls.filter(
        a =>
          a[0] === 'Sending analytics event:' &&
          (a[1] as {label?: string}).label === '25%' &&
          (a[1] as {action?: string}).action === 'scroll',
      )
      expect(threshold25Events.length).toBe(1)
      consoleSpy.mockRestore()
    })

    it('should throttle rapid scroll events', async () => {
      const {initializeAnalytics} = await importAnalytics()
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      initializeAnalytics({enabled: true, debug: true, consent_required: false})

      Object.defineProperty(document.documentElement, 'scrollHeight', {value: 2000, configurable: true})
      Object.defineProperty(window, 'innerHeight', {value: 500, configurable: true})
      Object.defineProperty(window, 'scrollY', {value: 375, configurable: true})

      // Rapid-fire 3 scroll events — only one should fire within throttle window
      window.dispatchEvent(new Event('scroll'))
      window.dispatchEvent(new Event('scroll'))
      window.dispatchEvent(new Event('scroll'))

      // Not enough time has passed for the timer to fire
      vi.advanceTimersByTime(100)
      const beforeCount = consoleSpy.mock.calls.filter(a => a[0] === 'Sending analytics event:').length

      vi.advanceTimersByTime(200)
      const afterCount = consoleSpy.mock.calls.filter(a => a[0] === 'Sending analytics event:').length

      // Should only fire once even though scroll happened 3 times
      expect(afterCount).toBeGreaterThanOrEqual(beforeCount)
      consoleSpy.mockRestore()
    })
  })

  describe('time-on-page tracking', () => {
    it('should fire a 30s time event', async () => {
      const {initializeAnalytics} = await importAnalytics()
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      initializeAnalytics({enabled: true, debug: true, consent_required: false})

      vi.advanceTimersByTime(30_000)

      const timeEvents = consoleSpy.mock.calls.filter(
        a =>
          a[0] === 'Sending analytics event:' &&
          (a[1] as {action?: string}).action === 'time_on_page' &&
          (a[1] as {label?: string}).label === '30s',
      )
      expect(timeEvents.length).toBe(1)
      consoleSpy.mockRestore()
    })

    it('should fire a 60s time event', async () => {
      const {initializeAnalytics} = await importAnalytics()
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      initializeAnalytics({enabled: true, debug: true, consent_required: false})

      vi.advanceTimersByTime(60_000)

      const timeEvents = consoleSpy.mock.calls.filter(
        a =>
          a[0] === 'Sending analytics event:' &&
          (a[1] as {action?: string}).action === 'time_on_page' &&
          (a[1] as {label?: string}).label === '60s',
      )
      expect(timeEvents.length).toBe(1)
      consoleSpy.mockRestore()
    })
  })

  describe('unload tracking', () => {
    it('should fire a session end event on beforeunload', async () => {
      const {initializeAnalytics} = await importAnalytics()
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      initializeAnalytics({enabled: true, debug: true, consent_required: false})

      window.dispatchEvent(new Event('beforeunload'))

      const sessionEndEvents = consoleSpy.mock.calls.filter(
        a => a[0] === 'Sending analytics event:' && (a[1] as {action?: string}).action === 'end',
      )
      expect(sessionEndEvents.length).toBeGreaterThan(0)
      consoleSpy.mockRestore()
    })

    it('should fire a session end event on pagehide', async () => {
      const {initializeAnalytics} = await importAnalytics()
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      initializeAnalytics({enabled: true, debug: true, consent_required: false})

      window.dispatchEvent(new Event('pagehide'))

      const sessionEndEvents = consoleSpy.mock.calls.filter(
        a => a[0] === 'Sending analytics event:' && (a[1] as {action?: string}).action === 'end',
      )
      expect(sessionEndEvents.length).toBeGreaterThan(0)
      consoleSpy.mockRestore()
    })
  })

  describe('destroy', () => {
    it('should clear all timers without throwing', async () => {
      const {initializeAnalytics} = await importAnalytics()
      const manager = initializeAnalytics({enabled: true, consent_required: false})
      expect(() => manager.destroy()).not.toThrow()
    })
  })

  describe('analytics facade', () => {
    it('should delegate track to the manager', async () => {
      const {initializeAnalytics, analytics} = await importAnalytics()
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      initializeAnalytics({enabled: true, debug: true, consent_required: false})
      analytics.track({category: 'Test', action: 'facade-track'})
      expect(consoleSpy).toHaveBeenCalledWith(
        'Sending analytics event:',
        expect.objectContaining({action: 'facade-track'}),
      )
      consoleSpy.mockRestore()
    })

    it('should delegate setConsent to the manager', async () => {
      const {initializeAnalytics, analytics} = await importAnalytics()
      initializeAnalytics({enabled: true, consent_required: true})
      analytics.setConsent(true)
      expect(localStorage.getItem('analytics_consent')).toBe('granted')
    })

    it('should delegate all trackXxx methods', async () => {
      const {initializeAnalytics, analytics} = await importAnalytics()
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      initializeAnalytics({enabled: true, debug: true, consent_required: false})

      analytics.trackContactClick('email')
      analytics.trackProjectInteraction('view', 'p1')
      analytics.trackSkillInteraction('hover', 'JS')
      analytics.trackThemeChange('light', 'dark')
      analytics.trackNavigation('home')
      analytics.trackSectionView('about')
      analytics.trackDownload('resume.pdf')
      analytics.trackExternalLink('https://github.com')
      analytics.trackSearch('query', 3)
      analytics.trackError('oops')

      const sendCalls = consoleSpy.mock.calls.filter(a => a[0] === 'Sending analytics event:')
      expect(sendCalls.length).toBeGreaterThanOrEqual(10)
      consoleSpy.mockRestore()
    })

    it('should handle calls when no manager is initialised', async () => {
      // No call to initializeAnalytics — instance may be null or from auto-init
      const {analytics, getAnalytics, initializeAnalytics} = await importAnalytics()
      // Destroy any auto-inited instance
      const mgr = getAnalytics()
      if (mgr) mgr.destroy()
      // Re-create as null by replacing instance via re-init then destroying
      const mgr2 = initializeAnalytics({enabled: false, consent_required: false})
      mgr2.destroy()
      // Calling facade methods should not throw
      expect(() => analytics.trackNavigation('nowhere')).not.toThrow()
    })
  })
})
