---
date: 2026-07-17
topic: first-party-blog
---

# First-Party Blog System

## Summary

Replace the raw all-gists blog feed with a curated, build-time-snapshotted blog: posts are public gists that opt in via YAML frontmatter in a Markdown file, rendered on-site at prerendered `/blog/:slug` pages with sanitized GFM, syntax highlighting, per-post meta/OG tags, and an RSS/Atom feed.

---

## Problem Frame

The Blog page currently treats every public gist from `marcusrbrown` as a blog post at runtime. The live feed mixes real writing with Keybase proofs, editor settings, logs, and scripts. Titles are raw gist descriptions (200-character paragraphs or "Untitled"), summaries are hardcoded empty, and "Read more" ejects visitors to gist.github.com. Content availability depends on unauthenticated GitHub API calls from each visitor's browser (60 req/hour/IP), and shared links carry no per-post metadata for crawlers or social cards.

An existing plan (`.ai/plan/feature-blog-system-rich-content-1.md`, 2025-07-31) assumes GitHub Issues as the content source and specs runtime MDX; production moved to gists in 2026-03, so that plan no longer describes the system it would modify. A concrete launch essay for `marcusrbrown/dev-like` is queued behind this work, and its publishing runbook currently documents the raw-gist pipeline and its limitations.

---

## Actors

- A1. Marcus (author): writes posts as public gists, controls publish timing, maintains the publishing runbook in `hq`.
- A2. Site visitor: browses `/blog`, reads posts on-site, subscribes via feed, shares links.
- A3. Build pipeline: fetches curated gists at build time, generates static pages and the feed, runs on schedule or manual dispatch.

---

## Key Flows

- F1. Publish a post
  - **Trigger:** A1 creates or edits a public gist containing a Markdown file with valid frontmatter.
  - **Actors:** A1, A3
  - **Steps:** Author finalizes the gist → next scheduled rebuild (or a manual dispatch for immediate publishing) fetches curated gists → build validates frontmatter, derives slug/title/summary/date → static post page and updated list/feed are deployed.
  - **Outcome:** Post is live at `mrbro.dev/blog/<slug>` with correct metadata; feed updated.
  - **Covered by:** R1, R2, R3, R7, R12, R13, R14

- F2. Read a post
  - **Trigger:** A2 opens `/blog` or a shared `/blog/<slug>` link directly.
  - **Actors:** A2
  - **Steps:** List page shows curated cards (title, date, summary, tags) → visitor opens a post → sanitized Markdown renders on-site with highlighted code → a secondary "View on GitHub" link points to the source gist.
  - **Outcome:** Full reading experience without leaving the site; direct loads and refreshes work on GitHub Pages.
  - **Covered by:** R4, R5, R6, R8, R9, R10

- F3. Non-post gists stay out
  - **Trigger:** A3 runs a build while the account has public gists without valid frontmatter.
  - **Actors:** A3
  - **Steps:** Build filters candidates by convention → gists without a frontmattered Markdown file are excluded → if zero posts qualify, the blog renders its designed empty state.
  - **Outcome:** Only intentional posts appear; noise never leaks into the blog.
  - **Covered by:** R1, R11

---

## Requirements

**Content source and curation**

- R1. Only public gists containing a Markdown file with valid YAML frontmatter are treated as blog posts; all other gists are excluded.
- R2. Frontmatter carries the post's metadata: title, date, and summary at minimum, with optional tags. The exact schema is documented for the author.
- R3. Every post derives a deterministic, stable, URL-safe slug; slugs do not change when a gist is edited.

**Publishing model**

- R7. Post content is fetched and snapshotted at build time; visitors never depend on runtime GitHub API calls to read the blog.
- R12. A daily scheduled rebuild picks up new/edited posts automatically; a manual dispatch path publishes on demand.
- R13. A build with an unreachable GitHub API or malformed candidate gist fails safe: it must not deploy a blog that silently drops previously published posts. New candidates with invalid frontmatter are excluded with a build warning; a previously published post whose frontmatter becomes invalid fails the build.
- R17. Intentional removals are first-class: a post whose gist is deleted (or whose frontmatter is removed) drops from the blog on the next successful build; snapshot retention exists only as fallback for failed builds.
- R18. Failed or skipped publishes surface to the author through the failed workflow run and its CI summary; a silent no-op publish is a defect.

