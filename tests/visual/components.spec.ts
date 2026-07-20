/**
 * Visual regression tests for major UI components.
 * Tests Header, Footer, Cards, Hero, and Skills for visual consistency across themes.
 */

import {expect, test} from '@playwright/test'

import {preparePageForVisualTest, setupGitHubAPIMocking, waitForComponentStable, type ThemeMode} from './utils'

const THEMES: ThemeMode[] = ['light', 'dark']

test.describe('UI Components', () => {
  test.describe('Header', () => {
    THEMES.forEach(theme => {
      test(`Header - ${theme} theme`, async ({page}) => {
        await page.goto('/')
        await preparePageForVisualTest(page, {theme})
        await waitForComponentStable(page, 'header.header')

        const headerElement = page.locator('header.header')
        await headerElement.screenshot({
          path: `tests/visual/screenshots/header-${theme}-theme.png`,
          animations: 'disabled',
        })
      })
    })

    test('Header - navigation states', async ({page}) => {
      await page.goto('/')
      await preparePageForVisualTest(page, {theme: 'light'})

      const headerElement = page.locator('header.header')

      await page.setViewportSize({width: 1440, height: 900})
      await waitForComponentStable(page, 'header.header')
      await headerElement.screenshot({
        path: 'tests/visual/screenshots/header-desktop-navigation.png',
        animations: 'disabled',
      })

      await page.setViewportSize({width: 375, height: 667})
      await waitForComponentStable(page, 'header.header')
      await headerElement.screenshot({
        path: 'tests/visual/screenshots/header-mobile-navigation.png',
        animations: 'disabled',
      })
    })

    test.describe('Theme Picker Open', () => {
      test('Theme Picker - Layout and Stacking Regression', async ({page}) => {
        // Set headers first to completely bypass cache for every request
        await page.setExtraHTTPHeaders({
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
        })

        // --- DESKTOP VIEWPORT ---
        await page.goto('/')
        await preparePageForVisualTest(page, {theme: 'light'})
        await page.setViewportSize({width: 1440, height: 900})

        const trigger = page.locator('[data-testid="theme-toggle"]')
        await trigger.click()

        const panel = page.locator('.theme-picker__panel')
        await expect(panel).toBeVisible()

        const listbox = page.locator('#theme-picker-listbox')
        await expect(listbox).toBeVisible()

        const firstOption = page.locator('#theme-option-system')
        const lastOption = page.locator('#theme-option-tokyo-night')
        await expect(firstOption).toBeVisible()

        // Assert 1: Rendered height of panel is materially greater than one option
        const panelBox = await panel.boundingBox()
        const triggerBox = await trigger.boundingBox()
        const optionBox = await firstOption.boundingBox()

        const viewport = page.viewportSize()
        expect(panelBox).not.toBeNull()
        expect(triggerBox).not.toBeNull()
        expect(optionBox).not.toBeNull()
        expect(viewport).not.toBeNull()

        if (panelBox && optionBox && triggerBox && viewport) {
          expect(panelBox.height).toBeGreaterThan(optionBox.height * 3)
          // Assert 2: panel top >= trigger bottom plus a small gap (8px gap)
          expect(panelBox.y).toBeGreaterThanOrEqual(triggerBox.y + triggerBox.height + 4)
          // Assert 2b: alignment close to trigger right
          expect(Math.abs(panelBox.x + panelBox.width - (triggerBox.x + triggerBox.width))).toBeLessThanOrEqual(20)
        }

        // Assert 3: panel right/left/bottom remain within viewport bounds
        if (viewport && panelBox) {
          expect(panelBox.x).toBeGreaterThanOrEqual(0)
          expect(panelBox.x + panelBox.width).toBeLessThanOrEqual(viewport.width)
          expect(panelBox.y + panelBox.height).toBeLessThanOrEqual(viewport.height)
        }

        // Assert 4: elementFromPoint() at trigger center still resolves to the trigger while open (trigger not covered!)
        const isTriggerAtPoint = await page.evaluate(() => {
          const triggerEl = document.querySelector('[data-testid="theme-toggle"]') as HTMLElement
          if (!triggerEl) return false
          const box = triggerEl.getBoundingClientRect()
          const centerX = box.left + box.width / 2
          const centerY = box.top + box.height / 2
          const el = document.elementFromPoint(centerX, centerY)
          return el ? el === triggerEl || triggerEl.contains(el) : false
        })
        expect(isTriggerAtPoint).toBe(true)

        // Assert 5: panel center resolves to a picker descendant (since contain: paint and transform have been removed!)
        const elementAtCenter = await page.evaluate(() => {
          const panelEl = document.querySelector('.theme-picker__panel') as HTMLElement
          if (!panelEl) return 'no-panel'
          const box = panelEl.getBoundingClientRect()
          const centerX = box.left + box.width / 2
          const centerY = box.top + box.height / 2
          const el = document.elementFromPoint(centerX, centerY)
          return el ? `${el.tagName}.${el.className}` : 'null'
        })
        expect(
          elementAtCenter.includes('theme-picker') ||
            elementAtCenter.includes('theme-option') ||
            elementAtCenter.includes('listbox'),
        ).toBe(true)

        // --- MOBILE WRAPPED VIEWPORT ---
        // Set short height to force internal scrolling (between 160-200px)
        await page.setViewportSize({width: 375, height: 190})
        await page.waitForTimeout(100) // let coordinates recalculate

        const mobilePanelBox = await panel.boundingBox()
        const mobileTriggerBox = await trigger.boundingBox()
        const mobileViewport = page.viewportSize()

        expect(mobilePanelBox).not.toBeNull()
        expect(mobileTriggerBox).not.toBeNull()
        expect(mobileViewport).not.toBeNull()

        if (mobilePanelBox && mobileTriggerBox && mobileViewport) {
          // Since height <= 400px, the fixed side-panel fallback is active
          // Assert 6: panel is positioned at left 8px and top 8px
          expect(mobilePanelBox.x).toBeCloseTo(8, 0)
          expect(mobilePanelBox.y).toBeCloseTo(8, 0)
          // Assert 7: panel remains within viewport bounds
          expect(mobilePanelBox.y + mobilePanelBox.height).toBeLessThanOrEqual(mobileViewport.height)
          expect(mobilePanelBox.x + mobilePanelBox.width).toBeLessThanOrEqual(mobileViewport.width)
        }

        // Assert 9: mobile listbox scroll height exceeds client height (scrollable!)
        const isScrollable = await page.evaluate(() => {
          const listboxEl = document.querySelector('#theme-picker-listbox')
          if (!listboxEl) return false
          return listboxEl.scrollHeight > listboxEl.clientHeight
        })
        expect(isScrollable).toBe(true)

        expect(await lastOption.evaluate(el => el.getBoundingClientRect().height)).toBeGreaterThan(0)
      })

      test('Desktop - Default Light Open', async ({page}) => {
        await page.goto('/')
        await page.reload()
        await preparePageForVisualTest(page, {theme: 'light'})
        await page.setViewportSize({width: 1440, height: 900})

        const trigger = page.locator('[data-testid="theme-toggle"]')
        await trigger.click()
        await page.waitForSelector('.theme-picker__panel', {state: 'visible'})

        // Focus an option to show the visible focus indicator
        const lightOption = page.locator('#theme-option-light')
        await lightOption.focus()

        // Assert the listbox is visible before screenshot
        const listbox = page.locator('#theme-picker-listbox')
        await expect(listbox).toBeVisible()

        // Capture top of page including header and open panel
        await page.screenshot({
          path: 'tests/visual/screenshots/header-light-picker-open-desktop.png',
          animations: 'disabled',
          clip: {x: 0, y: 0, width: 1440, height: 400},
        })
      })

      test('Desktop - Default Dark Open', async ({page}) => {
        await page.goto('/')
        await page.reload()
        await preparePageForVisualTest(page, {theme: 'dark'})
        await page.setViewportSize({width: 1440, height: 900})

        const trigger = page.locator('[data-testid="theme-toggle"]')
        await trigger.click()
        await page.waitForSelector('.theme-picker__panel', {state: 'visible'})

        const darkOption = page.locator('#theme-option-dark')
        await darkOption.focus()

        const listbox = page.locator('#theme-picker-listbox')
        await expect(listbox).toBeVisible()

        // Capture top of page including header and open panel
        await page.screenshot({
          path: 'tests/visual/screenshots/header-dark-picker-open-desktop.png',
          animations: 'disabled',
          clip: {x: 0, y: 0, width: 1440, height: 400},
        })
      })

      test('Desktop - Dracula Preset Open', async ({page}) => {
        await page.goto('/')
        await page.reload()
        await preparePageForVisualTest(page, {theme: 'dark'})
        await page.setViewportSize({width: 1440, height: 900})

        const trigger = page.locator('[data-testid="theme-toggle"]')
        await trigger.click()
        await page.waitForSelector('.theme-picker__panel', {state: 'visible'})

        // Click Dracula option to apply it and keep the picker open
        const draculaOption = page.locator('#theme-option-dracula')
        await draculaOption.click()

        // Focus the system option to show focus indicators under Dracula's colors
        const systemOption = page.locator('#theme-option-system')
        await systemOption.focus()

        const listbox = page.locator('#theme-picker-listbox')
        await expect(listbox).toBeVisible()

        // Capture top of page including header and open panel
        await page.screenshot({
          path: 'tests/visual/screenshots/header-dracula-picker-open-desktop.png',
          animations: 'disabled',
          clip: {x: 0, y: 0, width: 1440, height: 400},
        })
      })

      test('Mobile - Short Viewport Open', async ({page}) => {
        await page.goto('/')
        await page.reload()
        await preparePageForVisualTest(page, {theme: 'light'})
        // Set short height (between 160-200px) to force internal scrolling
        const viewportHeight = 180
        await page.setViewportSize({width: 375, height: viewportHeight})

        const trigger = page.locator('[data-testid="theme-toggle"]')
        await trigger.click()
        await page.waitForSelector('.theme-picker__panel', {state: 'visible'})

        const panel = page.locator('.theme-picker__panel')
        const panelBox = await panel.boundingBox()
        const viewport = page.viewportSize()

        expect(panelBox).not.toBeNull()
        expect(viewport).not.toBeNull()

        if (panelBox && viewport) {
          // Assert 1: panel top >= 0
          expect(panelBox.y).toBeGreaterThanOrEqual(0)
          // Assert 2: panel bottom <= viewport height
          expect(panelBox.y + panelBox.height).toBeLessThanOrEqual(viewport.height)
          // Assert 3: panel left/right within viewport
          expect(panelBox.x).toBeGreaterThanOrEqual(0)
          expect(panelBox.x + panelBox.width).toBeLessThanOrEqual(viewport.width)
        }

        // Assert 4: trigger center resolves to trigger while panel open
        const isTriggerAtPoint = await page.evaluate(() => {
          const triggerEl = document.querySelector('[data-testid="theme-toggle"]') as HTMLElement
          if (!triggerEl) return false
          const box = triggerEl.getBoundingClientRect()
          const centerX = box.left + box.width / 2
          const centerY = box.top + box.height / 2
          const el = document.elementFromPoint(centerX, centerY)
          return el ? el === triggerEl || triggerEl.contains(el) : false
        })
        expect(isTriggerAtPoint).toBe(true)

        // Focus the final 'Tokyo Night' option to verify internal scrolling and panel containment
        const tokyoNightOption = page.locator('#theme-option-tokyo-night')
        await tokyoNightOption.focus()

        const listbox = page.locator('#theme-picker-listbox')
        await expect(listbox).toBeVisible()

        // Assert 5: listbox scrollHeight > clientHeight
        const isScrollable = await page.evaluate(() => {
          const listboxEl = document.querySelector('#theme-picker-listbox')
          if (!listboxEl) return false
          return listboxEl.scrollHeight > listboxEl.clientHeight
        })
        expect(isScrollable).toBe(true)

        // Assert 6: final Tokyo Night option can be focused/selected after scrolling
        const isFocused = await tokyoNightOption.evaluate(el => document.activeElement === el)
        expect(isFocused).toBe(true)

        // Capture full mobile viewport (375x180)
        await page.screenshot({
          path: 'tests/visual/screenshots/header-picker-open-mobile.png',
          animations: 'disabled',
        })
      })
    })
  })

  test.describe('Footer', () => {
    THEMES.forEach(theme => {
      test(`Footer - ${theme} theme`, async ({page}) => {
        await page.goto('/')
        await preparePageForVisualTest(page, {theme})

        await page.locator('footer.footer').scrollIntoViewIfNeeded()
        await waitForComponentStable(page, 'footer.footer')

        const footerElement = page.locator('footer.footer')
        await footerElement.screenshot({
          path: `tests/visual/screenshots/footer-${theme}-theme.png`,
          animations: 'disabled',
        })
      })
    })
  })

  test.describe('Project Cards', () => {
    test.beforeEach(async ({page}) => {
      await setupGitHubAPIMocking(page)
      await page.goto('/projects')
    })

    THEMES.forEach(theme => {
      test(`Project cards - ${theme} theme`, async ({page}) => {
        await preparePageForVisualTest(page, {theme, skipMocking: true})
        await waitForComponentStable(page, '.project-card')

        const projectGallery = page.locator('.project-gallery')
        if ((await projectGallery.count()) === 0) {
          const projectContainer = page.locator('.project-card').first()
          if ((await projectContainer.count()) > 0) {
            await projectContainer.screenshot({
              path: `tests/visual/screenshots/project-cards-${theme}-theme.png`,
              animations: 'disabled',
            })
          }
        } else {
          await projectGallery.screenshot({
            path: `tests/visual/screenshots/project-cards-${theme}-theme.png`,
            animations: 'disabled',
          })
        }
      })
    })
  })

  test.describe('Blog Posts', () => {
    test.beforeEach(async ({page}) => {
      await setupGitHubAPIMocking(page)
      await page.goto('/blog')
    })

    THEMES.forEach(theme => {
      test(`Blog page - ${theme} theme`, async ({page}) => {
        await preparePageForVisualTest(page, {theme, skipMocking: true})

        await page
          .waitForSelector('[data-testid="blog-post"], .blog-post, [class*="blog"]', {
            state: 'visible',
            timeout: 10000,
          })
          .catch(() => {
            // Blog posts might not exist yet
          })

        await page.screenshot({
          path: `tests/visual/screenshots/blog-page-${theme}-theme.png`,
          fullPage: true,
          animations: 'disabled',
        })
      })
    })
  })

  test.describe('Hero Section', () => {
    THEMES.forEach(theme => {
      test(`Hero section - ${theme} theme`, async ({page}) => {
        await page.goto('/')
        await preparePageForVisualTest(page, {theme})

        const heroSection = page.locator('#hero.hero-section')

        if ((await heroSection.count()) > 0) {
          await waitForComponentStable(page, '#hero.hero-section')

          await heroSection.screenshot({
            path: `tests/visual/screenshots/hero-section-${theme}-theme.png`,
            animations: 'disabled',
          })
        } else {
          const mainContent = page.locator('main').first()
          await mainContent.screenshot({
            path: `tests/visual/screenshots/hero-section-${theme}-theme.png`,
            animations: 'disabled',
          })
        }
      })
    })
  })
})
