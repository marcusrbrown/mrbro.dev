/**
 * @vitest-environment happy-dom
 */

import {renderHook} from '@testing-library/react'
import {afterEach, describe, expect, it} from 'vitest'
import {setPageTitle, usePageTitle} from '../../src/hooks/UsePageTitle'

describe('UsePageTitle', () => {
  const originalTitle = document.title

  afterEach(() => {
    document.title = originalTitle
  })

  describe('usePageTitle hook', () => {
    it('should set document title with title and default suffix', () => {
      renderHook(() => usePageTitle('Home'))
      expect(document.title).toBe('Home | Marcus R. Brown - Developer Portfolio & Blog')
    })

    it('should set document title with title and custom suffix', () => {
      renderHook(() => usePageTitle('About', 'My Portfolio'))
      expect(document.title).toBe('About | My Portfolio')
    })

    it('should fall back to suffix when title is empty string', () => {
      renderHook(() => usePageTitle(''))
      expect(document.title).toBe('Marcus R. Brown - Developer Portfolio & Blog')
    })

    it('should update when title changes', () => {
      let title = 'First'
      const {rerender} = renderHook(() => usePageTitle(title))
      expect(document.title).toBe('First | Marcus R. Brown - Developer Portfolio & Blog')

      title = 'Second'
      rerender()
      expect(document.title).toBe('Second | Marcus R. Brown - Developer Portfolio & Blog')
    })
  })

  describe('setPageTitle utility', () => {
    it('should set document title directly', () => {
      setPageTitle('Projects')
      expect(document.title).toBe('Projects | Marcus R. Brown - Developer Portfolio & Blog')
    })

    it('should use custom suffix', () => {
      setPageTitle('Blog', 'Dev Blog')
      expect(document.title).toBe('Blog | Dev Blog')
    })

    it('should fall back to suffix when title is empty string', () => {
      setPageTitle('')
      expect(document.title).toBe('Marcus R. Brown - Developer Portfolio & Blog')
    })
  })
})

// UseGitHub integration coverage is provided by tests/hooks/UseGitHub.test.ts and github.test.ts
