# scripts/

10 CI/build automation scripts for bundle analysis, performance monitoring, and test orchestration.

## Execution

- **`.ts` files**: Run via `tsx` (e.g., `npx tsx scripts/analyze-build.ts`)
- **`.mjs` files**: Run directly via `node` (e.g., `node scripts/test-dashboard.mjs`)

## By Domain

### Build Analysis

| Script                   | Role                                                                               |
| ------------------------ | ---------------------------------------------------------------------------------- |
| `analyze-build.ts`       | Bundle size auditing — JS <500KB warning, <2MB max. Generates GitHub job summaries |
| `performance-budgets.ts` | Enforces Core Web Vitals: LCP <2.5s, FID <100ms, CLS <0.1                          |

### Performance Monitoring

| Script                      | Role                                                  |
| --------------------------- | ----------------------------------------------------- |
| `performance-dashboard.ts`  | Aggregates Lighthouse data for trend tracking         |
| `performance-regression.ts` | Compares current metrics against historical baselines |
| `performance-artifacts.ts`  | Manages trace logs and flame graphs                   |

### Test Reporting

| Script                     | Role                                                                     |
| -------------------------- | ------------------------------------------------------------------------ |
| `test-dashboard.mjs`       | Weighted health score: Unit 25%, E2E 30%, A11y 20%, Visual 15%, Perf 10% |
| `generate-test-badges.mjs` | Updates README status badges from JSON test results                      |

### Artifact Management

| Script                            | Role                                                                     |
| --------------------------------- | ------------------------------------------------------------------------ |
| `artifact-management.mjs`         | Automated cleanup — coverage/results 30 days, visual baselines permanent |
| `visual-artifact-manager.mjs`     | Handles diff/failure snapshots for visual regression                     |
| `configure-branch-protection.mjs` | Automates GitHub repository branch protection rulesets                   |

## CI Integration

Scripts trigger via `.github/workflows/`. Outputs target `$GITHUB_STEP_SUMMARY` for job summaries and repository badges for README.
