import React from 'react'
import BlogPost from '../components/BlogPost'
import {useGitHub} from '../hooks/UseGitHub'
import {usePageTitle} from '../hooks/UsePageTitle'

const Blog: React.FC = () => {
  usePageTitle('Blog')
  const {blogPosts, blogLoading: loading, blogError: error} = useGitHub()

  if (loading && blogPosts.length === 0) {
    return <div>Loading...</div>
  }

  if (error && blogPosts.length === 0) {
    return <div>Error loading blog posts.</div>
  }

  return (
    <div>
      <h1>Blog</h1>
      {blogPosts.length === 0 ? (
        <p>No blog posts available.</p>
      ) : (
        blogPosts.map(post => <BlogPost key={post.id} {...post} />)
      )}
    </div>
  )
}

export default Blog
