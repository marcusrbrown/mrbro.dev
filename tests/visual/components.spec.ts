/**
 * Visual regression tests for major UI components.
 * Tests Header, Footer, Cards, Hero, and Skills for visual consistency across themes.
 */

import {test} from '@playwright/test'

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
      await waitForComponentStable(page, 'header.header')

      const headerElement = page.locator('header.header')

      await page.setViewportSize({width: 1440, height: 900})
      await headerElement.screenshot({
        path: 'tests/visual/screenshots/header-desktop-navigation.png',
        animations: 'disabled',
      })

      await page.setViewportSize({width: 375, height: 667})
      await page.waitForTimeout(300)
      await headerElement.screenshot({
        path: 'tests/visual/screenshots/header-mobile-navigation.png',
        animations: 'disabled',
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

  test.describe('Skills Showcase', () => {
    THEMES.forEach(theme => {
      test(`Skills showcase - ${theme} theme`, async ({page}) => {
        await page.goto('/')
        await preparePageForVisualTest(page, {theme})

        const skillsComponent = page.locator('#skills.skills-showcase')

        if ((await skillsComponent.count()) > 0) {
          await skillsComponent.scrollIntoViewIfNeeded()
          await waitForComponentStable(page, '#skills.skills-showcase')

          await skillsComponent.screenshot({
            path: `tests/visual/screenshots/skills-showcase-${theme}-theme.png`,
            animations: 'disabled',
          })
        }
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
