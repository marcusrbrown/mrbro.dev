import {expect, test} from '@playwright/test'

/**
 * Smoke tests that verify the deployed site's base path is set correctly.
 * These tests catch regressions where GITHUB_PAGES env var is missing from the build,
 * which would cause assets to 404 due to an incorrect base path.
 *
 * @see https://github.com/marcusrbrown/mrbro.dev/issues/11
 */

test.describe('Base Path Smoke Tests', () => {
  test('home page loads successfully', async ({page}) => {
    const response = await page.goto('/')
    expect(response?.status()).toBeLessThan(400)
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveTitle(/.+/)
  })

  test('CSS assets load without 404', async ({page}) => {
    const failedRequests: string[] = []

    page.on('response', response => {
      const url = response.url()
      if ((url.endsWith('.css') || url.includes('/assets/')) && response.status() >= 400) {
        failedRequests.push(`${response.status()} ${url}`)
      }
    })

    await page.goto('/')
    await page.waitForLoadState('networkidle')

    expect(failedRequests, `Failed asset requests: ${failedRequests.join(', ')}`).toHaveLength(0)
  })

  test('JavaScript assets load without 404', async ({page}) => {
    const failedRequests: string[] = []

    page.on('response', response => {
      const url = response.url()
      if (url.endsWith('.js') && response.status() >= 400) {
        failedRequests.push(`${response.status()} ${url}`)
      }
    })

    await page.goto('/')
    await page.waitForLoadState('networkidle')

    expect(failedRequests, `Failed JS requests: ${failedRequests.join(', ')}`).toHaveLength(0)
  })

  test('page renders visible content (not a blank page)', async ({page}) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Verify the root element has rendered content
    const rootElement = page.locator('#root')
    await expect(rootElement).toBeVisible()

    // Verify the page has meaningful text content
    const bodyText = await page.locator('body').textContent()
    expect(bodyText?.trim().length ?? 0).toBeGreaterThan(50)
  })

  test('sub-pages load successfully', async ({page}) => {
    const paths = ['/about', '/projects', '/blog']

    for (const path of paths) {
      const response = await page.goto(path)
      expect(response?.status(), `${path} should return < 400`).toBeLessThan(400)
      await page.waitForLoadState('networkidle')

      const rootElement = page.locator('#root')
      await expect(rootElement, `${path} should render content`).toBeVisible()
    }
  })

  test('navigation links use correct base path', async ({page}) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Verify all internal navigation links have correct paths (not double-slash or missing base)
    const links = await page
      .locator('nav a[href]')
      .evaluateAll(elements => elements.map(el => (el as HTMLAnchorElement).getAttribute('href') ?? ''))

    for (const href of links) {
      // Internal links (starting with /) should not have double slashes
      if (href.startsWith('/')) {
        expect(href, `Internal link should not have double slash: ${href}`).not.toMatch(/\/\//)
      }
    }
  })
})
