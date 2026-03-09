# tests/

Multi-type testing: unit (Vitest), E2E/visual/a11y (Playwright), performance (Lighthouse CI).

## Structure → Config Mapping

| Type              | Directory        | Runner                | Config                      |
| ----------------- | ---------------- | --------------------- | --------------------------- |
| Unit (components) | `components/`    | Vitest                | `vite.config.ts` (embedded) |
| Unit (hooks)      | `hooks/`         | Vitest                | `vite.config.ts`            |
| Unit (utils)      | `utils/`         | Vitest                | `vite.config.ts`            |
| E2E               | `e2e/`           | Playwright            | `playwright.config.ts`      |
| Visual            | `visual/`        | Playwright            | `playwright.config.ts`      |
| Accessibility     | `accessibility/` | Playwright + axe-core | `playwright.config.ts`      |
| Performance       | `performance/`   | Lighthouse CI         | `lhci.config.js`            |

## Key Files

- `setup.ts` — Global Vitest setup (DOM mocks, theme providers, Shiki stubbing)
- `visual/utils.ts` — Theme mocking + snapshot threshold configuration
- `e2e/base-path.spec.ts` — Smoke tests: asset loading, blank-page guard, sub-page routing
- `e2e/fixtures/` — Viewport configs + test data (2 files)
- `e2e/utils/` — Navigation and test helpers (2 files)

## Test Matrices

- **Visual**: 3 themes (light/dark/custom) × 4 breakpoints (375/768/1024/1440px)
- **E2E**: 3 browsers (Chromium, Firefox, WebKit)
- **Accessibility**: WCAG 2.1 AA across all routes

## Coverage

- **Thresholds**: 80% statements/branches/functions/lines (enforced in Vite config)
- **Provider**: V8
- **Gap**: `hooks/` — only 3 of 9 hooks tested. Priority: `UseTheme`, `UseGitHub`

## Visual Baselines

- **Location**: `visual/screenshots/` — 222 baseline images
- **Retention**: Permanent (never auto-cleaned)
- **Update**: `pnpm test:visual:update` regenerates all baselines

## Health Dashboard Weights

| Suite         | Weight |
| ------------- | ------ |
| E2E           | 30%    |
| Unit          | 25%    |
| Accessibility | 20%    |
| Visual        | 15%    |
| Performance   | 10%    |
