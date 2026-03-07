# src/hooks/

9 custom React hooks — compound return objects, strict types, no barrel exports.

## CRITICAL: PascalCase Filenames

- **Correct**: `UseTheme.ts`, `UseGitHub.ts`, `UseScrollAnimation.ts`
- **Wrong**: `useTheme.ts`, `useGitHub.ts`
- New hooks: `UseMyHook.ts` — PascalCase, always

## Hook Registry

| Hook                       | Description                                                                     |
| -------------------------- | ------------------------------------------------------------------------------- |
| `UseAnalytics.ts`          | Track page views and user interactions                                          |
| `UseGitHub.ts`             | GitHub API via pure `fetch` (no Octokit/Axios)                                  |
| `UsePageTitle.ts`          | Dynamic document title with SEO meta                                            |
| `UseParallax.ts`           | Scroll-based parallax transforms                                                |
| `UseProgressiveImage.ts`   | Blurred placeholder → full-resolution transitions                               |
| `UseProjectFilter.ts`      | Client-side filtering/sorting for project grids                                 |
| `UseScrollAnimation.ts`    | Intersection Observer triggers, respects `prefers-reduced-motion`               |
| `UseSyntaxHighlighting.ts` | Shiki-based highlighting (externalized from bundle)                             |
| `UseTheme.ts`              | **Primary hook** — wraps `ThemeContext`, 17-property `UseThemeReturn` interface |

## Patterns

- **Compound returns**: All hooks return destructured objects, never single values or arrays
- **Explicit interfaces**: Every hook defines a return type interface in-file
- **Theme access**: Use `useTheme()` — never import `useThemeContext` directly
- **Async safety**: `AbortController` for fetch operations in `UseGitHub`

## Testing

- **Location**: `tests/hooks/` (only 3 of 9 hooks currently tested — coverage gap)
- **Framework**: Vitest + React Testing Library
- **Priority**: `UseTheme`, `UseGitHub`, `UseProjectFilter`
