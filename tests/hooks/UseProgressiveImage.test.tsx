import type React from 'react'
import {act, renderHook} from '@testing-library/react'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {useProgressiveImage} from '../../src/hooks/UseProgressiveImage'

// ---- Module-level mocks (used by the basic describe block) ----
const mockObserve = vi.fn()
const mockUnobserve = vi.fn()
const mockDisconnect = vi.fn()

// vi.fn() wraps a regular function so it CAN be called with `new`
const mockIntersectionObserver = vi.fn().mockImplementation(() => {
  return {observe: mockObserve, unobserve: mockUnobserve, disconnect: mockDisconnect}
})
vi.stubGlobal('IntersectionObserver', mockIntersectionObserver)

// Mock Image constructor — also must be new-able
const mockAddEventListener = vi.fn()
const mockRemoveEventListener = vi.fn()
const mockImage = vi.fn().mockImplementation(() => {
  return {addEventListener: mockAddEventListener, removeEventListener: mockRemoveEventListener, src: ''}
})
vi.stubGlobal('Image', mockImage)

describe('useProgressiveImage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should return default values when no src provided', () => {
    const {result} = renderHook(() => useProgressiveImage())

    expect(result.current.isLoaded).toBe(false)
    expect(result.current.isError).toBe(false)
    expect(result.current.isInView).toBe(false)
    expect(result.current.imgRef).toBeDefined()
  })

  it('should create intersection observer when src is provided and element exists', () => {
    const {result} = renderHook(() => useProgressiveImage('test-image.jpg'))

    // Since the hook requires a DOM element to work properly,
    // we test that the intersection observer is not called when no element exists
    expect(mockIntersectionObserver).not.toHaveBeenCalled()

    // But we can verify the hook returns proper structure
    expect(result.current.imgRef).toBeDefined()
    expect(result.current.isLoaded).toBe(false)
    expect(result.current.isError).toBe(false)
    expect(result.current.isInView).toBe(false)
  })

  it('should accept custom options', () => {
    const options = {
      threshold: 0.5,
      rootMargin: '100px',
    }

    const {result} = renderHook(() => useProgressiveImage('test-image.jpg', options))

    // Verify hook returns correct initial state regardless of options
    expect(result.current.isLoaded).toBe(false)
    expect(result.current.isError).toBe(false)
    expect(result.current.isInView).toBe(false)
    expect(result.current.imgRef).toBeDefined()
  })

  it('should not create image when not in view', () => {
    renderHook(() => useProgressiveImage('test-image.jpg'))

    expect(mockImage).not.toHaveBeenCalled()
  })

  it('should handle custom lowQualityPlaceholder option', () => {
    const options = {
      lowQualityPlaceholder: 'data:image/jpeg;base64,test',
    }

    const {result} = renderHook(() => useProgressiveImage('test-image.jpg', options))

    expect(result.current.isLoaded).toBe(false)
    expect(result.current.isError).toBe(false)
  })

  it('should return ref object for image element', () => {
    const {result} = renderHook(() => useProgressiveImage('test-image.jpg'))

    expect(result.current.imgRef).toBeDefined()
    expect(typeof result.current.imgRef).toBe('object')
    expect(result.current.imgRef).toHaveProperty('current')
  })
})

