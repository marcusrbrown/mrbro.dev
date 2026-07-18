---
title: "Gist list API omits file content; build-time blog snapshot always empty"
date: 2026-07-18
category: integration-issues
module: blog content pipeline
problem_type: integration_issue
component: tooling
symptoms:
  - Blog snapshot always produced zero posts
  - Frontmatter could not be parsed from any candidate gist
  - Every candidate gist was silently excluded from the published list
  - Unit tests passed despite the bug due to fixture infidelity
  - Live blog-refresh run returned 0 posts, misread as no qualifying gists
root_cause: wrong_api
resolution_type: code_fix
severity: high
tags: [github-api, gist, build-time, blog, snapshot, fixture-fidelity, integration]
---

## Gist list API omits file content; build-time blog snapshot always empty

## Problem

`scripts/blog-refresh.ts` read each gist's Markdown file content from the `GET /users/<user>/gists` **LIST** response, but that endpoint returns only file metadata (`filename`, `type`, `raw_url`, `size`) — never the `content` field. Content exists only on the **DETAIL** endpoint (`GET /gists/:id`) or via each file's `raw_url`. Every candidate's frontmatter split therefore saw an empty file and returned `null`, so `buildSnapshot` silently excluded every post. `src/data/blog-snapshot.json` always contained zero posts and the entire build-time blog was a dead branch in production — while CI stayed green.

User-visible impact: a deployed site advertising `/blog` rendered the SPA shell with no post links, no `/blog/<slug>` pages, no RSS items, and no sitemap entries.

## Symptoms

- `pnpm run blog-refresh` (live, real account) printed `0 post(s), N excluded` even though the account had gists carrying valid `---\ntitle: …` frontmatter.
- `src/data/blog-snapshot.json` had `"posts": []` after every refresh; `generatedAt` still updated, making the empty payload look like "no qualifying posts" rather than "unreadable by construction."
- `/blog` had no post links; `/blog/<slug>`, `/feed.xml`, `/sitemap.xml` were missing or empty.
- Unit tests for `splitFrontmatter`, `buildSnapshot`, and `selectMarkdownSource` all passed.
- CI (lint → test → build → deploy) completed with no failures; no crash, no non-zero exit, no API-shape warning.
- The script reported success and overwrote a previously-good snapshot with an empty one.
- Code review of the GitHub API contract flagged it; the runtime never did.

## What Didn't Work

- **Fixture-infidel unit tests.** Fixtures hand-built candidates as `files: {[name]: {content: '…'}}` — the shape of the DETAIL endpoint — while the live code read the LIST endpoint (`files: {[name]: {filename, type, raw_url, size, …}}`, no `content`). Tests and code were each internally consistent and both externally wrong, so the suite could never catch it.
- **Live "smoke" runs.** `pnpm run blog-refresh` printing `0 post(s), N excluded` was misread as "no gists qualify yet." Nothing asserted that at least one candidate's content had actually been split into frontmatter+body, so an always-empty result looked legitimate.
- **Green CI as a correctness signal.** Passing lint/typecheck/tests/build/deploy is a hygiene signal, not a behavior signal — the GitHub API contract was never exercised end-to-end.
- **No review of the API contract.** The bug only surfaced when a reviewer read `GET /users/{username}/gists` docs and noticed the script consuming the LIST payload as if it carried file bodies.

## Solution

Stop trusting the LIST endpoint for content. Fetch each candidate's DETAIL (`GET /gists/:id`) before any frontmatter split or validation, bound the fetch with `AbortSignal.timeout`, and make any content-fetch failure (non-2xx, timeout, `truncated: true`, or a detail payload missing the Markdown file) a hard error that exits non-zero and leaves the prior snapshot untouched.

### Content fetch — before vs after

**Before** (broken): the LIST payload was fed to `toCandidate`, whose `files` map had no `content`, so `selectMarkdownSource` returned "No Markdown file found in gist" for every gist.

