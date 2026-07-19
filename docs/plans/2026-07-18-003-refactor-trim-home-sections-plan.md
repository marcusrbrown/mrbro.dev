---
title: 'refactor: Trim six sections from the Home page'
type: refactor
status: active
date: 2026-07-18
---

# refactor: Trim six sections from the Home page

## Overview

Cut six sections from the Home page and delete the components they own once nothing else uses them. The remaining Home is Hero → a reduced About (header + story paragraphs only) → Featured Projects → Latest Blog Posts. The standalone `/about` route is untouched.

## Problem Frame

The Home page has grown into a long marketing-style scroll (skills grid, animated stat counters, career timeline, testimonials carousel, two separate contact CTAs). Marcus wants it trimmed to the essentials. The six named cuts are:

| Requested cut | In code | Location |
|---|---|---|
| Skills & Expertise | `SkillsShowcase` component | `Home.tsx` |
| About Me info cards (stats) | `AnimatedCounters` block | inside `AboutSection.tsx` |
| Professional Journey | `CareerTimeline` block | inside `AboutSection.tsx` |
| What People Say | `TestimonialsCarousel` block | inside `AboutSection.tsx` |
| "Interested in working together…" CTA | inline `about-cta` markup | inside `AboutSection.tsx` |
| Let's Work Together | `ContactCta` component | `Home.tsx` |

## Requirements Trace

- R1. Remove all six sections from the rendered Home page.
- R2. Reduced About section retains only its header ("About Me" + subtitle) and the three story paragraphs.
- R3. Fully delete the five components orphaned by the cuts, plus their tests, styles, and any utility left with no remaining consumer (design-for-deletion — no dead code left behind).
- R4. Preserve a contact affordance: repoint the Hero's "Get In Touch" secondary button from the removed `#contact` anchor to `mailto:hello@mrbro.dev`.
- R5. Remove now-dead in-page navigation (the `skills` and `contact` entries in `SmoothScrollNav`).
- R6. Build, type-check, lint, unit suite, and the CSS/bundle budget gate all stay green; no broken anchors or dangling imports.

## Scope Boundaries

- The standalone `/about` route (`src/pages/About.tsx`) is not touched — it does not use any of these components.
- The About section's header, story paragraphs, and background decorative elements (parallax circles/grid) stay.
- No visual redesign of the surviving sections — this is removal only.

### Deferred to Separate Tasks

- WU-6 theme activation and any other audit threads remain separate.

## Context & Research

### Relevant Code and Patterns

- `src/pages/Home.tsx` — renders `SkillsShowcase` (lines 80-83) and `ContactCta` (line 124) directly; also holds `skillsRef` section-tracking (line 32) tied to the skills wrapper.
- `src/components/AboutSection.tsx` — composes four sub-blocks to be removed: Professional Statistics/`AnimatedCounters` (106-118), Professional Journey/`CareerTimeline` (120-133), Testimonials/`TestimonialsCarousel` (135-138), and the inline `about-cta` (140-161). Header (56-72) and story (74-104) stay; bg elements (164-177) stay.
- `src/components/HeroSection.tsx:45-46` — `secondaryCTA = 'Get In Touch'`, `secondaryHref = '#contact'`. Repoint the href to `mailto:hello@mrbro.dev`; keep the label.
- `src/components/SmoothScrollNav.tsx:35-42` — `DEFAULT_NAV_ITEMS` includes `skills` and `contact`; both target removed sections.

### Orphan Analysis (verified via import grep)

- `SkillsShowcase`, `ContactCta` — imported only by `Home.tsx`.
- `AnimatedCounters`, `CareerTimeline`, `TestimonialsCarousel` — imported only by `AboutSection.tsx`.
- `src/utils/animation-utils.ts` — imported only by `SkillsShowcase` and `AnimatedCounters` (both deleted). Orphaned after this work **pending a full-repo reference sweep** (grep covered `*.tsx` under `src/`; confirm no `.ts` consumer before deleting).
- Test files present: `SkillsShowcase`, `AnimatedCounters`, `CareerTimeline`, `TestimonialsCarousel` each have a `tests/components/*.test.tsx`; `animation-utils` has `tests/utils/animation-utils.test.ts`. `ContactCta` has **no** test file.
- `AboutSection.test.tsx` mocks the three sub-components and asserts the "Professional Journey" heading — it must be **updated**, not deleted.
- Hooks stay: `useParallax` (still used by the reduced AboutSection bg elements), `useScrollAnimation` (used widely).

### Institutional Learnings

- Visual baselines in `tests/visual/screenshots/` are write-only (no `toMatchSnapshot` diff); do not treat regenerated baselines as verification, and avoid committing spurious baseline churn.
- CSS budget is a hard gate in `scripts/analyze-build.ts` (emitted CSS < 100 KB); this work *reclaims* budget rather than spending it.