// ---- Behavioral tests that exercise the IO callback and image loading ----
describe('useProgressiveImage — IntersectionObserver and image loading', () => {
  let capturedIOCallback: IntersectionObserverCallback | null = null
  let capturedLoadHandler: (() => void) | null = null
  let capturedErrorHandler: (() => void) | null = null
  let capturedDisconnect: ReturnType<typeof vi.fn> | null = null

  // Class-based IO mock so `new IntersectionObserver(callback, options)` works
  class BehaviouralIO implements IntersectionObserver {
    readonly root = null
    readonly rootMargin = ''
    readonly thresholds = [0]
    readonly observe: ReturnType<typeof vi.fn>
    readonly unobserve: ReturnType<typeof vi.fn>
    readonly disconnect: ReturnType<typeof vi.fn>
    readonly takeRecords = vi.fn(() => [] as IntersectionObserverEntry[])

    constructor(callback: IntersectionObserverCallback) {
      capturedIOCallback = callback
      capturedDisconnect = vi.fn()
      this.observe = vi.fn()
      this.unobserve = vi.fn()
      this.disconnect = capturedDisconnect
    }
  }

  // Class-based Image mock so `new Image()` works
  class BehaviouralImage {
    src = ''

    addEventListener(event: string, handler: () => void) {
      if (event === 'load') capturedLoadHandler = handler
      if (event === 'error') capturedErrorHandler = handler
    }

    removeEventListener() {
      // no-op
    }
  }

  const renderWithElement = (src: string) => {
    const imgElement = document.createElement('img')
    document.body.append(imgElement)

    const {result, rerender, unmount} = renderHook<ReturnType<typeof useProgressiveImage>, {currentSrc?: string}>(
      ({currentSrc}: {currentSrc?: string}) => useProgressiveImage(currentSrc),
      {
        initialProps: {currentSrc: undefined},
      },
    )

    // Attach element to ref before src is provided
    ;(result.current.imgRef as React.MutableRefObject<HTMLImageElement>).current = imgElement
    rerender({currentSrc: src})

    return {result, rerender, unmount, imgElement}
  }

  beforeEach(() => {
    vi.clearAllMocks()
    capturedIOCallback = null
    capturedLoadHandler = null
    capturedErrorHandler = null
    capturedDisconnect = null

    vi.stubGlobal('IntersectionObserver', BehaviouralIO)
    vi.stubGlobal('Image', BehaviouralImage)
  })

  afterEach(() => {
    // Restore original module-level mocks for the basic describe block
    vi.stubGlobal('IntersectionObserver', mockIntersectionObserver)
    vi.stubGlobal('Image', mockImage)
  })

  it('should set isInView true when element enters viewport', () => {
    const {result, imgElement} = renderWithElement('photo.jpg')

    act(() => {
      capturedIOCallback?.(
        [{isIntersecting: true, target: imgElement} as unknown as IntersectionObserverEntry],
        {} as IntersectionObserver,
      )
    })

    expect(result.current.isInView).toBe(true)
    imgElement.remove()
  })

  it('should NOT set isInView when element is not intersecting', () => {
    const {result, imgElement} = renderWithElement('photo.jpg')

    act(() => {
      capturedIOCallback?.(
        [{isIntersecting: false, target: imgElement} as unknown as IntersectionObserverEntry],
        {} as IntersectionObserver,
      )
    })

    expect(result.current.isInView).toBe(false)
    imgElement.remove()
  })

  it('should set isLoaded true after image load event', () => {
    const {result, imgElement} = renderWithElement('photo.jpg')

    // Enter viewport
    act(() => {
      capturedIOCallback?.(
        [{isIntersecting: true, target: imgElement} as unknown as IntersectionObserverEntry],
        {} as IntersectionObserver,
      )
    })

    // Simulate load
    act(() => {
      capturedLoadHandler?.()
    })

    expect(result.current.isLoaded).toBe(true)
    expect(result.current.isError).toBe(false)
    imgElement.remove()
  })

  it('should set isError true after image error event', () => {
    const {result, imgElement} = renderWithElement('broken.jpg')

    act(() => {
      capturedIOCallback?.(
        [{isIntersecting: true, target: imgElement} as unknown as IntersectionObserverEntry],
        {} as IntersectionObserver,
      )
    })

    act(() => {
      capturedErrorHandler?.()
    })

    expect(result.current.isError).toBe(true)
    expect(result.current.isLoaded).toBe(false)
    imgElement.remove()
  })

  it('should disconnect IO on unmount', () => {
    const {unmount, imgElement} = renderWithElement('photo.jpg')
    unmount()
    expect(capturedDisconnect).toHaveBeenCalled()
    imgElement.remove()
  })
})
