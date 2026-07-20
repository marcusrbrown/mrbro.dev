import type {Locator, Page} from '@playwright/test'
import {expect} from '@playwright/test'

/**
 * Base page class that provides common functionality for all pages
 * Implements shared navigation, theme switching, and utility methods
 */
export class BasePage {
  protected page: Page
  protected header: Locator
  protected footer: Locator
  protected main: Locator
  protected themeToggle: Locator
  protected mainContent: Locator

  constructor(page: Page) {
    this.page = page
    this.header = page.locator('header.header')
    this.footer = page.locator('footer')
    this.main = page.locator('main')
    this.themeToggle = page.locator('.theme-toggle')
    this.mainContent = page.locator('main, .home-page, .about-page, .projects-page, .blog-page')
  }

  /**
   * Navigate to a specific path
   */
  async goto(path = '/') {
    await this.page.goto(path)
  }

  /**
   * Wait for the page to be fully loaded
   */
  async waitForLoad() {
    await this.page.waitForLoadState('networkidle')
  }

  /**
   * Get the current theme mode from the data attribute
   */
  async getCurrentTheme(): Promise<string> {
    return (await this.page.getAttribute('html', 'data-theme')) || 'light'
  }

  /**
   * Get the theme toggle locator for direct access in tests
   */
  get themeToggleElement(): Locator {
    return this.themeToggle
  }

  /**
   * Open the theme picker overlay via its trigger, if not already open.
   * Uses the stable `.theme-toggle` compatibility selector and its
   * accessible `aria-haspopup="listbox"` role.
   */
  async openThemePicker(): Promise<Locator> {
    const isExpanded = (await this.themeToggle.getAttribute('aria-expanded')) === 'true'
    if (!isExpanded) {
      await this.themeToggle.click()
    }
    const listbox = this.page.getByRole('listbox', {name: 'Theme choices'})
    await listbox.waitFor({state: 'visible'})
    return listbox
  }

  /**
   * Close the theme picker overlay, if currently open.
   */
  async closeThemePicker() {
    const isExpanded = (await this.themeToggle.getAttribute('aria-expanded')) === 'true'
    if (isExpanded) {
      await this.themeToggle.click()
      await this.page.getByRole('listbox', {name: 'Theme choices'}).waitFor({state: 'hidden'})
    }
  }

  /**
   * Select a theme mode (System, Light, or Dark) from the theme picker listbox.
   *
   * Opens the picker via its trigger, selects the exact matching option, and
   * asserts the option becomes selected. For 'light'/'dark' this also waits
   * for the resolved `html[data-theme]` attribute to match. For 'system' the
   * resolved theme tracks OS preference, so only the selected option state is
   * asserted — a resolved light/dark value does not confirm system mode.
   */
  async setTheme(theme: 'light' | 'dark' | 'system') {
    const optionName = theme.charAt(0).toUpperCase() + theme.slice(1)
    const listbox = await this.openThemePicker()
    const option = listbox.getByRole('option', {name: optionName, exact: true})

    await option.click()
    await expect(option).toHaveAttribute('aria-selected', 'true')

    if (theme === 'light' || theme === 'dark') {
      await expect(this.page.locator('html')).toHaveAttribute('data-theme', theme)
    }
  }

  /**
   * Check if the header navigation is visible and functional
   */
  async isNavigationVisible(): Promise<boolean> {
    return this.header.isVisible()
  }

  /**
   * Navigate using the header navigation links
   */
  async navigateToPage(pageName: 'home' | 'about' | 'projects' | 'blog') {
    const navLinks = {
      home: 'Home',
      about: 'About',
      projects: 'Projects',
      blog: 'Blog',
    }

    const linkText = navLinks[pageName]

    // First try the standard navigation link
    const navLink = this.header.locator(`a:has-text("${linkText}")`)

    // Wait for the link to be visible and clickable
    await navLink.waitFor({state: 'visible', timeout: 10000})
    await navLink.click()
    await this.waitForLoad()
  }

  /**
   * Check if the page is responsive by testing viewport changes
   */
  async testResponsiveness(width: number, height: number) {
    await this.page.setViewportSize({width, height})
    await this.page.waitForTimeout(500) // Allow for CSS transitions
  }

  /**
   * Get all visible links in the navigation
   */
  async getNavigationLinks(): Promise<string[]> {
    const links = await this.header.locator('nav a').allTextContents()
    return links.filter(link => link.trim().length > 0)
  }

  /**
   * Check accessibility of the page by ensuring basic landmarks exist
   */
  async checkBasicAccessibility(): Promise<boolean> {
    const header = await this.header.count()
    const main = await this.mainContent.count()
    const footer = await this.footer.count()

    return header > 0 && main > 0 && footer > 0
  }

  /**
   * Wait for theme transition to complete
   */
  async waitForThemeTransition() {
    // Wait for CSS transitions to complete
    await this.page.waitForTimeout(300)
  }

  /**
   * Check if the page has loaded all critical resources
   */
  async verifyPageLoad(): Promise<boolean> {
    try {
      await this.waitForLoad()
      // Wait for basic page elements to be visible
      const hasHeader = await this.header.isVisible()
      const hasContent = await this.page.locator('body').isVisible()
      return hasHeader && hasContent
    } catch {
      return false
    }
  }

  /**
   * Take a screenshot for visual testing
   */
  async takeScreenshot(name: string) {
    return this.page.screenshot({
      path: `test-results/${name}.png`,
      fullPage: true,
    })
  }
}
