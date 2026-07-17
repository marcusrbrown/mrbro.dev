import React from 'react'
import BlogEmptyState from '../components/BlogEmptyState'
import BlogPost from '../components/BlogPost'
import {useBlogPosts} from '../hooks/UseBlogPosts'
import {usePageTitle} from '../hooks/UsePageTitle'

const Blog: React.FC = () => {
  usePageTitle('Blog')
  const {posts} = useBlogPosts()

  return (
    <div className="blog-page">
      <div className="container">
        <header className="blog-page__header">
          <h1>Blog</h1>
          <a className="blog-page__feed-link" href="/feed.xml">
            RSS Feed
          </a>
        </header>
        {posts.length === 0 ? (
          <BlogEmptyState />
        ) : (
          <div className="blog-list">
            {posts.map(post => (
              <BlogPost key={post.slug} {...post} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Blog