## Key Technical Decisions

- **Full delete over unmount:** orphaned components, their tests, their CSS, and orphaned utils are removed entirely (Marcus's design-for-deletion default), not left as dead code.
- **Hero button → mailto:** keeps a contact path once the contact section is gone, matching the `mailto:hello@mrbro.dev` already used in `ContactCta`.
- **`animation-utils` deletion is conditional:** delete only if the implementation-time full-repo sweep confirms zero remaining consumers; otherwise keep it.

## Open Questions

### Resolved During Planning

- What does "About Me info cards" mean? — The animated stat cards (`AnimatedCounters`); the About header + story paragraphs stay. (Confirmed by Marcus.)
- Delete vs unmount? — Full delete. (Confirmed.)
- Contact affordance after removing the contact section? — Repoint Hero button to mailto. (Confirmed.)

### Deferred to Implementation

- Exact set of orphaned CSS class families to remove from `landing-page.css` — enumerate at edit time from the deleted components' class usage.
- Whether any E2E/accessibility/integration test (beyond `AboutSection.test`) asserts the presence of a removed section or `#contact` navigation — resolve via a reference sweep during Unit 4.

## Implementation Units

- [ ] **Unit 1: Reduce Home + AboutSection, repoint Hero, trim nav**

**Goal:** Remove the six sections from the rendered output and fix the two consequences (Hero anchor, nav items) in one behavior-visible change that leaves tests green.

**Requirements:** R1, R2, R4, R5

**Dependencies:** None

**Files:**
- Modify: `src/pages/Home.tsx` (remove `SkillsShowcase` + `ContactCta` render blocks and imports; remove the `skillsRef` section-tracking and its wrapper)
- Modify: `src/components/AboutSection.tsx` (remove the four sub-blocks + their imports, refs, and scroll-animation hooks that become unused; keep header, story, bg elements)
- Modify: `src/components/HeroSection.tsx` (`secondaryHref` → `mailto:hello@mrbro.dev`)
- Modify: `src/components/SmoothScrollNav.tsx` (drop `skills` and `contact` from `DEFAULT_NAV_ITEMS`)
- Modify: `tests/components/AboutSection.test.tsx` (remove mocks + assertions for the removed sub-blocks)
- Test: `tests/components/AboutSection.test.tsx`, `tests/components/HeroSection.test.tsx` (if it asserts the secondary href), `tests/components/SmoothScrollNav.test.tsx` (if it asserts the removed items)

**Approach:**
- Delete render markup and the corresponding imports together so no dangling references remain.
- In `AboutSection`, remove only the `countersRef`/`timelineRef` scroll-animation hooks tied to deleted blocks; leave `headerRef`, `storyRef`, and the parallax hooks intact.
- In `Home`, drop the `skills` section-tracking ref; keep `about`, `projects`, `blog` refs.

**Patterns to follow:** existing JSX/section structure in the same files; keep the reduced About markup consistent with the retained header/story styling.

**Test scenarios:**
- Happy path: Home renders Hero, About (header + story), Featured Projects, Latest Blog — and does NOT render Skills, stats counters, timeline, testimonials, the about-cta text, or the "Let's Work Together" contact section.
- Happy path: reduced `AboutSection` renders the "About Me" heading and the three story paragraphs; asserts the removed headings ("Professional Journey", "What People Say") are absent.
- Edge case: Hero secondary button renders with `href="mailto:hello@mrbro.dev"` and retains its "Get In Touch" label.
- Edge case: `SmoothScrollNav` renders four items (Home, About, Projects, Blog) and not Skills/Contact.

**Verification:** Home and About render the reduced layout; `pnpm test` green; no unused-import or dangling-ref lint/tsc errors.

- [ ] **Unit 2: Delete orphaned components, tests, and orphaned util**

**Goal:** Remove the now-unused component files, their tests, and `animation-utils` if fully orphaned.

**Requirements:** R3

**Dependencies:** Unit 1 (imports removed first, so deletions leave the build green)

**Files:**
- Delete: `src/components/SkillsShowcase.tsx`, `src/components/AnimatedCounters.tsx`, `src/components/CareerTimeline.tsx`, `src/components/TestimonialsCarousel.tsx`, `src/components/ContactCta.tsx`
- Delete: `tests/components/SkillsShowcase.test.tsx`, `tests/components/AnimatedCounters.test.tsx`, `tests/components/CareerTimeline.test.tsx`, `tests/components/TestimonialsCarousel.test.tsx`
- Delete (conditional): `src/utils/animation-utils.ts`, `tests/utils/animation-utils.test.ts` — only if the full-repo sweep confirms no remaining consumer

**Approach:**
- Before deleting `animation-utils`, run a full-repo reference sweep (all extensions, not just `*.tsx`). Delete only on zero remaining consumers; otherwise keep and note why.
- After deletions, confirm no import anywhere still points at a removed path.

**Test expectation:** none — pure deletion of components and their own tests. Coverage is preserved by removing tested code alongside its tests; confirm the coverage gate still passes.

**Verification:** `pnpm test` green (fewer files), `tsc` clean, `pnpm lint` clean; grep for each deleted symbol returns no live import.

- [ ] **Unit 3: Remove orphaned CSS families**

**Goal:** Strip the CSS for the deleted sections from `landing-page.css`, reclaiming budget headroom.

**Requirements:** R3, R6

**Dependencies:** Unit 1, Unit 2

**Files:**
- Modify: `src/styles/landing-page.css` (remove `.skills-*`, `.about-counters`, `.about-timeline`, `.about-testimonials`, `.about-cta*`, `.contact-cta*`, `.contact-method*`, `.contact-availability*`, `.availability-dot`, `.testimonial-*` families — enumerate exactly from the deleted components' class usage; keep `.about-section`, `.about-story*`, `.about-bg-*`, and shared `.section-*` rules)

**Approach:**
- Cross-check each candidate class against the surviving markup before removing, so no rule still in use is deleted.
- Treat any shared utility class (e.g., `.section-header`, `.btn--*`) as keep.

**Test expectation:** none — styling removal with no behavioral change. Verified via the build/budget gate and a visual spot-check.

**Verification:** `pnpm build` succeeds; `pnpm run analyze-build` exits 0 with emitted CSS **below** the prior 99.9 KB (reclaim confirmed); reduced Home renders correctly in both themes on a spot-check.

- [ ] **Unit 4: Reconcile tests, baselines, and docs**

**Goal:** Close out remaining references — integration/E2E/accessibility tests, visual baselines, and doc counts.

**Requirements:** R6

**Dependencies:** Unit 1, Unit 2, Unit 3

**Files:**
- Modify (as the sweep finds): any `tests/e2e/*`, `tests/accessibility/*`, or integration test asserting a removed section or `#contact` navigation
- Modify: `tests/visual/screenshots/` — only the baselines that legitimately change (hero, home, about, projects surfaces); do not mass-regenerate unrelated baselines
- Modify: `src/components/AGENTS.md` (component count 23 → 18), root `AGENTS.md` (structure counts; utils 13 → 12 if `animation-utils` deleted)

**Approach:**
- Run a reference sweep for `SkillsShowcase`, `ContactCta`, `AnimatedCounters`, `CareerTimeline`, `TestimonialsCarousel`, and `#contact` across `tests/` to find anything Unit 1 didn't already cover.
- For visual baselines, follow the write-only-baseline discipline: refresh only the intentionally-changed surfaces and revert incidental churn.

**Test scenarios:**
- Integration/E2E: the affected page specs pass against the reduced layout; no spec still expects a removed section or a `#contact` in-page jump.
- Accessibility: axe audits pass on the reduced Home (no orphaned `aria` targets from removed anchors).

**Verification:** full `pnpm test` + relevant E2E/a11y suites green; AGENTS counts match ground truth (`git ls-files`); no stray baseline churn in the diff.

## System-Wide Impact

- **Interaction graph:** `#contact` was targeted by the Hero secondary button (repointed to mailto) and the removed about-cta (deleted). After the cuts, no live element references `#contact` or `#skills`.
- **API surface parity:** none — these are page-level components with no external consumers.
- **Unchanged invariants:** `/about` route, About header/story, Hero primary CTA, Projects and Blog sections, theme system, and all retained shared CSS utilities are unaffected.
- **Budget:** deleting Skills/Contact/testimonials/timeline/counters CSS reclaims headroom against the 100 KB CSS gate (currently 99.9 KB) — a net positive side effect.

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| A test or E2E spec elsewhere asserts a removed section and fails | Unit 4 reference sweep across `tests/` before finalizing |
| Deleting `animation-utils` breaks a non-tsx consumer | Deletion is conditional on a full-repo, all-extension sweep |
| Removing a CSS class still used by surviving markup | Cross-check each class against retained JSX before removal |
| Spurious visual-baseline churn muddies the diff | Refresh only intentionally-changed baselines; revert the rest |

## Sources & References

- Related code: `src/pages/Home.tsx`, `src/components/AboutSection.tsx`, `src/components/HeroSection.tsx`, `src/components/SmoothScrollNav.tsx`
- Related prior work: #191/#198 (Hero CTA), #202 (preview images), CSS budget gate in `scripts/analyze-build.ts`
