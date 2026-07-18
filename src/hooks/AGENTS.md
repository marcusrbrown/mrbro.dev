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
- **Portfolio curation (opt-in)**: `UseGitHub`'s projects feed shows ONLY repos tagged with the `portfolio` GitHub topic. An untagged repo — including newly-created ones or ones that had the topic removed — is silently invisible in the feed; this is the intended contract, not a bug. Feature a repo: `gh repo edit <owner>/<repo> --add-topic portfolio`. Unfeature: `gh repo edit <owner>/<repo> --remove-topic portfolio`. The site's own repo (`marcusrbrown/marcusrbrown.github.io`) is always self-excluded, even if tagged.

## Testing

- **Location**: `tests/hooks/` (only 3 of 9 hooks currently tested — coverage gap)
- **Framework**: Vitest + React Testing Library
- **Priority**: `UseTheme`, `UseGitHub`, `UseProjectFilter`
