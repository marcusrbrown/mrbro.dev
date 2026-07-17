import type {BlogPostMeta} from '../types'
import React from 'react'
import {Link} from 'react-router-dom'

const BlogPost: React.FC<BlogPostMeta> = ({slug, title, date, summary, tags}) => {
  return (
    <article className="blog-post">
      <h2 className="blog-post__title">
        <Link to={`/blog/${slug}`}>{title}</Link>
      </h2>
      <time className="blog-post__date" dateTime={date}>
        {date}
      </time>
      <p className="blog-post__summary">{summary}</p>
      {tags && tags.length > 0 && (
        <ul className="blog-post__tags" aria-label="Tags">
          {tags.map(tag => (
            <li key={tag} className="blog-post__tag">
              {tag}
            </li>
          ))}
        </ul>
      )}
      <Link className="blog-post__read-more" to={`/blog/${slug}`}>
        Read more
      </Link>
    </article>
  )
}

export default BlogPost
