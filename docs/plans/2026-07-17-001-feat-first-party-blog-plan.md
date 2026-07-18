---
title: 'feat: First-party blog from curated gists'
type: feat
status: active
date: 2026-07-17
origin: docs/brainstorms/2026-07-17-first-party-blog-requirements.md
---

## Overview

Replace the runtime all-gists blog feed with a curated build-time pipeline: posts are public gists that opt in via YAML frontmatter, snapshotted into a committed data file by a scheduled workflow, rendered as prerendered `/blog/<slug>` pages with sanitized GFM and Shiki highlighting, per-post meta/OG tags, and an RSS/Atom feed.

## Problem Frame

The live blog treats every public gist as a post (Keybase proofs and editor configs included), titles are raw gist descriptions, and reading means bouncing to gist.github.com. Content availability depends on per-visitor unauthenticated API calls. The dev-like launch essay is queued behind this work. Full framing in the origin doc.

## Requirements Trace

- R1–R3: frontmatter-curated gists with stable slugs (see origin: Requirements — Content source)
- R4–R6, R8, R9, R16: sanitized on-site reading, prerendered direct loads, designed not-found (see origin: Reading experience)
- R7, R12, R13, R17, R18: build-time snapshot, daily + manual publish, fail-safe builds, author failure signal (see origin: Publishing model)
- R10, R14: per-post meta/OG, RSS/Atom with autodiscovery (see origin: Discovery and metadata)
- R11, R15, R19: designed empty state, runbook update + launch essay, accepted compromise risk (see origin: States, launch, and accepted risk)

## Scope Boundaries

- No search, TOC, tag pages, reading time, prev/next, MDX, comments, analytics, newsletter (origin: Scope Boundaries).
- No grandfathering: gists without frontmatter never surface.
- Single content path: build-time snapshot only; no runtime refresh.
- Repo curation of projects feed (WU-2) is separate work, not this plan.

### Deferred to Separate Tasks

- Runbook update in `hq/runbooks/publish-essay-mrbro-dev.md`: cross-repo authoring step, executed alongside launch-essay publishing (Unit 8 flags it; the edit happens in `hq`).
- Retiring `.ai/plan/feature-blog-system-rich-content-1.md`: superseded-status note added in Unit 8.

## Context & Research

### Relevant Code and Patterns

- `scripts/analyze-build.ts` — dual CLI/library script pattern (`tsx`, named export + `import.meta.url` entry guard); model for the new content scripts.
- `src/utils/schema-validation.ts` + `src/schemas/theme.schema.json` — Ajv instance config and `formatValidationErrors`; reuse for frontmatter validation.
- `src/utils/syntax-highlighting.ts` — `initializeHighlighter()`/`highlightCode(code, lang, {removeBackground: true})`; works in Node; emit the `.code-block` DOM structure `CodeBlock.tsx` styles expect.
- `public/404.html` + `index.html` SPA-redirect script — stays for the shell; prerendered `dist/blog/<slug>/index.html` files bypass it entirely.
- `src/components/LoadingStates.tsx` — `LoadingState` wrapper + `BlogPostSkeleton`; `Projects.tsx` early-return page-state pattern.
- `.github/workflows/fro-bot.yaml` — schedule + workflow_dispatch trigger pattern; `.github/workflows/deploy.yaml` — build/deploy pipeline the snapshot commit triggers.
- `tests/e2e/base-path.spec.ts`, `tests/accessibility/page-audits.spec.ts`, `tests/visual/` — path-array test surfaces to extend; `tests/e2e/pages/BlogPage.ts` POM template.
- PR #187 (`fix/github-feed-reliability`) — hardened `UseGitHub.ts`; merge first, then strip its gist path (repos only).

### Institutional Learnings

