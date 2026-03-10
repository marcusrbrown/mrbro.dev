/**
 * Visual regression tests for code syntax highlighting.
 * Tests real CodeBlock components rendered on the About page.
 */

import {test} from '@playwright/test'

import {preparePageForVisualTest, setThemeMode, waitForComponentStable, type ThemeMode} from './utils'

const THEMES: ThemeMode[] = ['light', 'dark']

test.describe('Syntax Highlighting', () => {
  test.beforeEach(async ({page}) => {
    await page.goto('/about')
  })

  THEMES.forEach(theme => {
    test(`Code block - ${theme} theme`, async ({page}) => {
      await preparePageForVisualTest(page, {theme})
      await waitForComponentStable(page, '.code-block')

      const codeBlock = page.locator('.code-block').first()
      await codeBlock.screenshot({
        path: `tests/visual/screenshots/syntax-typescript-${theme}-theme.png`,
        animations: 'disabled',
      })
    })
  })

  test('Theme switching preserves code block', async ({page}) => {
    await preparePageForVisualTest(page, {theme: 'light'})
    await waitForComponentStable(page, '.code-block')

    const codeBlock = page.locator('.code-block').first()
    await codeBlock.screenshot({
      path: 'tests/visual/screenshots/syntax-theme-transition-before.png',
      animations: 'disabled',
    })

    await setThemeMode(page, 'dark')
    await page.waitForTimeout(300)

    await codeBlock.screenshot({
      path: 'tests/visual/screenshots/syntax-theme-transition-after.png',
      animations: 'disabled',
    })
  })
})