**Reading experience**

- R4. Each post renders on-site at `/blog/<slug>` as sanitized GitHub-Flavored Markdown; unsafe HTML, scripts, and embedded content are neutralized. All frontmatter-derived strings (title, summary, tags) are treated as untrusted input and escaped in every output context: rendered cards, prerendered `<title>`/meta/OG tags, and the RSS/Atom feed.
- R5. Code blocks are syntax-highlighted using the site's existing highlighting capability without loading it on unrelated pages.
- R6. Direct navigation and refresh of `/blog/<slug>` work on GitHub Pages hosting.
- R8. List cards show bounded title, date, and summary from frontmatter; no raw gist descriptions and no "Untitled" entries. Posts are ordered reverse-chronologically by frontmatter date (not gist created/updated timestamps); ordering is stable across gist edits. Tags render as non-interactive labels on cards and post pages in v1 (tag pages are deferred).
- R9. Each post page renders a header (title, date, tags) above the body, a navigation path back to `/blog`, and a secondary link to the source gist.
- R16. Navigating to a `/blog/<slug>` that does not exist in the current snapshot shows a designed not-found state within the site shell, with a path back to `/blog`.

**Discovery and metadata**

- R10. Each post page is prerendered with unique title, description, and Open Graph tags so crawlers and social scrapers see per-post metadata.
- R14. An RSS/Atom feed is generated from the same build-time snapshot, exposed via `<link rel="alternate">` autodiscovery on blog pages and a visible link on `/blog`.

**States, launch, and accepted risk**

- R11. When zero posts qualify, the blog shows a designed empty state consistent with the site's visual system (no bare placeholder text).
- R19. Accepted risk: content publishes unattended from the author's gists; account compromise could push arbitrary content to the site within one rebuild cycle. Mitigation is upstream (GitHub account 2FA) plus detection via deploy notifications — no review gate is added.
- R15. The publishing runbook (`hq/runbooks/publish-essay-mrbro-dev.md`, external repo) is updated to document the frontmatter convention, publish triggers, and verification steps; the dev-like launch essay publishes through the new pipeline as an initial post.

---

## Acceptance Examples

- AE1. **Covers R1, R11.** Given the account's current six public gists (none with frontmatter), when the site builds, the blog renders the designed empty state and no gist appears as a post.
- AE8. **Covers R16.** Given a shared link to a post that was later removed, when a visitor opens it, the designed not-found state renders inside the site shell with a path back to `/blog`.
- AE9. **Covers R13, R17.** Given a published post whose gist is deleted, when the next scheduled build succeeds, the post is gone from the list, feed, and its slug shows the not-found state; given the same build fails at the GitHub fetch, the previous snapshot (including the post) remains live.
- AE2. **Covers R1, R2, R8.** Given a gist whose Markdown file has frontmatter `title: "I taught my agent to develop like Every"`, `date`, and `summary`, when the site rebuilds, a card appears with exactly that title and summary — not the gist description.
- AE3. **Covers R6, R10.** Given a published post, when its `/blog/<slug>` URL is opened cold (new tab, hard refresh) or fetched by a social scraper, the response is the prerendered page with that post's title/description/OG tags.
- AE4. **Covers R4.** Given a post containing `<script>` or event-handler HTML, when it renders, the markup is neutralized while normal GFM (tables, blockquotes, code fences) renders correctly.
- AE5. **Covers R4.** Given a post whose frontmatter title contains `"/><script>` or similar markup, when the site builds, the title renders inert (escaped) in cards, prerendered head tags, and the feed.
- AE6. **Covers R13.** Given GitHub is unreachable during a scheduled rebuild, when the build runs, the deploy either fails or preserves the previous snapshot — the live blog never silently loses posts.
- AE7. **Covers R12.** Given a newly frontmattered gist, when the manual dispatch is triggered, the post is live without waiting for the daily schedule.

