// mrbro.dev/src/components/BlogEmptyState.tsx

import type {FC} from 'react'

interface BlogEmptyStateProps {
  /** Link to the author's gists profile or another feed to point visitors at. */
  gistsUrl?: string
}

/**
 * Designed empty state for the blog index when the snapshot has zero posts.
 * Never renders a bare `<p>` — icon + friendly copy + a link out.
 */
export const BlogEmptyState: FC<BlogEmptyStateProps> = ({gistsUrl = 'https://gist.github.com/marcusrbrown'}) => {
  return (
    <div className="blog-empty-state" role="status">
      <svg
        className="blog-empty-state__icon"
        width="48"
        height="48"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M4 4h16v16H4z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M8 9h8M8 13h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <h2 className="blog-empty-state__title">No posts yet</h2>
      <p className="blog-empty-state__copy">
        Nothing curated for the blog just yet. In the meantime, take a look at what&apos;s brewing on the gists feed.
      </p>
      <a className="blog-empty-state__link" href={gistsUrl} target="_blank" rel="noopener noreferrer">
        View gists on GitHub
      </a>
    </div>
  )
}

export default BlogEmptyState
