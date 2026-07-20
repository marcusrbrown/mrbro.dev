---
date: 2026-07-19
topic: theme-preset-picker
---

# Theme Preset Picker Requirements

## Summary

Replace the header's cycle-only theme toggle with a single button that opens a compact picker for System, Light, Dark, and all 12 named presets. Visitors can reach every existing theme from one control instead of cycling through only three modes.

---

## Problem Frame

The shipped header control only cycles between light, dark, and system preference — the 12 preset themes already defined in the app are unreachable from this control. The full theme customizer exists but carries modal dialog and editing-state complexity that isn't needed just to let someone pick a preset.

---

## Key Flows

### F1. Choose and compare a theme

- **Trigger:** Visitor clicks the theme button in the header.
- **Steps:** Picker opens showing System, Light, Dark, and all 12 presets, with the active choice marked and brought into view. Visitor selects an option; it applies and persists immediately, the active indicator updates, focus stays on that option, and the picker stays open. Visitor selects a different option to compare; it replaces the prior choice the same way.
- **Outcome:** Visitor lands on their preferred theme having seen it applied live, without the picker closing between choices.
- **Covered by:** R1, R2, R3, R4, R5, R6, R13

### F2. Keyboard and dismissal flow

- **Trigger:** Visitor operates the picker via keyboard, or dismisses it by any method.
- **Steps:** Visitor opens the picker with the button, moves through the single-select choices with arrow keys, and selects with Enter or Space. Escape returns focus to the button; Tab or an outside click closes the picker without stealing focus from the visitor's next target.
- **Outcome:** The picker is fully operable without a mouse, and whatever theme was last selected remains active after dismissal.
- **Covered by:** R5, R7, R11, R12, R13, R14

---

## Requirements

**Access and structure**

- R1. A single header button replaces the current cycle-only toggle and opens a theme picker.
- R2. The picker is a compact, non-modal surface rather than a full-page or full-screen dialog.
- R3. The picker lists exactly System, Light, Dark, and all 12 existing named presets, with no search or filter control.

**Selection behavior**

- R4. Only one choice is active and restored at a time; selecting System, Light, or Dark clears any preset override, and selecting a preset makes that preset the sole active choice.
- R5. Selecting an option applies and persists the theme immediately without a separate confirmation action; reloading restores that exact last choice.
- R6. The picker remains open after a selection so the visitor can continue comparing other options; selecting the active choice again leaves state unchanged.
- R7. Dismissing the picker never reverts or undoes the currently selected theme.

**System behavior**

- R8. When System is active, the rendered theme tracks the OS light/dark preference in real time.
- R9. When a preset, Light, or Dark is active, the rendered theme stays fixed when the OS preference changes.
- R10. With no stored preference, System remains active across reloads until the visitor selects another choice.

**Interaction and accessibility**

- R11. The picker follows a single-select keyboard model: arrow keys move between choices, Enter or Space selects, and Tab can leave without trapping focus.
- R12. The picker closes via Escape, Tab focus leaving the picker, an outside click/tap, or the trigger button; only Escape forces focus back to the trigger.
- R13. The active choice is conveyed visually and through programmatic selected state, and the trigger's accessible name identifies the current choice.
- R14. The picker stays within desktop and mobile viewports, uses internal scrolling when height is constrained, keeps visible focus indicators, and introduces no motion beyond existing reduced-motion-aware theme transitions.
- R15. If an unrecognized user-authored custom theme is active, the picker preserves it and shows a read-only “Current: Custom theme” status outside the 15 listed choices until the visitor deliberately selects one.

---

## Acceptance Examples

