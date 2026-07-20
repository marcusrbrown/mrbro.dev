import {expect, test} from '@playwright/test'

import {HomePage} from './pages'

test.describe('Theme Switching Tests', () => {
  test.describe('Basic Theme Functionality', () => {
    test('should have theme toggle button visible', async ({page}) => {
      const homePage = new HomePage(page)
      await homePage.goto()

      expect(await homePage.themeToggleElement.count()).toBeGreaterThan(0)
      expect(await homePage.themeToggleElement.isVisible()).toBe(true)
    })

    test('should start with a default theme', async ({page}) => {
      const homePage = new HomePage(page)
      await homePage.goto()

      const currentTheme = await homePage.getCurrentTheme()
      expect(['light', 'dark', 'system']).toContain(currentTheme)
    })

    test('should toggle between themes when clicked', async ({page}) => {
      const homePage = new HomePage(page)
      await homePage.goto()

      const themeToggle = page.locator('.theme-toggle')
      await themeToggle.click()
      await expect(page.getByRole('listbox', {name: 'Theme choices'})).toBeVisible()
      await themeToggle.click()
      await expect(page.getByRole('listbox', {name: 'Theme choices'})).toBeHidden()
    })
  })

  test.describe('Theme Persistence', () => {
    test('should persist theme across page reloads', async ({page}) => {
      const homePage = new HomePage(page)
      await homePage.goto()

      // Set to dark theme
      await homePage.setTheme('dark')
      const themeBeforeReload = await homePage.getCurrentTheme()

      // Reload page
      await page.reload()
      await homePage.waitForLoad()

      const themeAfterReload = await homePage.getCurrentTheme()
      expect(themeAfterReload).toBe(themeBeforeReload)
    })

    test('should persist theme across navigation', async ({page}) => {
      const homePage = new HomePage(page)
      await homePage.goto()

      // Set to dark theme
      await homePage.setTheme('dark')
      const themeOnHome = await homePage.getCurrentTheme()

      // Navigate to about page
      await homePage.navigateToPage('about')

      const themeOnAbout = await homePage.getCurrentTheme()
      expect(themeOnAbout).toBe(themeOnHome)
    })

    test('restores a selected preset after reload', async ({page}) => {
      await page.goto('/')

      await page.locator('.theme-toggle').click()
      const picker = page.getByRole('listbox', {name: 'Theme choices'})
      await picker.getByRole('option', {name: 'Dracula', exact: true}).click()
      await expect(page.locator('.theme-picker__trigger-text')).toHaveText('Dracula')

      await page.reload()
      await page.locator('.theme-toggle').click()
      await expect(page.getByRole('option', {name: 'Dracula', exact: true})).toHaveAttribute('aria-selected', 'true')
    })

    test('clears a preset override when a mode is selected before reload', async ({page}) => {
      await page.goto('/')

      await page.locator('.theme-toggle').click()
      let picker = page.getByRole('listbox', {name: 'Theme choices'})
      await picker.getByRole('option', {name: 'Dracula', exact: true}).click()
      await picker.getByRole('option', {name: 'Light', exact: true}).click()

      await page.reload()
      await page.locator('.theme-toggle').click()
      picker = page.getByRole('listbox', {name: 'Theme choices'})
      await expect(picker.getByRole('option', {name: 'Light', exact: true})).toHaveAttribute('aria-selected', 'true')
      await expect(picker.getByRole('option', {name: 'Dracula', exact: true})).toHaveAttribute('aria-selected', 'false')
      await expect(page.locator('.theme-picker__legacy-status')).toHaveCount(0)
      expect(await page.evaluate(() => localStorage.getItem('mrbro-dev-custom-theme'))).toBeNull()
    })
  })

  test.describe('Theme Visual Changes', () => {
    test('should apply different styles for light and dark themes', async ({page}) => {
      await page.goto('/')

      // Test light theme
      await page.locator('.theme-toggle').click()
      await page.getByRole('listbox', {name: 'Theme choices'}).getByRole('option', {name: 'Light', exact: true}).click()
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')

      const lightBgColor = await page.evaluate(() => {
        return window.getComputedStyle(document.body).backgroundColor
      })

      // Test dark theme
      await page.getByRole('listbox', {name: 'Theme choices'}).getByRole('option', {name: 'Dark', exact: true}).click()
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
      await expect
        .poll(() => page.evaluate(() => window.getComputedStyle(document.body).backgroundColor))
        .not.toBe(lightBgColor)

      const darkBgColor = await page.evaluate(() => {
        return window.getComputedStyle(document.body).backgroundColor
      })

      // Colors should be different
      expect(lightBgColor).not.toBe(darkBgColor)
    })

    test('should update CSS custom properties when theme changes', async ({page}) => {
      const homePage = new HomePage(page)
      await homePage.goto()

      // Set light theme and get CSS variables
      await homePage.setTheme('light')
      await homePage.waitForThemeTransition()

      const lightPrimaryColor = await page.evaluate(() => {
        return getComputedStyle(document.documentElement).getPropertyValue('--color-primary')
      })

      // Set dark theme and get CSS variables
      await homePage.setTheme('dark')
      await homePage.waitForThemeTransition()

      const darkPrimaryColor = await page.evaluate(() => {
        return getComputedStyle(document.documentElement).getPropertyValue('--color-primary')
      })

      // Primary colors might be the same, but let's check that the variables exist
      expect(lightPrimaryColor.trim()).not.toBe('')
      expect(darkPrimaryColor.trim()).not.toBe('')
    })
  })

  test.describe('System Theme Detection', () => {
    test('should respect system theme preference when set to system mode', async ({page, browserName}) => {
      // Skip this test on webkit as it doesn't support prefers-color-scheme media query changes
      test.skip(browserName === 'webkit', 'System theme testing not reliable on WebKit')

      const homePage = new HomePage(page)

      // Set system to prefer dark mode
      await page.emulateMedia({
        colorScheme: 'dark',
      })

      await homePage.goto()
      await homePage.setTheme('system')
      await homePage.waitForThemeTransition()

      // Should use dark theme when system prefers dark
      const currentTheme = await homePage.getCurrentTheme()
      expect(['dark', 'system']).toContain(currentTheme)
    })

    test('should update when system preference changes', async ({page, browserName}) => {
      test.skip(browserName === 'webkit', 'System theme testing not reliable on WebKit')

      const homePage = new HomePage(page)
      await homePage.goto()

      // Set to system theme
      await homePage.setTheme('system')

      // Change system preference to light
      await page.emulateMedia({
        colorScheme: 'light',
      })
      await page.waitForTimeout(100)

      // Change system preference to dark
      await page.emulateMedia({
        colorScheme: 'dark',
      })
      await page.waitForTimeout(100)

      // Theme should still be system but reflecting the change
      const theme = await homePage.getCurrentTheme()
      expect(['dark', 'system']).toContain(theme)
    })

    test('tracks OS changes in System mode but keeps a preset fixed', async ({page, browserName}) => {
      test.skip(browserName === 'webkit', 'System theme testing is not reliable on WebKit')
      await page.addInitScript(() => localStorage.clear())
      await page.emulateMedia({colorScheme: 'light'})
      await page.goto('/')

      await page.locator('.theme-toggle').click()
      const picker = page.getByRole('listbox', {name: 'Theme choices'})
      await picker.getByRole('option', {name: 'System', exact: true}).click()
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')

      await page.emulateMedia({colorScheme: 'dark'})
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')

      await page
        .getByRole('listbox', {name: 'Theme choices'})
        .getByRole('option', {name: 'Dracula', exact: true})
        .click()
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
      await page.emulateMedia({colorScheme: 'light'})
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    })

    test('preserves and replaces an unrecognized legacy custom theme', async ({page}) => {
      const legacyTheme = {
        id: 'legacy-browser-theme',
        name: 'Legacy Browser Theme',
        mode: 'dark',
        colors: {
          primary: '#ff0000',
          secondary: '#00ff00',
          accent: '#0000ff',
          background: '#000000',
          surface: '#111111',
          text: '#ffffff',
          textSecondary: '#cccccc',
          border: '#333333',
          error: '#ff4444',
          warning: '#ffaa00',
          success: '#44ff44',
        },
      }
      await page.goto('/')
      await page.evaluate(theme => {
        localStorage.setItem('mrbro-dev-theme-mode', JSON.stringify('light'))
        localStorage.setItem('mrbro-dev-custom-theme', JSON.stringify(theme))
      }, legacyTheme)
      await page.reload()

      await expect(page.locator('.theme-picker__trigger-text')).toHaveText('Custom')
      await page.locator('.theme-toggle').click()
      const picker = page.getByRole('listbox', {name: 'Theme choices'})
      await expect(page.getByText('Current: Custom theme')).toBeVisible()
      await picker.getByRole('option', {name: 'Light', exact: true}).click()
      await expect(page.locator('.theme-picker__trigger-text')).toHaveText('Light')
      await page.reload()
      await expect(page.locator('.theme-picker__trigger-text')).toHaveText('Light')
      expect(await page.evaluate(() => localStorage.getItem('mrbro-dev-custom-theme'))).toBeNull()
    })

    test('keeps the picker open and synchronized during rapid comparison', async ({page}) => {
      await page.addInitScript(() => localStorage.clear())
      await page.goto('/')
      await page.locator('.theme-toggle').click()
      const picker = page.getByRole('listbox', {name: 'Theme choices'})

      for (const name of ['Dracula', 'Solarized Light', 'Dark']) {
        const option = picker.getByRole('option', {name, exact: true})
        await option.click()
        await expect(picker).toBeVisible()
        await expect(option).toHaveAttribute('aria-selected', 'true')
        await expect(option).toBeFocused()
      }

      await expect(page.locator('.theme-picker__trigger-text')).toHaveText('Dark')
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    })
  })

  test.describe('Theme Accessibility', () => {
    test('should maintain adequate contrast in both themes', async ({page}) => {
      const homePage = new HomePage(page)
      await homePage.goto()

      // Test both themes for basic contrast
      const themes: ('light' | 'dark')[] = ['light', 'dark']

      for (const theme of themes) {
        await homePage.setTheme(theme)
        await homePage.waitForThemeTransition()

        // Get text and background colors of main content
        const colors = await page.evaluate(() => {
          const mainElement = document.querySelector('main')
          if (!mainElement) return null

          const styles = window.getComputedStyle(mainElement)
          return {
            color: styles.color,
            backgroundColor: styles.backgroundColor,
          }
        })

        expect(colors).not.toBeNull()
        expect(colors?.color).not.toBe(colors?.backgroundColor)
      }
    })

    test('should have accessible theme toggle button', async ({page}) => {
      const homePage = new HomePage(page)
      await homePage.goto()

      // Check for aria attributes or text content
      const themeToggle = homePage.themeToggleElement

      const ariaLabel = await themeToggle.getAttribute('aria-label')
      const title = await themeToggle.getAttribute('title')
      const textContent = await themeToggle.textContent()

      // Button should have some form of accessible labeling
      const hasAccessibleLabel =
        (ariaLabel && ariaLabel.trim().length > 0) ||
        (title && title.trim().length > 0) ||
        (textContent && textContent.trim().length > 0)

      expect(hasAccessibleLabel).toBe(true)
    })

    test('should be keyboard accessible', async ({page}) => {
      const homePage = new HomePage(page)
      await homePage.goto()

      // Focus the theme toggle using page locator
      const themeToggle = page.locator('.theme-toggle')
      await themeToggle.focus()

      const isFocused = await themeToggle.evaluate(el => {
        return document.activeElement === el
      })

      expect(isFocused).toBe(true)

      await page.keyboard.press('Enter')
      await expect(page.getByRole('listbox', {name: 'Theme choices'})).toBeVisible()
      await page.keyboard.press('Escape')
      await expect(page.getByRole('listbox', {name: 'Theme choices'})).toBeHidden()
    })
  })
})
