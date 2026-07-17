# Blog System

## Source Format

Public gists containing Markdown with YAML frontmatter are candidates. Required fields:

```md
---
title: Example post
date: 2026-07-17
summary: A short description of the post.
slug: example-post
tags: [typescript, react]
source: post.md
---

Post content.
```

`slug`, `tags`, and `source` are optional. If a gist contains multiple `.md` files, `source` must name the file to publish.

## Publish

```bash
gh gist create --public post.md --desc "Post title"
gh workflow run blog-refresh.yaml --ref main
gh run watch
```

The refresh writes `src/data/blog-snapshot.json`. A successful snapshot commit pushes to `main` and triggers deploy. Builds prerender `dist/blog/<slug>/index.html`, `dist/feed.xml`, and `dist/sitemap.xml`.

## Verify

1. Check the workflow result and inspect the snapshot diff.
2. Open `https://mrbro.dev/blog/<slug>`.
3. Open `https://mrbro.dev/feed.xml` and confirm the post is present.

## Failure Modes

| Condition | Result |
| --- | --- |
| Gist fetch failure | Existing snapshot is preserved; refresh exits non-zero |
| Invalid new candidate | Candidate is excluded with a warning; existing snapshot remains publishable |
| Previously published post becomes invalid | Existing snapshot is preserved; refresh fails non-zero |

## Removal

Delete the gist or remove its publishable frontmatter. On the next successful refresh, the post is dropped from the snapshot and generated pages, feed, and sitemap.
