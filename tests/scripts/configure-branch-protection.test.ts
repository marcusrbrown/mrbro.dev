import {describe, expect, it} from 'vitest'
import {buildProtectionPayload, SCRIPT_CONFIG} from '../../scripts/branch-protection-config'

describe('configure-branch-protection script payload', () => {
  it('builds payload with strict required checks and expected contexts', () => {
    const payload = buildProtectionPayload(SCRIPT_CONFIG.requiredChecks)

    expect(payload.required_status_checks.strict).toBe(true)
    expect(payload.required_status_checks.contexts).toEqual([
      'Quality Gate',
      'Test Summary & Badge Generation',
      'Performance Summary',
    ])
  })

  it('keeps review and deletion protections enabled', () => {
    const payload = buildProtectionPayload(SCRIPT_CONFIG.requiredChecks)

    expect(payload.required_pull_request_reviews.required_approving_review_count).toBe(1)
    expect(payload.required_pull_request_reviews.dismiss_stale_reviews).toBe(true)
    expect(payload.required_pull_request_reviews.require_code_owner_reviews).toBe(true)
    expect(payload.allow_force_pushes).toBe(false)
    expect(payload.allow_deletions).toBe(false)
  })
})
