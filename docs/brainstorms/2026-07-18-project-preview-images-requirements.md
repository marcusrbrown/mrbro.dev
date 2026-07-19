---
title: Project preview images from GitHub social cards
type: requirements
status: ready
date: 2026-07-18
---

# Project preview images from GitHub social cards

## Summary

Give each project card and the project preview modal a preview image sourced from GitHub's auto-generated repository social card, fetched at build time and served from mrbro.dev rather than hotlinked at runtime. The display path already exists and is unused because the data layer supplies no image; this fills that gap with a self-hosted asset.

## Problem Frame

Project cards currently render with no preview image. The rendering is already built — `ProjectCard.tsx` and `ProjectPreviewModal.tsx` consume `imageUrl` through `useProgressiveImage` with conditional render and error handling, and `Project.imageUrl` is an optional field on the type. The only reason no image ever appears is that the repo→project transform in `src/hooks/UseGitHub.ts` hardcodes `imageUrl: undefined`.

The image content comes from GitHub's auto-generated Open Graph card (`opengraph.githubassets.com/<hash>/<owner>/<repo>`) — a per-repo social image showing name, description, stars, language, and owner avatar. Every repo has one with zero per-repo setup. Verified: the endpoint returns a valid PNG (HTTP 200).

**Delivery is build-time, not runtime.** Document review flagged that hotlinking this endpoint at render time is fragile and privacy-leaking: the endpoint is undocumented (GitHub can change or block it, silently breaking every card at once), the runtime cache-bust behavior is unproven, and every visitor's browser would fetch from GitHub, leaking visitor IPs to a third party on every page view. Fetching the card once at build time and committing it as a local asset — mirroring the existing build-time blog snapshot architecture — eliminates all three: a broken endpoint fails the build loudly instead of breaking production silently, no visitor data reaches GitHub, and freshness is controlled by the rebuild rather than an unproven URL hash.

## Requirements

- R1. Project cards and the project preview modal display each repository's GitHub-generated social card as its preview image.
- R2. Preview images are fetched at **build time** from `https://opengraph.githubassets.com/<hash>/<owner>/<repo>` (owner and repo come from the repository's `full_name`, which already carries `<owner>/<repo>` — no new project field needed) and written to a committed/served local asset under the site's own origin.
- R3. Each project's `imageUrl` points at the local self-hosted asset, not the GitHub endpoint. No third-party image request occurs in the visitor's browser.
- R4. Image freshness is controlled by the build: a rebuild re-fetches the cards, so a repo metadata change (description, stars, language) is reflected after the next build. No runtime cache-bust hash is required.
- R5. If a card fetch fails at build time, the build fails loudly (or the affected project degrades to no image with a clear build log) rather than silently shipping a broken runtime reference.
- R6. The card image area has a defined fit and reserved space: the ~2:1 landscape card renders with an explicit aspect-ratio/fit rule and a reserved image box so image load introduces no layout shift (CLS). The existing progressive-load and error-fallback path handles load and failure; a failed image degrades to the current image-less card appearance.
- R7. The preview image reads correctly in both light and dark themes — the GitHub card has a fixed light-ish background, so it is framed/contained consistently so it does not clash inside dark-theme cards.
- R8. Every repository in the curated (portfolio-tagged) feed receives a preview image via this rule.

## Key Decisions

- **Build-time fetch + self-host over runtime hotlink.** Removes a silent single-point-of-failure on an undocumented endpoint, removes the visitor-IP privacy leak (aligns with the project's data-minimization defaults), and makes runtime cache-busting unnecessary. Cost: a handful of committed image assets (~100KB each for the curated set) plus a build step — consistent with the existing build-time blog snapshot pattern.
- **GitHub auto-generated social card as the image content.** Zero per-repo configuration, every repo has one, reflects current repo state at build time, visually consistent with the GitHub-native curation model already shipped. Rejected: custom Social-preview uploads (per-repo setup, most repos lack one) and live-site screenshots (browser automation, homepage-only, heavier).
- **Uniform GitHub-card treatment accepted for v1.** Review noted every card sharing the GitHub template may look less differentiated than bespoke visuals. Accepted as the v1 tradeoff for zero-maintenance coverage; bespoke visuals for featured projects remain a possible future enhancement (see Scope Boundaries).

## Scope Boundaries

- No support for custom repository Social-preview image uploads.
- No live-site screenshot capture.
- No bespoke/hand-designed per-project visuals in v1 (possible future enhancement for featured projects).
- No changes to the card/modal progressive-loading or error-fallback logic beyond adding the reserved image box + fit/theme rules in R6/R7.
- No runtime request to `opengraph.githubassets.com` — the endpoint is touched only by the build.

## Success Criteria

- Portfolio project cards and the preview modal show a self-hosted GitHub social card for each curated repo on the live site, served from mrbro.dev's own origin.
- No visitor-browser request is made to GitHub for preview images.
- A repo metadata change is reflected in its card after the next build, not served stale indefinitely.
- Adding images introduces no layout shift, and a fetch/asset failure never breaks card layout (degrades to image-less).
- If GitHub changes/blocks the card endpoint, the failure surfaces at build time, not as silently broken production images.

## Open Questions

### Deferred to Planning

- Where the build-time fetch lives (a dedicated script vs. an extension of the existing prerender/build chain) and where assets are committed/emitted (`public/` vs. `dist/` generation) — an implementation choice for `ce:plan`.
- Exact build-failure policy for a single card fetch failure (hard-fail the whole build vs. skip that one project with a warning) — resolve in planning against the R13-style fail-safe posture used by the blog pipeline.

## Sources & References

- Render path already built: `src/components/ProjectCard.tsx`, `src/components/ProjectPreviewModal.tsx`, `src/hooks/UseProgressiveImage.ts`; `Project.imageUrl` in `src/types/index.ts`.
- The single data gap: `src/hooks/UseGitHub.ts` (`imageUrl: undefined` in the repo→project transform).
- Build-time snapshot precedent: the blog pipeline (`docs/blog-system.md`, `scripts/blog-refresh.ts`, `scripts/prerender-blog.ts`).
- Origin: WU-5 from the live-site audit; pairs with the shipped project-feed curation (`docs/plans/2026-07-18-001-feat-project-feed-curation-plan.md`).
