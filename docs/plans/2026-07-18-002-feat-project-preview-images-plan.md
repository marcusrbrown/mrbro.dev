---
title: "feat: Project preview images from GitHub social cards"
type: feat
status: active
date: 2026-07-18
origin: docs/brainstorms/2026-07-18-project-preview-images-requirements.md
---

# feat: Project preview images from GitHub social cards

## Overview

Populate project card and preview-modal images by fetching each portfolio repo's GitHub social card at build/refresh time and self-hosting it under the site origin. A new fetch script (mirroring the blog snapshot pipeline) commits image assets to `public/`, a daily refresh job keeps them current, and the repo→project transform references them by a deterministic URL. No runtime request to GitHub; the existing render path is reused.

## Problem Frame

Project cards render with no preview image because the repo→project transform in `src/hooks/UseGitHub.ts` hardcodes `imageUrl: undefined` (line 291). The card/modal display path is already built — `ProjectCard.tsx` and `ProjectPreviewModal.tsx` consume `imageUrl` via `UseProgressiveImage`, and `.project-card__image` already reserves a fixed 180px box with a theme-aware gradient placeholder and an error-hide rule. Image content comes from GitHub's auto-generated Open Graph card (`opengraph.githubassets.com/1/<owner>/<repo>`), verified to return a valid PNG.

Delivery is **build-time fetch + self-host**, not runtime hotlink (see origin: `docs/brainstorms/2026-07-18-project-preview-images-requirements.md`). Document review established that hotlinking the undocumented endpoint at render time is a silent single-point-of-failure and leaks visitor IPs to GitHub on every page view. Fetching once and committing a local asset eliminates both and makes freshness a function of the refresh, mirroring the existing build-time blog snapshot architecture.

## Requirements Trace