---

## Success Criteria

- The dev-like launch essay is published via a gist and readable at `mrbro.dev/blog/<slug>` with correct social cards — no gist.github.com hop.
- Non-post gists (Keybase proof, configs, logs) never appear on the blog.
- The blog remains fully readable during GitHub API outages or rate-limiting.
- A planner can implement from this doc without inventing product behavior: source convention, publish triggers, reading surface, and failure posture are all decided here.

---

## Scope Boundaries

- Search, table of contents, categories/tag pages, reading time, prev/next navigation — deferred past v1.
- MDX or interactive post components — rejected for v1; sanitized GFM only.
- Grandfathering gists without frontmatter — rejected; strict convention from day one.
- Runtime refresh of blog content in the browser — rejected; single build-time content path.
- Comments, analytics, newsletter — out of scope.
- Migrating existing gists (adding frontmatter) is authoring work Marcus does directly, not site implementation — except as needed to publish the launch essay.

---

## Key Decisions

- Curated gists over in-repo Markdown/Issues/content repo: the author's publishing workflow (draft in `hq`, publish via `gh gist create` per the runbook) is the load-bearing rationale — posts publish without touching this repo. The frontmatter convention supplies the curation and metadata that raw gists lack.
- Frontmatter as the opt-in marker over description prefixes or marker filenames: one convention supplies both curation and rich metadata (title/date/summary/tags).
- Build-time snapshot over runtime fetch: resilience, speed, SEO, and no per-visitor rate-limit exposure; accepted cost is publish latency bounded by the rebuild schedule.
- Prerendered post pages over SPA-only meta tags: correct social cards and crawlable content are a stated goal for launch-essay sharing.
- No grandfathering: existing gists without frontmatter never appear as posts. v1 launches with the dev-like essay published through the pipeline as the initial post — v1 is not complete until the essay is live. The designed empty state (R11) covers the pre-essay build window and any future zero-post state, not the launch plan.
- RSS/Atom in v1: marginal cost is trivial once the snapshot exists; dev-audience readers expect a feed.

---

## Dependencies / Assumptions

- Supersedes `.ai/plan/feature-blog-system-rich-content-1.md` (stale: assumes GitHub Issues source and runtime MDX). Planning starts from this doc, not that plan.
- Coordinates with the in-flight GitHub feed reliability work (`src/hooks/UseGitHub.ts`): once the blog moves to build-time content, the runtime gist fetch is removed and that hook serves repositories only. The reliability work's gist handling is interim scaffolding.
- Blog page state polish (empty/loading/error states) merges into this work's surface (R11) rather than shipping separately.
- Runbook update (R15) touches the external `hq` repo — implementation must flag it as a cross-repo step, not silently skip it.
- Assumes gist edits are the correction path for published posts (bounded by rebuild schedule), consistent with current practice.
- The rebuild workflow authenticates with the ambient `GITHUB_TOKEN` (read-only gist access, existing minimal permissions posture); no PAT is introduced, and no token reaches the client bundle, `VITE_`-prefixed env vars, or logs.

---

## Outstanding Questions

### Deferred to Planning

- **Affects R3 · Technical —** Slug derivation source (filename vs frontmatter field) and collision handling.
- **Affects R7, R10 · Technical —** Prerendering mechanism within the Vite/GitHub Pages pipeline (SSG step, build-time route generation) and how the snapshot is stored/passed to the build.
- **Affects R12 · Technical —** Whether the daily rebuild reuses the existing deploy workflow with a schedule trigger or adds a dedicated content-refresh workflow; skip-deploy-when-unchanged behavior.
- **Affects R13, R17 · Technical —** Snapshot caching strategy that lets a build distinguish "GitHub unreachable" (preserve previous snapshot) from "author deleted a post" (drop per R17).
- **Affects R2 · Technical —** Exact frontmatter schema (field names, required vs optional, tag format) — validation posture is decided in R13/R18.
