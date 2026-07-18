---
title: "feat: Curate projects feed by portfolio topic"
type: feat
status: active
date: 2026-07-18
---

# feat: Curate projects feed by portfolio topic

## Overview

Change the projects feed's inclusion rule so only repositories carrying the `portfolio` GitHub topic appear. Today's rule (`!fork && !archived && description`, sorted by stars, sliced to top 12) leaks non-portfolio repos — `.dotfiles` currently ranks #2 by stars, and `.github`, `containers`, `ha-config`, `infra`, `esphome.life` also surface. Curation becomes explicit and opt-in, mirroring the blog's frontmatter-gated model: to feature a repo, add the `portfolio` topic (`gh repo edit --add-topic portfolio`).

## Problem Frame

From the live-site audit: the portfolio's projects surface is polluted with config/infra/tooling repos that aren't portfolio pieces, because inclusion is a fork/archived/description heuristic ranked by stars. There is no signal that expresses author intent ("this repo is a portfolio piece"). GitHub topics already carry that intent and are self-serve to manage.

## Requirements Trace

- R1. Only repos tagged with the `portfolio` topic appear in the projects feed (Projects page and Home featured section).
- R2. The site's own repo (`marcusrbrown/marcusrbrown.github.io`) is excluded from its own projects feed by case-normalized `full_name` match even though it carries the `portfolio` topic.
- R3. Featuring/unfeaturing a repo stays self-serve via GitHub topics — no code change per repo.
- R4. An empty tagged set degrades to the existing projects empty state, not a crash or broken layout.
- R5. Existing feed tests are reconciled to the new rule and new inclusion/exclusion behavior is covered.
- R6. Every repo carrying the `portfolio` topic appears — no post-gate count cap silently drops tagged repos.

## Scope Boundaries

- Curation is by the `portfolio` topic only — no name-pattern blocklist, no in-repo allowlist constant, no star/homepage thresholds.
- No change to the client-side technology/type/status filter UI (`UseProjectFilter`).

### Deferred to Separate Tasks

- Project preview images (`imageUrl` still hardcoded `undefined`): deferred to a separate project-preview-media task.

## Context & Research

### Relevant Code and Patterns

- `src/hooks/UseGitHub.ts` — repo→project transform at ~L227-247: `repos.filter(r => !r.fork && !r.archived && r.description)` → sort by stars desc → `slice(0, 12)` → map to `Project`. This is the single inclusion chokepoint; both surfaces consume its output.
- `src/hooks/UseGitHub.ts` ~L86-103 — repo shape validation already recognizes optional `topics`, so the field is available on the validated repo object.
- `src/pages/Projects.tsx` and `src/pages/Home.tsx` — both render `useGitHub().projects` through `ProjectGallery`; neither filters independently.
- `src/components/ProjectGallery.tsx` — already renders an empty state when the project list is empty (satisfies R4 without new UI).
- `src/types/index.ts` — `Project` and the GitHub repo data shape (`topics` present).

### Institutional Learnings

- `docs/solutions/` currently holds only the gist-API snapshot learning — unrelated to feed curation. No applicable prior art.

## Key Technical Decisions

- **Topic allowlist (opt-in) over blocklist/heuristic**: expresses author intent explicitly and self-serve; avoids brittle name/topic exclusion lists that need upkeep as new repos appear. (Chosen over opt-out blocklist and in-code allowlist.)
- **Named constant** `PORTFOLIO_TOPIC = 'portfolio'` rather than a bare string literal, so the curation signal is discoverable and single-sourced.
- **Site-repo self-exclusion**: exclude the site's own repo by matching its `full_name` (`marcusrbrown/marcusrbrown.github.io`), case-normalized — not the bare `name`, which breaks on rename or org move (adversarial F1). Keep the exclusion a single named predicate, not a general blocklist.
- **Allowlist is authoritative — no post-gate cap**: drop the legacy top-12 star slice (adversarial F3). Once inclusion is explicit via the `portfolio` topic, a count cap would silently hide explicitly-tagged repos. Retain the star sort for display order only.
- **Transition ordering**: the six portfolio repos were tagged before this code ships, so the live feed does not go empty during rollout. (Already completed: `systematic`, `dev-like`, `extend-vscode`, `sparkle`, `tokentoilet`, `vbs`.)

## Open Questions

### Resolved During Planning

- Curation signal? → `portfolio` GitHub topic (opt-in allowlist).
- Does the site repo self-list? → No; explicit self-exclusion (R2).
- Feed empty during rollout? → No; repos tagged before ship.

### Deferred to Implementation

- Exact placement of the `PORTFOLIO_TOPIC` constant and the self-exclusion predicate within `UseGitHub.ts` (co-located with the transform vs module-top) — implementer's call at edit time.
- **Forked portfolio repos** (adversarial F4): the retained `!fork` filter excludes a fork even if tagged `portfolio`. Accepted for now (no forked portfolio pieces today); revisit if a fork ever needs featuring.
- **Home featured ordering** (design-lens F5): with ~6 tagged repos and a Home cap of 6, star-order selection is moot. If the tagged set grows beyond the Home cap, add an explicit featured priority.
- **Curation-aware empty state** (design-lens F6): the current generic empty-state copy pre-exists this change; a curation-aware message is a separate polish task, not required for this rule change.

## Implementation Units

- [ ] **Unit 1: Portfolio-topic inclusion rule + site-repo self-exclusion**

**Goal:** The repo→project transform includes only repos carrying the `portfolio` topic and excludes the site's own repo.

