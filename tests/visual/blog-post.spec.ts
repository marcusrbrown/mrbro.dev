/**
 * Visual regression tests for the blog post page (`/blog/:slug`), the blog
 * not-found state, and the blog empty state.
 *
 * Screenshots are captured as artifacts for manual review (see README.md) —
 * not compared via `toMatchSnapshot()`. Baselines are generated on first CI run
 * via the `visual-regression` job in `.github/workflows/e2e-tests.yaml`.
 */

import {test} from '@playwright/test'

import {preparePageForVisualTest, waitForComponentStable, type ThemeMode} from './utils'

const THEMES: ThemeMode[] = ['light', 'dark']
const VIEWPORTS = [
  {name: 'mobile', width: 375, height: 667},
  {name: 'desktop', width: 1440, height: 900},
] as const

test.describe('Blog Post Page', () => {
  VIEWPORTS.forEach(({name: vpName, width, height}) => {
    THEMES.forEach(theme => {
      test(`Blog post - ${theme} theme (${vpName})`, async ({page}) => {
        await page.setViewportSize({width, height})
        await page.goto('/blog/welcome-to-the-blog')
        await preparePageForVisualTest(page, {theme, skipMocking: true})
        await waitForComponentStable(page, '.blog-post-page__article')

        await page.screenshot({
          path: `tests/visual/screenshots/blog-post-${theme}-theme-${vpName}.png`,
          fullPage: true,
          animations: 'disabled',
        })
      })
    })
  })
})

test.describe('Blog Post Not Found', () => {
  VIEWPORTS.forEach(({name: vpName, width, height}) => {
    THEMES.forEach(theme => {
      test(`Blog not-found - ${theme} theme (${vpName})`, async ({page}) => {
        await page.setViewportSize({width, height})
        await page.goto('/blog/this-slug-does-not-exist')
        await preparePageForVisualTest(page, {theme, skipMocking: true})
        await waitForComponentStable(page, '.blog-post-page--not-found')

        await page.screenshot({
          path: `tests/visual/screenshots/blog-not-found-${theme}-theme-${vpName}.png`,
          fullPage: true,
          animations: 'disabled',
        })
      })
    })
  })
})
