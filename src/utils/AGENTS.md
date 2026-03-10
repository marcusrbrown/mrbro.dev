# src/utils/

12 utility modules — 6 theme-specific, plus accessibility, analytics, animation, GitHub API, syntax highlighting, and schema validation.

## By Domain

### Theme System (6 files)

| Utility                | Role                                                                    |
| ---------------------- | ----------------------------------------------------------------------- |
| `preset-themes.ts`     | 12 preset theme definitions + search/filter helpers (`presetThemes:15`) |
| `theme-storage.ts`     | localStorage persistence — load/save theme mode, custom themes, library |
| `theme-validation.ts`  | Runtime theme object validation against schema                          |
| `theme-export.ts`      | Theme import/export (JSON serialization)                                |
| `theme-performance.ts` | Theme switching performance monitoring + metrics                        |
| `theme-preloader.ts`   | Pre-transition setup to avoid FOUC                                      |

### Core Utilities (6 files)

| Utility                  | Role                                                                        |
| ------------------------ | --------------------------------------------------------------------------- |
| `accessibility.ts`       | Keyboard handlers, focus traps, screen reader announcements, reduced motion |
| `analytics.ts`           | Page view + interaction tracking                                            |
| `animation-utils.ts`     | Scroll-based animation helpers                                              |
| `github.ts`              | GitHub API client — pure `fetch`, repos + blog posts (`GITHUB_API_URL`)     |
| `syntax-highlighting.ts` | Shiki integration — externalized from bundle via build config               |
| `schema-validation.ts`   | JSON schema validation against `src/schemas/theme.schema.json`              |

## Patterns

- **No barrel exports** — import directly: `import { presetThemes } from '../utils/preset-themes'`
- **Pure functions preferred** — side effects isolated to storage and DOM utilities
- **Theme chain**: `preset-themes` defines → `theme-validation` validates → `theme-storage` persists → `theme-preloader` applies
- **GitHub API**: Pure fetch with AbortController support, no external HTTP deps

## Testing

- **Location**: `tests/utils/` (9 test files — good coverage)
- **Gap**: `animation-utils.ts`, `analytics.ts` lack dedicated tests
