import type {Locator, Page} from '@playwright/test'

import {BasePage} from './BasePage'

/**
 * Page Object Model for the individual Blog post page (`/blog/:slug`).
 */
export class BlogPostPage extends BasePage {
  readonly article: Locator
  readonly title: Locator
  readonly date: Locator
  readonly tags: Locator
  readonly body: Locator
  readonly backLink: Locator
  readonly gistLink: Locator
  readonly notFoundHeading: Locator

  constructor(page: Page) {
    super(page)
    this.article = page.locator('.blog-post-page__article')
    this.title = page.locator('.blog-post-page__title')
    this.date = page.locator('.blog-post-page__date')
    this.tags = page.locator('.blog-post-page__tag')
    this.body = page.locator('.blog-post-page__body')
    this.backLink = page.locator('.blog-post-page__back-link')
    this.gistLink = page.locator('.blog-post-page__gist-link')
    this.notFoundHeading = page.locator('.blog-post-page--not-found h1')
  }

  /**
   * Navigate to a specific post by slug.
   */
  async gotoSlug(slug: string) {
    await super.goto(`/blog/${slug}`)
    await this.waitForLoad()
  }

  /**
   * Whether the not-found state is showing (unknown slug).
   */
  async isNotFound(): Promise<boolean> {
    return this.notFoundHeading.isVisible()
  }

  /**
   * Get the rendered post title text.
   */
  async getTitle(): Promise<string> {
    return (await this.title.textContent())?.trim() ?? ''
  }
}