```ts
// broken
const gists = await fetch(`https://api.github.com/users/${user}/gists`)
const data = await gists.json()
const candidates = data.map(toCandidate).filter(Boolean) // files: no content → all dropped
```

**After**: the LIST response only enumerates IDs / `html_url` / `updated_at`; each candidate's content comes from the DETAIL endpoint, and any failure is fatal.

```ts
// LIST → enumerate + paginate; DETAIL → real content
const readGists = async (username, headers) => {
  const gists = []
  let url = `https://api.github.com/users/${username}/gists?per_page=100`
  while (url) {
    const response = await fetch(url, {headers, signal: AbortSignal.timeout(30_000)})
    if (!response.ok) throw new Error(`GitHub request failed (${response.status}): ${url}`)
    const data = await response.json()
    if (!isGistArray(data)) throw new Error(`Unexpected gist list shape: ${url}`)
    gists.push(...data)
    url = nextLink(response)             // follow Link rel="next" to exhaustion
  }
  return gists
}

const fetchCandidates = async (gists, headers) => {
  const candidates = []
  for (const gist of gists) {
    const hasMd = Object.keys(gist.files ?? {}).some(n => n.toLowerCase().endsWith('.md'))
    if (!hasMd || typeof gist.id !== 'string') continue
    const detail = await fetch(`https://api.github.com/gists/${encodeURIComponent(gist.id)}`,
      {headers, signal: AbortSignal.timeout(30_000)})
    if (!detail.ok) throw new Error(`GitHub request failed (${detail.status}): gist ${gist.id}`)
    const body = await detail.json()
    if (!isGist(body)) throw new Error(`Unexpected gist detail for ${gist.id}`)
    if (Object.values(body.files ?? {}).some(f => f.truncated === true))
      throw new Error(`Gist ${gist.id} contains truncated file content`)
    const candidate = toCandidate(body)  // NOW files[*].content is real
    if (!candidate) throw new Error(`Gist ${gist.id} detail missing required metadata`)
    candidates.push(candidate)
  }
  return candidates
}
```

Any throw bubbles to `refreshBlogSnapshot`'s outer `try/catch`, which logs the failure, sets `process.exitCode = 1`, and skips the write — the previous `blog-snapshot.json` stays byte-identical.

### Related fixes from the same hardening round

- **Pagination.** `readGists` walks `Link` `rel="next"` until exhausted; a single ≤100-gist page is no longer assumed. Absent-from-page-1 gists were being treated as deleted → a published post could silently drop once the account exceeds 100 gists.
- **Corrupt previous snapshot is fatal.** `readPreviousSnapshot` bootstraps an empty registry **only** on `ENOENT`. A JSON parse error, schema mismatch, or other I/O error is rethrown and short-circuits before any fetch or write, so a corrupt file can't silently reset the slug registry.
- **Fail-safe ordering — `wasPublished` first.** In `buildSnapshot`, `wasPublished = previousByGistId.has(candidate.gistId)` is computed **before** URL/frontmatter validation. An invalid URL (or invalid frontmatter, or bad source selection) on a previously-published post hard-fails and returns the prior snapshot untouched; the same failure on a brand-new candidate warns-and-excludes-and-continues.
- **Atomic write.** Snapshot is written to a temp file then `renameSync`-promoted; a crash mid-write can't truncate the artifact. Temp file is best-effort unlinked on failure, original error preserved.
- **Fetch budget.** Every `fetch` passes `signal: AbortSignal.timeout(30_000)`; a `TimeoutError` becomes a descriptive error so a hung connection can't pin CI.
- **Authenticated rate limits.** The script reads `options.token ?? process.env.GITHUB_TOKEN` and sets `authorization: Bearer …`; the workflow passes `GITHUB_TOKEN` so a LIST traversal + N DETAIL calls hit the 5,000/hr budget, not anonymous 60/hr.

## Why This Works

The root cause is a contract confusion between two gist endpoints:

| Endpoint | Returns file `content`? | Used for |
| --- | --- | --- |
| `GET /users/{username}/gists` (LIST) | **No** — `filename`, `type`, `raw_url`, `size`, `truncated`, `language` only | Enumerating gist IDs, `html_url`, `updated_at` |
| `GET /gists/{id}` (DETAIL) | **Yes** — each file's `content` (or `truncated: true`) | Reading the Markdown body |

The old code passed the LIST payload to `toCandidate`, which kept only files with a string `content`; since LIST never carries `content`, every file was dropped and every candidate excluded. Routing LIST to enumeration-only and fetching DETAIL per candidate means the DETAIL shape — which the original fixtures were already modeling — is the only thing reaching `toCandidate`, closing the fixture-fidelity gap at the same time: tests and production now consume the same shape. Combined with `wasPublished`-first ordering, atomic rename, the corrupt-snapshot guard, timeouts, and authenticated fetches, the script degrades loudly (non-zero exit, untouched file) instead of silently shipping an empty snapshot.

## Prevention

- **Test against the real API shape, not a convenience shape.** Fixtures must mirror the actual endpoint (LIST vs DETAIL). Add a test that consumes a recorded/schema-validated response and asserts the boundary (`parseListResponse` rejects payloads without `raw_url`; `parseDetailResponse` requires `content`). A fixture with `content: ''` encodes the bug.
- **Assert non-empty content end-to-end.** Any `buildSnapshot` test should assert every candidate file has `content.length > 0`; better, run `fetchCandidates` against a recorded fixture and assert non-empty Markdown.
- **Live smoke run with a known-good assertion.** A CI/pre-merge check that runs the refresh against an account with ≥1 valid post and asserts `posts.length > 0`. "0 posts, N excluded" must not be a passing outcome when a known-good post exists.
- **Schema-validate parsed JSON at every boundary**, not just `typeof`. A missing/empty `content` should be a parse error, not a silently-empty candidate.
- **Pagination is mandatory.** Any list-endpoint consumer with a `Link` header follows `rel="next"` to exhaustion, or fails loudly.
- **Fail-safe ordering rule.** Compute "is this in the previous good state?" **before** any per-item validation. Per-item failures on previously-published items are fatal and return the prior good state; failures on new items are warnings. Mixing them silently drops published content.
- **Distinguish "absent" from "unreadable" for on-disk state.** `ENOENT` is the only bootstrap-empty path; any other read/parse/schema error is fatal.
- **Atomic writes** (temp + `renameSync`) for any artifact the build treats as source of truth and can't regenerate.
- **Bound every network call** with `AbortSignal.timeout` and convert `TimeoutError` into a descriptive error.
- **Authenticate when a token exists** — pass the workflow `GITHUB_TOKEN` to any script hitting a rate-limited API once you ship pagination + per-item detail fetches.

### Adjacent gotchas (same feature, different traps)

- **Prerendering needs `StaticRouter`.** `renderToStaticMarkup` of `/blog/<slug>` pages must wrap the route tree in `StaticRouter` (react-router-dom/server); the client app uses `BrowserRouter` and React Router hooks throw without router context. Export a dedicated prerender entry that mounts `StaticRouter` from a `location` prop rather than reusing the client `App` verbatim.
- **GitHub Pages SPA 404 verification trap.** The `spa-github-pages` `404.html` redirect makes every client-only route (`/blog`, `/about`) return HTTP 404 to `curl` **by design** — `curl -f https://mrbro.dev/blog` failing is expected, not a regression. Only prerendered artifacts are real HTTP 200s: `/blog/<slug>`, `/feed.xml`, `/sitemap.xml`, static assets. Verify those, not the SPA shell routes.
- **Visual test baselines are write-only.** `tests/visual/` writes screenshots as per-run artifacts and does **not** `toMatchSnapshot()`-diff them, so CI cannot catch a visual regression. Shared-CSS/design changes need a manual before/after byte comparison of `tests/visual/screenshots/` until the harness asserts on diffs.

## Related Issues

- Issue #39 — "Blog post titles and content not displayed on /blog and home page" (closed) — earlier symptom in the same content-mapping area.
- `docs/blog-system.md` — publishing runbook; its failure-modes section should note the LIST-vs-DETAIL content trap.
- `docs/brainstorms/2026-07-17-first-party-blog-requirements.md` and `docs/plans/2026-07-17-001-feat-first-party-blog-plan.md` — origin requirements and implementation plan for this feature.