- No `docs/solutions/` exists; learnings sourced from git history and `.ai/plan/`.
- Commit `acee9b7`: SPA 404 trick solved direct loads for shell routes; prerendered files are the crawler-correct answer for posts.
- `.ai/plan/feature-blog-system-rich-content-1.md`: superseded — reuse only its test-category checklist (sanitization coverage) and component inventory as a cross-check.
- `__GITHUB_PAGES__` define flag currently short-circuits runtime Shiki to escaped plaintext in production — post pages must not regress this by shipping client-side highlighting.

## Key Technical Decisions

- **Snapshot as committed data file** (`src/data/blog-snapshot.json`): a dedicated scheduled workflow fetches gists, validates, renders, and commits; the existing deploy workflow builds from the commit. Fail-safe by construction — a failed fetch commits nothing and the live site stands (R13/AE6). Distinguishes "GitHub unreachable" (workflow fails, no commit) from "author deleted a post" (successful fetch without the gist → post dropped, R17).
- **Hand-rolled prerender script** over SSG framework: post-`vite build` script renders each post page to `dist/blog/<slug>/index.html` via `react-dom/server`, substituting per-post head tags into the built `index.html` shell. Matches the repo's script-pipeline convention; zero client-bundle impact.
- **Markdown pipeline: unified** (`remark-parse` + `remark-gfm` + `remark-rehype` + `rehype-sanitize` + `rehype-stringify`), build-time only: allowlist sanitization without jsdom/DOMPurify; ESM-native; never enters the client graph.
- **YAML via `yaml` package** (ESM-first; `js-yaml` exists only as a security override, not a dep).
- **Feed via `feed` package**: battle-tested XML escaping (AE5 flagged XML injection as a sink); hand-rolled XML rejected for the escaping bug class.
- **Slug: frontmatter `slug` field, falling back to slugified `title`**; collisions or path-unsafe slugs (`..`, `/`, reserved routes) fail the build. **The snapshot doubles as the slug registry, keyed by gist ID:** an existing snapshot entry keeps its stored slug forever regardless of later title/frontmatter edits; only gists absent from the previous snapshot derive a slug (R3). First-publish detection = gist ID not present in the prior snapshot.
- **Post source file:** a candidate gist with exactly one Markdown file uses it; multiple Markdown files require an explicit source-file name in frontmatter, otherwise the candidate hard-fails validation — post identity never depends on gist file ordering.
- **E2E fixture mechanism (decided):** the snapshot path is env-selectable at build time (`BLOG_SNAPSHOT=tests/fixtures/blog-snapshot.json pnpm build`); default is `src/data/blog-snapshot.json`. Test builds pass the fixture path; no runtime switching.
- **Highlighting at build time** with existing Shiki, emitting both light/dark via CSS-variable-compatible output (`removeBackground: true`), matching `CodeBlock`'s DOM so `--code-*` theming applies unchanged.
- **Prerender rendering entry:** a dedicated server entry wraps the post page tree in `StaticRouter` (React Router's server export) for `react-dom/server`; `BrowserRouter` remains client-only. Without this split, router hooks cannot render server-side.
- **Snapshot carries rendered HTML** per post (`{slug, frontmatter, html, gistUrl, gistUpdatedAt}`, plus `generatedAt`): the render step happens in the refresh workflow, keeping unified/Shiki out of `pnpm build` and making the deploy build a pure consumer.

## Open Questions

### Resolved During Planning

- Slug derivation: frontmatter field with title fallback, build-failing collisions (above).
- Snapshot storage: committed JSON; refresh workflow is the only writer.
- Rebuild workflow: new dedicated `blog-refresh.yaml` (daily cron + dispatch) committing the snapshot; existing `deploy.yaml` untouched except consuming the file. Skip-deploy-when-unchanged falls out naturally: no diff → no commit → no deploy.
- Frontmatter schema: `title` (string, required), `date` (ISO date, required), `summary` (string, required), `slug` (string, optional), `tags` (string[], optional). JSON Schema in `src/schemas/blog-frontmatter.schema.json`.

### Deferred to Implementation

- Exact rehype-sanitize schema tweaks (which GFM elements beyond the default allowlist, e.g. `input[type=checkbox]` for task lists): decide against real fixture posts.
- Shiki language list expansion: driven by the launch essay's actual code fences.
- Whether the prerendered head substitution needs a placeholder marker in `index.html` or can safely regex the existing tags: decide reading the built output.

## Output Structure

    src/data/blog-snapshot.json          # committed snapshot (refresh workflow is sole writer)
    src/schemas/blog-frontmatter.schema.json
    src/utils/blog.ts                    # snapshot load + types guards, shared client/prerender
    src/hooks/UseBlogPosts.ts            # snapshot-backed hook (list + getPostBySlug)
    src/pages/BlogPostPage.tsx           # /blog/:slug page (header, body, not-found state)
    src/components/BlogEmptyState.tsx    # designed empty state (R11)
    scripts/blog-refresh.ts              # fetch gists → validate → render → write snapshot
    scripts/prerender-blog.ts            # post-build: emit dist/blog/<slug>/index.html + feed + sitemap
    .github/workflows/blog-refresh.yaml  # daily cron + workflow_dispatch

## Implementation Units

- [ ] **Unit 1: Content contract — types, schema, snapshot format**

**Goal:** Define the blog content model everything else consumes.

**Requirements:** R2, R3

**Dependencies:** PR #187 merged (its `UseGitHub` shape is the base for Unit 7).

**Files:**

- Create: `src/schemas/blog-frontmatter.schema.json`, `src/utils/blog.ts`
- Modify: `src/types/index.ts` (add `BlogPostMeta`, `BlogPostFull`, `BlogSnapshot`)
- Test: `tests/utils/blog.test.ts`

**Approach:**

- Discriminate list-card metadata from full post content; snapshot type is `{posts: BlogPostFull[], generatedAt: string}`.
- `unknown`-first type guards mirroring the PR #187 validation posture; Ajv validation via the `schema-validation.ts` instance pattern.
- Slug derivation + validation helpers live here (pure, testable): slugify, path-safety rejection, collision detection.

**Patterns to follow:** `src/utils/schema-validation.ts`, `src/types/index.ts` barrel.

**Test scenarios:**

- Happy path: valid frontmatter object → parsed meta with derived slug from title; explicit `slug` field wins over derivation.
- Edge case: title with unicode/punctuation → URL-safe slug; duplicate slugs across two posts → collision error naming both.
- Error path: missing `title`/`date`/`summary` → validation errors via `formatValidationErrors`; `slug: "../escape"` and reserved route names (`blog`, empty string) → rejected.
- Edge case: malformed date string → validation error, not a crash.

**Verification:** Unit tests green; schema validates the launch essay's intended frontmatter.

- [ ] **Unit 2: Snapshot refresh script**

**Goal:** `scripts/blog-refresh.ts` fetches public gists, filters by frontmatter convention, validates, renders sanitized HTML with highlighting, and writes `src/data/blog-snapshot.json` — failing safe per R13.

**Requirements:** R1, R4, R5, R7, R13, R17

**Dependencies:** Unit 1

**Files:**

- Create: `scripts/blog-refresh.ts`, `src/data/blog-snapshot.json` (initial empty snapshot)
- Modify: `package.json` (script entry + deps: `unified`, `remark-parse`, `remark-gfm`, `remark-rehype`, `rehype-sanitize`, `rehype-stringify`, `yaml`)
- Test: `tests/scripts/blog-refresh.test.ts`

**Approach:**

- Dual CLI/library shape (`analyze-build.ts` pattern); fetch via ambient `GITHUB_TOKEN` when present, anonymous otherwise; treat all responses as `unknown`.
- Pipeline per candidate: first Markdown file → frontmatter split (`yaml`) → schema validation → unified render → Shiki highlight per fence (both themes, `removeBackground`) → sanitized HTML into snapshot.
- Gist-derived strings never reach commit messages (fully static message) and are escaped/length-truncated before inclusion in workflow summaries or log lines.
- Snapshot includes a `generator` marker field; the refresh script is the documented single writer (no CI enforcement — accepted risk for a solo repo).
- Fail-safe logic: fetch failure → non-zero exit, snapshot untouched (AE6). Previously published slug now invalid → hard fail naming the post (R13). New candidate invalid → warn + exclude, listed in the run summary (R18). Successful fetch missing a previously published gist → drop the post (R17/AE9).
- Deterministic output ordering + stable serialization so no-change runs produce byte-identical files (enables skip-deploy-when-unchanged).

**Execution note:** Test-first for the fail-safe matrix — R13/R17 distinctions are the highest-risk logic in the plan.

**Test scenarios:**

- Happy path: two valid frontmattered gists among six mixed → snapshot with exactly two posts, reverse-date order, rendered HTML present.
- Happy path: unchanged input re-run → byte-identical snapshot.
- Error path: GitHub 500/network error → exits non-zero, existing snapshot file unmodified.
- Error path: previously published slug's frontmatter now malformed → exits non-zero naming the slug.
- Edge case: new gist with invalid frontmatter → excluded, warning recorded, exit zero.
- Edge case: previously published gist deleted upstream, fetch succeeds → post absent from new snapshot.
- Integration (AE4/AE5): body with `<script>`/`onerror` → neutralized; frontmatter title with `"/><script>` → stored escaped-safe; GFM table/blockquote/fence render intact; task-list checkboxes per sanitize-schema decision.
- Error path: hostile frontmatter strings → workflow summary/log output escaped and truncated; commit message unaffected (static).
- Edge case: slug registry — previously published gist edited with a new title → slug unchanged; gist ID absent from prior snapshot → slug derived fresh.
- Error path: gist with two Markdown files and no source-file frontmatter field → validation failure naming the gist.
- Edge case: gist with multiple Markdown files → first file is the post source, deterministic selection.

**Verification:** Script runs against live gists (currently zero qualifying → empty snapshot, AE1); fail-safe matrix covered by tests; coverage thresholds hold.

- [ ] **Unit 3: Blog UI on the snapshot — list, post page, empty/not-found states**

**Goal:** `/blog` and `/blog/:slug` render exclusively from the committed snapshot; runtime loading/error states disappear; designed empty and not-found states land.

**Requirements:** R6 (SPA half), R8, R9, R11, R16

**Dependencies:** Unit 1 (types); Unit 2 for real data but implementable against fixtures.

**Files:**

- Create: `src/hooks/UseBlogPosts.ts`, `src/pages/BlogPostPage.tsx`, `src/components/BlogEmptyState.tsx`
- Modify: `src/pages/Blog.tsx`, `src/components/BlogPost.tsx` (card: tags, bounded title, internal link), `src/App.tsx` (`/blog/:slug` route), `src/pages/Home.tsx` (preview from snapshot), `src/styles/` (post page + empty state styles)
- Test: `tests/pages/Blog.test.tsx` (rewrite), `tests/pages/BlogPostPage.test.tsx`, `tests/components/BlogEmptyState.test.tsx`, `tests/hooks/UseBlogPosts.test.ts`

**Approach:**

- `UseBlogPosts` statically imports the snapshot JSON — synchronous, no loading state; exposes `posts` (sorted) and `getPostBySlug`.
- Home preview: synchronous snapshot preview — no skeleton, no loading/error states; at zero posts the preview section hides entirely (the designed empty state lives on `/blog`, not Home).
- Client-side document title: `BlogPostPage` updates title/description on SPA navigation via the existing `UsePageTitle` mechanism (prerendered head covers cold loads; the hook covers in-app navigation).
- Code blocks must render legibly in both light and dark themes without client-side re-highlighting; theme toggle swaps only CSS custom properties (`--code-*`).
- Post page: `Projects.tsx` early-return pattern; header (title/date/tags), sanitized-HTML body via `dangerouslySetInnerHTML` (sanitized at build; justify per `CodeBlock` precedent), back-to-blog nav, gist link (R9); unknown slug → not-found state (R16).
- Cards link internally; external gist link demoted to the post page.
- Reading layout: post body constrained to a readable prose column (max ≈ 70ch); code blocks and tables overflow-scroll horizontally on narrow viewports; cards stack single-column and tags wrap on small screens.
- Feed link: visible RSS link on the blog index header area only; post pages carry autodiscovery `<link>` metadata, no visible feed link.
- CSS custom properties only; keyboard/reduced-motion per house rules.

**Patterns to follow:** `Projects.tsx` page states, `CodeBlock.tsx` HTML-injection justification, `src/components/AGENTS.md`.

**Test scenarios:**

- Happy path: snapshot fixture with 3 posts → list renders 3 cards, reverse-date order, tags as non-interactive labels.
- Happy path: `/blog/:slug` route renders header, body HTML, back link, gist link.
- Edge case: empty snapshot → `BlogEmptyState` renders (no bare `<p>`); Home preview section renders without blog block or with empty-state variant.
- Edge case: unknown slug → not-found state with back-to-blog path, inside site shell.
- Integration: body containing pre-highlighted code block markup → renders with `.code-block` structure, no runtime Shiki import triggered.
- A11y: post page heading order (site h1 vs post title), tab order through header links.
- Integration (R4 sinks): frontmatter title/summary/tags containing markup → rendered inert in list cards and the post header (complements Unit 2's head/feed sink coverage — every frontmatter sink is tested somewhere).

**Verification:** Unit tests green; `pnpm build` bundle budget unchanged (no unified/Shiki in client graph via `analyze-build`).

- [ ] **Unit 4: Prerender script — static post pages, feed, sitemap**

**Goal:** `scripts/prerender-blog.ts` runs after `vite build`, emitting `dist/blog/<slug>/index.html` with per-post head tags, `dist/feed.xml`, and `dist/sitemap.xml` from the snapshot.

**Requirements:** R6 (crawler half), R10, R14

**Dependencies:** Units 1, 3

**Files:**

- Create: `scripts/prerender-blog.ts`
- Modify: `package.json` (build chain + `feed` dep), `index.html` (feed autodiscovery link), `src/pages/Blog.tsx` (visible feed link)
- Test: `tests/scripts/prerender-blog.test.ts`

**Approach:**

- Read built `dist/index.html` as shell; render each post route through the dedicated `StaticRouter` server entry via `react-dom/server`; substitute title/description/OG/canonical per post (HTML-escaped frontmatter strings, AE5); write per-slug directories that GitHub Pages serves directly — no 404-trick dependency for posts.
- Feed via `feed` lib from snapshot metadata; sitemap covering shell routes + posts.
- Zero posts → no post directories, feed with channel-only body, valid sitemap (AE1-compatible).

**Test scenarios:**

- Happy path: 2-post snapshot → 2 slug directories, each head containing post title, description, OG tags, canonical URL.
- Integration (AE3): emitted HTML for a post contains prerendered body content (not the empty SPA shell).
- Error path (AE5): frontmatter title with `"/><script>` → escaped in head HTML and feed XML.
- Edge case: zero posts → no `dist/blog/*/` dirs, feed/sitemap still valid XML.
- Happy path: feed validates against RSS/Atom structure; autodiscovery link present in shell and post heads.

**Verification:** Local `pnpm build && tsx scripts/prerender-blog.ts` output inspected; curl-style check of emitted files; tests green.

- [ ] **Unit 5: Blog refresh workflow**

**Goal:** `.github/workflows/blog-refresh.yaml` runs daily + on dispatch: refresh script → if snapshot changed, commit and push (triggering deploy); failures surface loudly.

**Requirements:** R12, R13, R18

**Dependencies:** Unit 2

**Files:**

- Create: `.github/workflows/blog-refresh.yaml`
- Modify: `.github/ACTIONS.md` (document the workflow)

**Approach:**

- Triggers: `schedule` (daily, off-hour cron per `fro-bot.yaml` convention) + `workflow_dispatch`; minimal permissions (`contents: write` only); ambient `GITHUB_TOKEN`; concurrency group to prevent overlapping refreshes.
- Push race handling: fetch + rebase onto latest `main` before push, retry once on rejection, then fail loudly — never force-push, never publish from a stale base.
- No diff → exit cleanly without commit (skip-deploy-when-unchanged); commit message conventional (`chore(blog): refresh content snapshot`).
- Failure → workflow fails with the script's error in the step summary (R18); no commit occurs (R13).

**Test scenarios:**

- Test expectation: none — CI workflow config; behavior verified by dispatch runs in Unit 8 (validation matrix: no-change run, publish run, simulated-failure run).

**Verification:** Manual dispatch on a branch produces expected commit/no-commit behavior; `actionlint`/CI green.

- [ ] **Unit 6: E2E, accessibility, and visual coverage**

**Goal:** Extend the three test surfaces to the new pages and lock in direct-load behavior.

**Requirements:** R6, R11, R16 (verification surface)

**Dependencies:** Units 3, 4

**Files:**

- Create: `tests/e2e/pages/BlogPostPage.ts` (POM), fixture snapshot for test builds
- Modify: `tests/e2e/base-path.spec.ts` (add `/blog/<fixture-slug>`), `tests/accessibility/page-audits.spec.ts` (same), `tests/e2e/pages/BlogPage.ts` (drop Loading/Error assertions + 4s timeout), `tests/visual/` (post page + empty state baselines, 2 themes × 2 viewports)

**Approach:**

- Test builds consume a committed fixture snapshot so E2E is deterministic and independent of live gists; decide mechanism (env-switched snapshot path or fixture injection at build) at implementation.
- Visual baselines: blog list (populated + empty), post page, not-found state.

**Test scenarios:**

- Integration (AE3/R6): direct navigation to prerendered `/blog/<fixture-slug>` returns <400 and renders content without SPA redirect.
- Integration: unknown slug direct load → not-found state via SPA fallback.
- A11y: axe WCAG 2.1 AA pass on list, post, empty, not-found states.
- Visual: baselines stable across themes/viewports.

**Verification:** Full `pnpm test:all` green in CI including new baselines.

- [ ] **Unit 7: Strip runtime gist path from UseGitHub**

**Goal:** `UseGitHub` serves repositories only; all gist/blog runtime fetching is gone.

**Requirements:** R7 (single content path), origin Dependencies note

**Dependencies:** Units 3, 6 merged (blog fully on snapshot)

**Files:**

- Modify: `src/hooks/UseGitHub.ts`, `src/types/index.ts` (remove legacy `blogPosts` surface), `tests/hooks/UseGitHub.test.ts`, any residual consumers
- Test: updated `tests/hooks/UseGitHub.test.ts`

**Approach:**

- Preserve PR #187's hardened repos path (validation, caching, abort scopes) verbatim; delete gist fetch, gist cache keys, `blogPosts` return, and related types/tests.

**Test scenarios:**

- Happy path: repos flow unchanged (cache, retry, rate-limit surfaces still covered).
- Edge case: no consumer imports `blogPosts` (compile-time verification via tsc).

**Verification:** tsc + full suite green; bundle drops the gist code path.

- [ ] **Unit 8: Launch — publish the essay end-to-end**

**Goal:** The dev-like launch essay publishes through the pipeline; runbook handoff flagged; stale plan retired.

**Requirements:** R15, success criteria

**Dependencies:** Units 1–7 deployed to main

**Files:**

- Modify: `.ai/plan/feature-blog-system-rich-content-1.md` (superseded note), `README.md` (blog mention if warranted)

**Approach:**

- Validation matrix on the live workflow: no-change dispatch (no commit), essay-gist publish dispatch (post live at `mrbro.dev/blog/<slug>`), social-card check via scraper preview.
- Cross-repo handoff: runbook update in `hq` documents frontmatter schema, dispatch trigger, verification steps (authoring happens in `hq`, outside this repo).

**Test scenarios:**

- Test expectation: none — launch validation exercises the shipped system; evidence captured in the PR/issue trail.

**Verification:** Essay readable on-site with correct social cards (AE3); non-post gists absent (success criteria); feed lists the essay.

## System-Wide Impact

- **Interaction graph:** `App.tsx` routes, `Home.tsx` preview, `Blog.tsx`, header/footer feed links, deploy workflow (consumes snapshot commit), new refresh workflow (writes it).
- **Error propagation:** Content errors stop at the refresh workflow (fail = no commit); the deployed site never sees a partial snapshot. Client has no blog error states after Unit 3.
- **State lifecycle risks:** Snapshot is the single source of truth with one writer (workflow); local dev edits to it are visible in diffs. Byte-stable serialization prevents no-op deploy churn.
- **API surface parity:** `UseGitHub` consumers (Projects/Home) keep the repos surface; `blogPosts` removed in one unit (7) after the snapshot path is live — no window where both are authoritative.
- **Integration coverage:** direct-load prerender behavior (Unit 6) is the cross-layer proof unit tests can't give.
- **Unchanged invariants:** SPA 404 trick, theme system, bundle budgets, existing routes, coverage thresholds, deploy workflow steps (only its input commit changes).

## Risks & Dependencies

| Risk | Mitigation |
| --- | --- |
| Prerendered shell substitution breaks when `index.html` structure changes | Prerender test asserts on the built output; fails loudly in CI, not silently in prod |
| rehype-sanitize allowlist too strict (drops task lists/footnotes) or too loose | Fixture-driven sanitize tests (AE4); schema tweaks are an implementation-time decision with test evidence |
| Refresh workflow commit loop (commit → deploy → no content change) | Refresh only writes on content diff; deploy never writes the snapshot |
| Refresh push races a human push to main | Rebase-then-push with single retry, loud failure after (Unit 5) |
| Manual snapshot edits bypass the pipeline | Generator marker + documented single-writer rule; accepted risk, no CI gate |
| Shiki language gaps for essay code fences | Language list expanded against the actual essay before launch (Unit 8) |
| New deps (`unified` chain, `yaml`, `feed`) enter client bundle by accident | `analyze-build` budget gate in CI; deps imported only from `scripts/` |
| PR #187 merge conflicts with Unit 7 | Sequencing: #187 merges before Unit 1 starts; Unit 7 builds on its final shape |

## Documentation / Operational Notes

- `.github/ACTIONS.md` gains the blog-refresh workflow entry (Unit 5).
- `docs/blog-system.md` (optional, Unit 8): frontmatter schema + failure-mode playbook — first durable ops doc in `docs/`; decide at launch whether the runbook in `hq` suffices.
- Renovate will track the new deps; all are ESM-native and must pass the audit gate.

## Sources & References

- **Origin document:** [docs/brainstorms/2026-07-17-first-party-blog-requirements.md](../brainstorms/2026-07-17-first-party-blog-requirements.md)
- Supersedes: `.ai/plan/feature-blog-system-rich-content-1.md`
- Related PR: #187 (GitHub feed reliability — merge precedes Unit 1)
- Related code: `src/hooks/UseGitHub.ts`, `src/utils/syntax-highlighting.ts`, `scripts/analyze-build.ts`, `.github/workflows/deploy.yaml`
