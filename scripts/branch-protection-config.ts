interface PullRequestReviewSettings {
  readonly required_approving_review_count: number
  readonly dismiss_stale_reviews: boolean
  readonly require_code_owner_reviews: boolean
  readonly restrict_review_dismissals: boolean
}

interface RequiredStatusChecksSettings {
  readonly strict: boolean
  readonly contexts: readonly string[]
}

interface BranchProtectionPayload {
  readonly required_status_checks: RequiredStatusChecksSettings
  readonly enforce_admins: boolean
  readonly required_pull_request_reviews: PullRequestReviewSettings
  readonly restrictions: null
  readonly allow_force_pushes: boolean
  readonly allow_deletions: boolean
  readonly block_creations: boolean
}

interface ScriptConfig {
  readonly owner: string
  readonly repo: string
  readonly branch: string
  readonly requiredChecks: readonly string[]
  readonly protection: Omit<BranchProtectionPayload, 'required_status_checks'>
}

const SCRIPT_CONFIG: ScriptConfig = {
  owner: 'marcusrbrown',
  repo: 'mrbro.dev',
  branch: 'main',
  requiredChecks: [
    'Test Notifications',
    'Test Summary & Badge Generation',
    'Performance Summary',
    'Quality Gate',
    'E2E Tests (chromium)',
    'Build for Testing',
    'Build Project',
    'Validate Dependencies',
    'Lint Code',
    'Test',
    'Type Check',
    'Performance Audit (mobile)',
    'Performance Audit (desktop)',
    'Fro Bot',
    'Setup and Cache',
    'Setup E2E Environment',
    'Renovate / Renovate',
  ],
  protection: {
    enforce_admins: false,
    required_pull_request_reviews: {
      required_approving_review_count: 1,
      dismiss_stale_reviews: true,
      require_code_owner_reviews: true,
      restrict_review_dismissals: false,
    },
    restrictions: null,
    allow_force_pushes: false,
    allow_deletions: false,
    block_creations: false,
  },
}

function buildProtectionPayload(requiredChecks: readonly string[]): BranchProtectionPayload {
  return {
    required_status_checks: {
      strict: true,
      contexts: requiredChecks,
    },
    ...SCRIPT_CONFIG.protection,
  }
}

export type {BranchProtectionPayload, ScriptConfig}
export {buildProtectionPayload, SCRIPT_CONFIG}