**Requirements:** R1, R2, R3, R4

**Dependencies:** None (target repos already tagged).

**Files:**
- Modify: `src/hooks/UseGitHub.ts`
- Test: `tests/hooks/UseGitHub.test.ts`

**Approach:**
- Add `PORTFOLIO_TOPIC = 'portfolio'` constant.
- Extend the existing transform predicate to also require `(repo.topics ?? []).includes(PORTFOLIO_TOPIC)` and to exclude the site's own repo by case-normalized `full_name` (`marcusrbrown/marcusrbrown.github.io`), so a rename/casing change fails loudly in tests rather than silently self-listing.
- Treat missing/undefined `topics` as "not portfolio" → excluded (safe default). GitHub normalizes topics to lowercase, so a lowercase `'portfolio'` compare is safe.
- Drop the legacy top-12 slice — the topic allowlist is now the authoritative gate, so every tagged repo appears. Keep the star sort for display order and the fork/archived/description filters unchanged.

**Patterns to follow:**
- The current filter/sort/slice chain in `UseGitHub.ts`; keep the predicate readable (named boolean(s) over a long inline `&&`).

**Test scenarios:**
- Happy path: a non-fork, non-archived, described repo tagged `portfolio` is included and mapped to a `Project`.
- Edge case: a repo meeting all legacy criteria (non-fork/non-archived/description) but WITHOUT the `portfolio` topic is excluded.
- Edge case: a repo with `topics` undefined is excluded (no crash).
- Edge case (R2): the site repo (`full_name` `marcusrbrown/marcusrbrown.github.io`) tagged `portfolio` is excluded; a differently-cased `full_name` is still excluded.
- Edge case (R6): 13+ repos tagged `portfolio` all appear — none dropped by a count cap.
- Edge case (R4): zero tagged repos → transform returns an empty project list (drives the existing empty state).
- Regression: fork/archived/missing-description repos remain excluded as before.

**Verification:**
- `UseGitHub` returns only `portfolio`-tagged, non-site repos; forked/archived/untagged/site repos never appear.

- [ ] **Unit 2: Reconcile dependent feed tests and fixtures**

**Goal:** Tests that exercise the transform or assert feed contents reflect the new inclusion rule.

**Requirements:** R5

**Dependencies:** Unit 1

**Files:**
- Test: `tests/hooks/UseGitHub.test.ts` (fixtures that expect inclusion now carry the `portfolio` topic)
- Test: `tests/pages/Home.test.tsx`, `tests/pages/Projects.test.tsx`, `tests/components/ProjectGallery.test.tsx` (only where they feed raw repo payloads through the real transform or assert on repo-derived counts; leave those that mock `projects` output directly)

**Approach:**
- Audit each covering test: those that mock `useGitHub().projects` directly are unaffected; those that pass repo fixtures through the real hook/transform need the `portfolio` topic added to fixtures expected to appear.
- Do not weaken assertions to pass — update fixtures to the new contract.

**Test scenarios:**
- Integration: existing "forked/archived filtered out" assertions still hold with the topic gate added.
- Happy path: a fixture repo updated with the `portfolio` topic still renders through Home featured + Projects surfaces.

**Verification:**
- Full unit suite green with no assertion weakened to accommodate the change.

- [ ] **Unit 3: Document the portfolio-topic curation convention**

**Goal:** The opt-in curation rule is discoverable so featuring a repo stays self-serve.

**Requirements:** R3

**Dependencies:** Unit 1

**Files:**
- Modify: `src/hooks/AGENTS.md` (or the nearest existing convention doc) — one concise entry documenting the opt-in contract: the projects feed shows ONLY repos carrying the `portfolio` topic; an untagged/newly-created/topic-stripped repo is silently invisible **by design**; feature/unfeature via `gh repo edit <repo> --add-topic portfolio` / `--remove-topic portfolio`; the site repo is self-excluded even when tagged.

**Approach:**
- A short, operational note matching the file's existing density — no marketing prose. Make explicit that "untagged = not shown" is the intended contract (product-lens/adversarial F2), so a forgotten tag is a known, documented consequence rather than a silent bug.

**Test expectation:** none — documentation only.

**Verification:**
- A reader can determine how to feature/unfeature a project without reading the hook source.

## System-Wide Impact

- **Interaction graph:** Single chokepoint (`UseGitHub` transform) feeds both Home featured and Projects surfaces; one change covers both.
- **API surface parity:** No change to the hook's return shape or the `Project` type — only which repos populate the list.
- **State lifecycle risks:** None; pure in-memory filter over already-fetched repos. Existing cache/abort/rate-limit paths unchanged.
- **Unchanged invariants:** Fork/archived/description filters, star sort (for order), and the client filter UI all remain as-is. The top-12 slice is intentionally removed (see Key Technical Decisions).

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Feed goes empty if `portfolio` topics are missing at ship | Six portfolio repos already tagged before this lands; empty set still degrades to the existing empty state. |
| Downstream tests silently pass by mocking `projects` and miss the new rule | Unit 2 explicitly audits which tests feed the real transform vs mock output; only the former get fixture updates. |
| Future portfolio repos forgotten (untagged → invisible) | Convention documented (Unit 3); tagging is a one-line self-serve `gh` command. |

## Sources & References

- WU-2 recon: fetch→filter→render map of `src/utils/github.ts` → `src/hooks/UseGitHub.ts` → `src/pages/Projects.tsx` / `src/pages/Home.tsx` / `src/components/ProjectCard.tsx`.
- Live-site audit (project-feed curation work unit).