- R1. Project cards and the preview modal display each portfolio repo's GitHub social card as its preview image.
- R2. Preview images are fetched at refresh time from `https://opengraph.githubassets.com/1/<owner>/<repo>` (owner/repo from the repo's `full_name`) and written to committed static assets under the site origin.
- R3. The transform sets `imageUrl` to a deterministic local path derived from the repo — no runtime request to `opengraph.githubassets.com`.
- R4. Image freshness is controlled by the refresh job; a repo metadata change is reflected after the next refresh. No runtime cache-bust hash.
- R5. Fail-safe on fetch: a previously-committed image failing to fetch is fatal (existing assets preserved, non-zero exit); a newly-featured repo's image failing warns and is skipped, leaving other assets publishable. An empty/garbage 200 response is treated as a hard failure, not shipped.
- R6. Adding images introduces no layout shift (the reserved image box already prevents CLS) and a fetch/asset miss degrades to the current image-less card via the existing error path.
- R7. The image reads correctly in both light and dark themes.
- R8. Every repo in the curated (portfolio-tagged) feed receives a preview image via this rule.
- R9. The refresh removes any committed preview image whose repo is no longer in the current public portfolio set (un-tagged, deleted, or made private), so no stale card for a non-public repo keeps serving from the site origin. Removal happens only when the repo listing itself fetched successfully (a listing-fetch failure is fatal and prunes nothing).

## Scope Boundaries

- No runtime request to `opengraph.githubassets.com` — the endpoint is touched only by the refresh script.
- No manifest/lookup file — the transform computes the asset URL deterministically (see Key Technical Decisions).
- No custom social-preview uploads, no live-site screenshots, no bespoke per-project visuals.
- No changes to `UseProgressiveImage` or the card/modal render logic beyond the transform wiring and any minimal CSS framing.

### Deferred to Separate Tasks

- **WebP/AVIF conversion**: only if a dry-run measurement shows the committed PNGs create real bundle-budget pressure (see Risks). `analyze-build` already hard-fails over the 2MB cap, so budget pressure surfaces loudly at build time rather than silently — WebP is the escape hatch when that gate is hit, not a speculative v1 cost.
- **Content-addressable dedup / more aggressive size optimization**: not needed at the current portfolio size.

## Context & Research

### Relevant Code and Patterns

- `scripts/blog-refresh.ts` — the fetch-script template to mirror: `atomicWrite` (temp + `renameSync`), `AbortSignal.timeout(30_000)`, top-level fail-safe (`process.exitCode = 1`, prior state untouched), `GITHUB_TOKEN` auth, dual CLI/library shape, `$GITHUB_STEP_SUMMARY` output.
- `src/hooks/UseGitHub.ts` — `transformReposToProjects` (~L273-292); the validated `GitHubRepo` carries `id` (stable int), `full_name`, `updated_at`. Line 291 is the gap.
- `src/components/ProjectCard.tsx` (~L29-50) + `src/styles/landing-page.css` (`.project-card__image*`, ~L917-964) — image box already 180px, theme-aware gradient, `object-fit: cover`, `--error { display: none }`.
- `src/hooks/UseProgressiveImage.ts` (~L71-96) — sets `isError` on load failure; the 404/miss path is already handled.
- `.github/workflows/blog-refresh.yaml` — daily cron + commit loop (diff-gate → add → commit → rebase → push, single retry); the workflow to extend with a second job.
- `vite.config.ts` — default `publicDir`; `public/**` copies verbatim to `dist/**`; served at `mrbro.dev/<path>`.
- `tests/scripts/blog-refresh.test.ts` (~L369-592) — the fetch-script test pattern (tmpdir, `vi.stubGlobal('fetch', …)`, fail-safe assertion with `process.exitCode` reset).

### Institutional Learnings

- `docs/solutions/integration-issues/gist-list-api-omits-content-snapshot-empty-2026-07-18.md` — the build-time-GitHub-fetch bug this must not repeat. Transfers 1:1: `wasPublished`-first fail-safe ordering; real-API-shape fixtures (PNG bytes via `arrayBuffer`, not convenience shapes); empty-200 is a real failure (validate Content-Type + length + PNG magic bytes, not just `response.ok`); authenticate when a token exists; live-smoke assertion (0 images fetched when ≥1 portfolio repo exists is NOT a pass); green CI is hygiene, not behavior.
- `docs/blog-system.md` — the runbook shape (source → publish → verify + failure-mode table) to mirror in the docs unit.

## Key Technical Decisions

- **Deterministic URL via a shared filename helper (no manifest file).** The runtime transform sets `imageUrl` to the preview path; the refresh script writes to that same path. To avoid a split-brain where the two sides derive the filename independently and silently desync (every image 404s if one formula changes), both import a single pure helper (e.g. `previewImagePath(repoId)` in `src/utils/`) — a function, not a manifest, so no import/lookup indirection or staleness. The existing 404→`isError`→hide path already covers a newly-featured repo whose image isn't fetched yet, at zero cost. `repo.id` (stable integer, collision-free, filesystem-safe, survives rename) is the filename key.
- **Commit assets to `public/project-previews/`.** Vite copies `public/**` to `dist/**` verbatim; GitHub Pages serves them from the site origin with no config change. This is the only delivery that decouples `pnpm build` from GitHub, serves from the origin, and matches the committed blog-snapshot pattern.
- **Refresh runs outside `pnpm build`, folded into the existing blog-refresh workflow as one push owner.** The preview-image refresh joins `.github/workflows/blog-refresh.yaml` but must NOT be a second parallel job — two sibling jobs both `git push`-ing to `main` race and clobber each other. Either run both refresh steps within the single existing job under one diff→commit→rebase→push gate, or serialize a second job with `needs:`. One push owner to `main`. The build must never fetch from GitHub — that would re-introduce the SPOF the feature eliminates.
- **`wasPublished`-first fail-safe ordering.** Determine whether a repo's image was already committed before per-repo validation: previously-committed → fatal on failure; new → warn-and-skip. Multi-file atomicity via a staging directory (write the batch, then move into place) so a mid-run failure never leaves a partial set.
- **Reuse the existing image box; minimal-to-no new CSS.** The 180px reserved box + `object-fit: cover` + theme-aware gradient + error-hide already satisfy R6/R7. Any framing for dark-theme separation is a small additive rule in `landing-page.css`, not new structure.

## Open Questions

### Resolved During Planning

- Where the fetch step lives → folded into `blog-refresh.yaml` as a second job, outside `pnpm build`.
- Asset location + runtime reference → `public/project-previews/<repo.id>.png`, deterministic URL, no manifest.
- Build-failure policy → `wasPublished`-first fail-safe mirroring the blog pipeline.
- CLS/theme (R6/R7) → already handled by the existing image-box CSS; verify, don't rebuild.

### Deferred to Implementation

- Exact minimum-byte floor and whether to assert full PNG magic bytes vs. Content-Type + length only — settle against a real dry-run response.
- Whether the dark-theme framing needs any CSS at all — decide by inspecting the rendered card in both themes; add a rule only if there's a real contrast problem.

## Implementation Units

- [ ] **Unit 1: Preview-image refresh script + tests**

**Goal:** A build-time script fetches each portfolio repo's GitHub social card, validates it, and atomically writes it to `public/project-previews/<repo.id>.png` with `wasPublished`-first fail-safe behavior.

**Requirements:** R2, R5, R8

**Dependencies:** None

**Files:**
- Create: `scripts/project-preview-refresh.ts`
- Create: `tests/scripts/project-preview-refresh.test.ts`
- Create (generated, committed): `public/project-previews/<repo.id>.png` (seeded by an initial run)

**Approach:**
- Mirror `scripts/blog-refresh.ts` structure: fetch the portfolio-tagged repo set (reuse the same fetch + validation posture already in that script / `UseGitHub` shape), then for each repo fetch `https://opengraph.githubassets.com/1/<owner>/<repo>` (owner/repo from `full_name`) with `AbortSignal.timeout(30_000)` and `GITHUB_TOKEN` auth when present. Write each image to the path from the shared `previewImagePath(repo.id)` helper (Unit 2) so the script and runtime never desync.
- Validate each response before writing (ALL three, mandatory): `Content-Type` starts with `image/`, body length above a sensible floor, and PNG magic bytes (`89 50 4E 47`) — an empty/garbage 200 is a hard failure, never written. (This is the exact empty-200 trap from the gist-API learning; magic-byte validation is required, not optional.)
- `wasPublished`-first: a repo whose image already exists in `public/project-previews/` failing to fetch → fatal (`process.exitCode = 1`, existing assets untouched); a new repo failing → warn and skip. Use a staging dir for batch atomicity, then move into place (adapt `atomicWrite` for `Buffer`). **Explicit transaction boundary:** on ANY fatal exit, remove the staging dir so no partial/staged output can survive and later be mistaken for committed state — the publish (move-into-place) step must never run on a fatal path.
- **Privacy prune (R9):** after a SUCCESSFUL repo listing fetch, remove any committed image under `public/project-previews/` whose `repo.id` is not in the current public portfolio set — covers un-tagged, deleted, and made-private repos so no stale non-public card keeps serving. Prune only on a good listing; if the listing fetch itself fails, that's fatal and nothing is pruned (never delete on uncertainty). Removals are part of the same atomic publish batch.
- Dual CLI/library shape so tests import it; CLI entry runs the refresh and writes a `$GITHUB_STEP_SUMMARY`-style summary (fetched / skipped / failed with reasons).
- Run the script once during implementation to seed the initial committed PNGs for the current portfolio set.

**Execution note:** Start with a failing test for the fail-safe matrix (previously-committed vs new-repo fetch failure) before implementing the write path.

**Patterns to follow:** `scripts/blog-refresh.ts` (`atomicWrite`, timeout, fail-safe top-level, auth, summary); `tests/scripts/blog-refresh.test.ts` (fetch stubbing, tmpdir, `process.exitCode` reset).

**Test scenarios:**
- Happy path: portfolio repo with a valid PNG response → one file written at `public/project-previews/<id>.png`, exit 0.
- Happy path: filename derivation is deterministic from `repo.id`; URL is built correctly from `full_name`.
- Edge: empty portfolio set → no files written, exit 0, summary reports 0 fetched.
- Error: empty/garbage 200 (wrong Content-Type or truncated body) → treated as failure, not written.
- Error (R5): previously-committed repo's fetch fails → exit 1, existing files unchanged.
- Error (R5): new repo's fetch fails → warned and skipped, other repos' files still written, exit 0.
- Error: fetch timeout on the first request (network down) → fatal, existing assets untouched.
- Edge: mid-batch failure leaves no half-written file, and the staging dir is removed on the fatal path (transaction boundary).
- Privacy (R9): a repo present in `public/project-previews/` but absent from a successfully-fetched portfolio listing → its committed image is removed.
- Privacy (R9): the portfolio listing fetch itself fails → fatal, NO images pruned (no deletion under uncertainty).

**Verification:** Running the script against the live portfolio set writes one non-empty PNG per portfolio repo; a forced fetch failure on a previously-committed repo exits non-zero and leaves prior assets intact.

- [ ] **Unit 2: Wire the deterministic image URL into the transform**

**Goal:** The repo→project transform sets `imageUrl` to the deterministic local asset path.

**Requirements:** R1, R3, R4, R8

**Dependencies:** None (shares only the filename contract with Unit 1)

**Files:**
- Create: `src/utils/preview-image-path.ts` (the shared `previewImagePath(repoId)` pure helper) + its test
- Modify: `src/hooks/UseGitHub.ts` (the `imageUrl: undefined` line in `transformReposToProjects`)
- Test: `tests/hooks/UseGitHub.test.ts`, `tests/utils/preview-image-path.test.ts`

**Approach:**
- Add a pure `previewImagePath(repoId)` helper in `src/utils/` that returns the deterministic local path. BOTH the transform and the Unit 1 refresh script import it — this is the single source of truth for the filename contract (resolves the split-brain fragility).
- Replace `imageUrl: undefined` with `previewImagePath(repo.id)`, guarding for a pathological missing/invalid `id` (fall back to `undefined` so the field stays absent and the card degrades to image-less).
- No async, no fetch, no new hook — a pure string built from `repo.id`.

**Patterns to follow:** existing transform mapping in `UseGitHub.ts`; existing `imageUrl`-present/absent tests already in `UseGitHub.test.ts`.

**Test scenarios:**
- Happy path: a portfolio repo with a numeric `id` → `imageUrl === '/project-previews/<id>.png'`.
- Edge: a repo with a missing/invalid `id` → `imageUrl` is `undefined` (card degrades gracefully).
- Regression: the added field doesn't disturb the other mapped fields or the portfolio/site-repo filtering from the curation work.

**Verification:** The transform output carries a local `imageUrl` for portfolio repos; no code path issues a runtime request to `opengraph.githubassets.com`.

- [ ] **Unit 3: Card + modal image presentation (fit, overlay legibility, theme)** — @designer-owned

**Goal:** Integrate the real OG card image into the card and modal so the preview reads well: the ~1.9:1 text-bearing card is legible (not a cropped slice), the language-badge/stats overlays stay readable over a real image, and the image is visually integrated in both themes with no layout shift.

**Requirements:** R6, R7

**Dependencies:** Unit 1 (assets exist), Unit 2 (imageUrl set)

**Files:**
- Modify: `src/styles/landing-page.css` (`.project-card__image*`, and modal image rules)
- Possibly modify: `src/components/ProjectCard.tsx` / `src/components/ProjectPreviewModal.tsx` if overlay markup needs a scrim element

**Approach (route to @designer with visual verification):**
- **Image fit:** `object-fit: cover` in the 180px box will show a random horizontal slice of a 1200×630 text-heavy OG card and mangle the repo name/description. Decide `contain`/letterbox vs. a taller/adjusted box vs. cover-with-repositioning — the goal is a legible, intentional thumbnail, not a banner fragment. @designer's call with real cards in front of them.
- **Overlay legibility:** the language-badge + stats now sit over a real image, not a flat gradient. Add a scrim/gradient-underlay or outline so they stay readable across varied card backgrounds.
- **Dark-theme framing:** the OG card has a light background — treat integration in dark mode as a real decision (inset border, contain-with-matched-backdrop, or padding), not optional polish. No inline styles; CSS custom properties only.
- Preserve the reserved-box height (no CLS) and the existing error-hide fallback.

**Execution note:** This is design work, not mechanical verification — dispatch to @designer, who resolves fit/overlay/framing against rendered cards in both themes at desktop + mobile and confirms the outcome visually.

**Test scenarios:** Test expectation: none — visual/presentational (visual baselines are write-only in this repo; @designer confirms via before/after screenshots in both themes). Any CSS/markup added is behavior-preserving.

**Verification:** Cards and modal show a legible, intentional preview (repo name/description readable, overlays legible) with no layout shift; both themes read as integrated, not pasted-in; a missing asset falls back to the gradient placeholder.

- [ ] **Unit 4: Fold refresh into the blog-refresh workflow + document**

**Goal:** The preview-image refresh runs on the existing daily workflow and commits updated assets; the pipeline is documented.

**Requirements:** R2, R4, R5

**Dependencies:** Unit 1

**Files:**
- Modify: `.github/workflows/blog-refresh.yaml` (run `scripts/project-preview-refresh.ts` within the existing single job — or a `needs:`-serialized job — so there is ONE push owner to `main`; add `public/project-previews/` to the `git diff` change-gate; commit message covers both snapshot + preview refresh). Add `workflow_dispatch` (if not present) so a newly-featured repo's image can be refreshed on demand rather than waiting up to 24h.
- Modify: `.github/actions/setup` usage / `GITHUB_TOKEN` wiring as the blog job already does
- Create: `docs/project-previews.md` (mirror `docs/blog-system.md`: source → refresh → verify + failure-mode table)
- Modify: relevant `AGENTS.md` (scripts + root) to list the new script/pipeline

**Approach:**
- Add the job alongside the existing blog-refresh job; pass `GITHUB_TOKEN`; stagger is unnecessary since it's the same workflow run. Change-gate so a no-op run doesn't commit.
- Document the verify step as a direct asset check (`curl -I https://mrbro.dev/project-previews/<id>.png` → 200 `image/png`), noting the SPA route returns 404 by design.

**Execution note:** `actionlint` must pass on the edited workflow.

**Test scenarios:** Test expectation: none — CI workflow + docs. Validated by `actionlint` and a manual/`workflow_dispatch` run.

**Verification:** A manual workflow run fetches and commits the current portfolio's images (or no-ops cleanly when unchanged); `actionlint` clean; `docs/project-previews.md` describes the contract and failure modes.

## System-Wide Impact

- **Interaction graph:** The transform is the single chokepoint feeding both the Projects page and Home featured section; one change covers both. The refresh script is a new isolated build-time actor sharing only a filename contract with the runtime.
- **State lifecycle risks:** Committed binary assets in `public/` grow with the portfolio; orphan cleanup is deferred. Atomicity handled via staging dir.
- **API surface parity:** No change to the `useGitHub` return shape or `Project` type — only `imageUrl` is now populated.
- **Bundle budget:** The committed PNGs ship in `dist/` and count against the enforced 2MB total (see Risks).
- **Unchanged invariants:** `UseProgressiveImage`, the card/modal render logic, and the portfolio/site-repo curation filter all remain as-is.

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Committed PNGs push the bundle over the 2MB budget (we just trimmed to 553KB via #199; ~6 cards ≈ 580KB → ~1.1MB) | Measure real byte size in the Unit 1 seed run; verify against `pnpm run analyze-build` (hard-fails over budget). Under budget for the current set; WebP/AVIF conversion is the deferred escape hatch if the set grows. |
| Undocumented `opengraph.githubassets.com` changes/blocks | Build-time isolation means a failure surfaces as "preview not refreshed," never a site outage or broken runtime; the fail-safe preserves the last-good committed assets. |
| Empty-200 silent-broken-image trap (the blog bug) | Content-Type + length + PNG magic-byte validation before write; live-smoke assertion that ≥1 image is non-empty. |
| New repo featured but image not yet refreshed (up-to-24h window) | Existing 404→hide path renders the gradient placeholder — same UX as today's image-less card; `workflow_dispatch` allows an on-demand refresh to close the gap immediately. |
| Stale preview for a repo made private/deleted keeps serving publicly | R9 privacy prune removes it on the next successful refresh; prune never fires on an uncertain (failed) listing fetch. |

## Documentation / Operational Notes

- New `docs/project-previews.md` runbook (source/refresh/verify + failure-mode table), mirroring `docs/blog-system.md`.
- `AGENTS.md` (root + scripts) updated to list `scripts/project-preview-refresh.ts` and the `public/project-previews/` asset convention.
- Verify preview assets by hitting the static URL directly, not the SPA route (404 by `spa-github-pages` design).

## Sources & References

- **Origin document:** `docs/brainstorms/2026-07-18-project-preview-images-requirements.md`
- Template pipeline: `scripts/blog-refresh.ts`, `.github/workflows/blog-refresh.yaml`, `docs/blog-system.md`
- Transform gap: `src/hooks/UseGitHub.ts` (`imageUrl: undefined`)
- Render path: `src/components/ProjectCard.tsx`, `src/components/ProjectPreviewModal.tsx`, `src/hooks/UseProgressiveImage.ts`, `src/styles/landing-page.css`
- Institutional learning: `docs/solutions/integration-issues/gist-list-api-omits-content-snapshot-empty-2026-07-18.md`
- Related shipped work: project-feed curation (`docs/plans/2026-07-18-001-feat-project-feed-curation-plan.md`, #195); source-map budget fix (#199)
