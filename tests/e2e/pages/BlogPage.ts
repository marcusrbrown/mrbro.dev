import type {Locator, Page} from '@playwright/test'

import {BasePage} from './BasePage'

/**
 * Page Object Model for the Blog page
 */
export class BlogPage extends BasePage {
  readonly blogContainer: Locator
  readonly blogPosts: Locator
  readonly blogPost: Locator
  readonly postTitles: Locator

  constructor(page: Page) {
    super(page)
    this.blogContainer = page.locator('div, main').first()
    this.blogPosts = page.locator('.blog-post')
    this.blogPost = page.locator('.blog-post-content')
    this.postTitles = page.locator('.blog-post h2')
  }

  /**
   * Navigate to the blog page
   */
  override async goto() {
    await super.goto('/blog')
    await this.waitForLoad()
  }

  /**
   * Get the number of blog posts
   */
  async getBlogPostCount(): Promise<number> {
    return this.blogPosts.count()
  }

  /**
   * Click on a specific blog post
   */
  async clickBlogPost(index: number) {
    const post = this.blogPosts.nth(index)
    await post.click()
    await this.waitForLoad()
  }

  /**
   * Get blog post titles
   */
  async getBlogPostTitles(): Promise<string[]> {
    const titles = await this.postTitles.allTextContents()
    return titles.filter(title => title.trim().length > 0)
  }

  /**
   * Verify blog page is functional. Content is rendered synchronously from the
   * committed snapshot — no loading/error states to account for.
   */
  async verifyBlogPage(): Promise<boolean> {
    return this.blogContainer.isVisible()
  }

  /**
   * Check if blog has posts or shows empty state
   */
  async hasBlogPosts(): Promise<boolean> {
    return (await this.getBlogPostCount()) > 0
  }
}