- AE1. **Covers R8, R10.** Given a first-time visitor with no stored preference, when the site loads, System is active and the rendered theme matches the current OS preference.
- AE2. **Covers R3, R5, R6, R13.** Given the picker is open, when the visitor selects Solarized Light, the theme applies and persists immediately, the preset becomes active, the picker remains open, and reloading restores Solarized Light as the active choice.
- AE3. **Covers R4, R5.** Given a preset is active, when the visitor selects Light, the preset becomes inactive and the default Light theme replaces it.
- AE4. **Covers R8, R9.** Given System is active, an OS preference change updates the rendered theme; given a preset is active, the same OS change leaves the rendered theme unchanged.
- AE5. **Covers R7, R11, R12.** Given a keyboard-only visitor opens the picker, when they move with arrow keys, select with Enter or Space, and press Escape, the theme remains active and focus returns to the trigger.
- AE6. **Covers R7, R12.** Given the visitor selected a theme, when they click or tap another page target, the picker closes without reverting the theme or stealing focus from that target.
- AE7. **Covers R3, R12, R14.** Given a short mobile viewport, when the picker opens, it stays within the viewport and all 15 choices remain reachable through internal scrolling without page-level horizontal overflow.
- AE8. **Covers R4, R5.** Given a recognized preset and an older mode value both exist in storage, when the picker loads, the rendered preset is the sole active choice; selecting a mode clears the preset override and restores that mode on the next reload.
- AE9. **Covers R11, R12.** Given the picker is open for a keyboard-only visitor, when Tab moves focus to the next page target, the picker closes and focus remains on that target.
- AE10. **Covers R15.** Given an unrecognized custom theme is active, when the picker opens, the custom theme remains rendered, “Current: Custom theme” appears outside the radio choices, and selecting Light replaces it.

---

## Success Criteria

- Visitors can reach and apply any of the 15 choices (System, Light, Dark, and 12 presets) through one header control, with no theme left unreachable.
- Visitors can compare several themes without reopening the picker, and choosing a mode never leaves a stale preset override active.
- The picker meets WCAG 2.1 AA expectations for keyboard operability, focus management, and screen-reader state announcement.
- The active theme choice and its persistence behavior are unambiguous at all times, both visually and programmatically, across reloads.

---

## Scope Boundaries

- No activation of the full `ThemeCustomizer` flow (custom color editing, saved-theme library, import/export, Apply/Cancel semantics) — out of scope.
- No dedicated home section or standalone route for theme selection — the picker is header-anchored only.
- No search or filter controls within the picker.
- No temporary hover/focus preview or confirmation step before a selection applies.
- No change to the existing preset catalog (still exactly 12 named presets plus System/Light/Dark).
- No new picker animation beyond the existing reduced-motion-aware theme transitions.
- No migration or editing support for user-authored themes created by the dormant customizer; existing values are preserved only until the visitor selects a listed choice.

---

## Key Decisions

- **Single-select model over multi-state toggle:** One active choice (mode or preset) at a time keeps the mental model simple and matches how theming is applied today — avoids inventing a "preset + mode override" combination that doesn't exist in the current system.
- **Immediate apply-and-persist, no Apply/Cancel:** Matches the existing toggle's behavior (selection is immediate) and avoids introducing customizer-style staged-state complexity for a picker that isn't editing anything.
- **Picker stays open after selection:** Lets visitors compare options directly against each other without repeated open/close cycles, which is the primary value of exposing all 12 presets at once.
- **Non-modal, compact surface:** A lightweight popover keeps the interaction anchored to the header control and avoids the full-dialog weight of the customizer for a selection-only task.
- **Standard single-select interaction:** Arrow-key navigation and programmatic selected state avoid inventing custom keyboard or announcement behavior for 15 mutually exclusive choices.

---

## Dependencies / Assumptions

- The existing theme system provides light/dark/system modes, named preset data, and local persistence; this work does not introduce account-level state.
- The current system stores mode and custom-theme override separately; planning must reconcile those stores so the picker restores one recognized active choice and clears stale conflicting state.
- Assumes the 12 named presets and their identifying labels are stable and unchanged by this work.
- Assumes existing theme transition/token-driven rendering behavior is preserved as-is; this work does not introduce new visual transition effects.
- Assumes no telemetry or account-level theme sync is introduced or required.

---

## Sources / Research

- `src/components/ThemeToggle.tsx`
- `src/components/Header.tsx`
- `src/contexts/ThemeContext.tsx`
- `src/hooks/UseTheme.ts`
- `src/utils/preset-themes.ts`
- `src/components/PresetThemeGallery.tsx`
- `src/components/ThemeCustomizer.tsx`
- `tests/e2e/theme-switching.spec.ts`
- `docs/plans/2026-07-18-003-refactor-trim-home-sections-plan.md`
- `.ai/plan/feature-theme-system-1.md`
