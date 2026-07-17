// mrbro.dev/src/pages/BlogPostPage.tsx

import React from 'react'
import {Link, useParams} from 'react-router-dom'
import {useBlogPosts} from '../hooks/UseBlogPosts'
import {usePageTitle} from '../hooks/UsePageTitle'

const BlogPostPage: React.FC = () => {
  const {slug} = useParams<{slug: string}>()
  const {getPostBySlug} = useBlogPosts()
  const post = slug ? getPostBySlug(slug) : undefined

  usePageTitle(post ? post.frontmatter.title : 'Post not found')

  if (!post) {
    return (
      <div className="blog-post-page blog-post-page--not-found">
        <div className="container">
          <h1>Post not found</h1>
          <p>We couldn&apos;t find a blog post at this address. It may have been moved or never existed.</p>
          <Link className="blog-post-page__back-link" to="/blog">
            &larr; Back to Blog
          </Link>
        </div>
      </div>
    )
  }

  const {frontmatter, html, gistUrl} = post

  return (
    <div className="blog-post-page">
      <div className="container">
        <Link className="blog-post-page__back-link" to="/blog">
          &larr; Back to Blog
        </Link>
        <article className="blog-post-page__article">
          <header className="blog-post-page__header">
            <h1 className="blog-post-page__title">{frontmatter.title}</h1>
            <time className="blog-post-page__date" dateTime={frontmatter.date}>
              {frontmatter.date}
            </time>
            {frontmatter.tags && frontmatter.tags.length > 0 && (
              <ul className="blog-post-page__tags" aria-label="Tags">
                {frontmatter.tags.map(tag => (
                  <li key={tag} className="blog-post-page__tag">
                    {tag}
                  </li>
                ))}
              </ul>
            )}
          </header>
          {/* eslint-disable-next-line @eslint-react/dom/no-dangerously-set-innerhtml -- HTML is sanitized
              at build time by the refresh script (rehype-sanitize) before being committed to the
              snapshot; see CodeBlock.tsx for the equivalent precedent with Shiki-rendered markup. */}
          <div className="blog-post-page__body" dangerouslySetInnerHTML={{__html: html}} />
        </article>
        <a className="blog-post-page__gist-link" href={gistUrl} target="_blank" rel="noopener noreferrer">
          View on GitHub
        </a>
      </div>
    </div>
  )
}

export default BlogPostPage
