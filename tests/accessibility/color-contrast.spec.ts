import AxeBuilder from '@axe-core/playwright'
import {expect, test, type Page} from '@playwright/test'

async function setThemeMode(page: Page, mode: 'light' | 'dark'): Promise<void> {
  await page.addInitScript(themeMode => {
    localStorage.removeItem('mrbro-dev-custom-theme')
    localStorage.setItem('mrbro-dev-theme-mode', JSON.stringify(themeMode))
  }, mode)
}

async function getColorContrastViolations(page: Page) {
  const results = await new AxeBuilder({page}).withRules(['color-contrast']).analyze()
  return results.violations.filter(violation => violation.id === 'color-contrast')
}

test.describe('Color contrast regressions', () => {
  test('home page has no color-contrast violations in light theme', async ({page}) => {
    await setThemeMode(page, 'light')
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const violations = await getColorContrastViolations(page)
    expect(violations).toEqual([])
  })

  test('home page has no color-contrast violations in dark theme', async ({page}) => {
    await setThemeMode(page, 'dark')
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const violations = await getColorContrastViolations(page)
    expect(violations).toEqual([])
  })

  test('projects error fallback has no contrast violations in dark theme', async ({page}) => {
    await setThemeMode(page, 'dark')
    await page.route('**/users/*/repos*', async route => {
      await route.fulfill({status: 500, body: JSON.stringify({message: 'forced test error'})})
    })

    await page.goto('/projects')
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading', {name: 'Error Loading Projects'})).toBeVisible()

    const violations = await getColorContrastViolations(page)
    expect(violations).toEqual([])
  })
})
