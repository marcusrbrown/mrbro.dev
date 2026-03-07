import type {BranchProtectionPayload, ScriptConfig} from './branch-protection-config'
import {assertSuccess, runGhCommand} from './branch-protection-gh'

interface CurrentProtectionResponse {
  readonly required_status_checks?: {
    readonly contexts?: readonly string[]
  }
  readonly required_pull_request_reviews?: {
    readonly required_approving_review_count?: number
  }
  readonly enforce_admins?: {
    readonly enabled?: boolean
  }
}

interface WorkflowRunSummary {
  readonly name: string
  readonly status: string
  readonly conclusion: string | null
}

function getProtectionEndpoint(config: ScriptConfig): string {
  return `repos/${config.owner}/${config.repo}/branches/${config.branch}/protection`
}

function getCurrentProtection(config: ScriptConfig): CurrentProtectionResponse | null {
  const result = runGhCommand(['api', getProtectionEndpoint(config)])
  if (result.status !== 0) {
    if (result.stderr.includes('404')) {
      return null
    }

    assertSuccess('gh api get branch protection', result)
  }

  return JSON.parse(result.stdout) as CurrentProtectionResponse
}

function configureBranchProtection(config: ScriptConfig, payload: BranchProtectionPayload): void {
  const result = runGhCommand(
    ['api', getProtectionEndpoint(config), '--method', 'PUT', '--input', '-'],
    JSON.stringify(payload),
  )
  assertSuccess('gh api put branch protection', result)
}

function removeBranchProtection(config: ScriptConfig): void {
  const result = runGhCommand(['api', getProtectionEndpoint(config), '--method', 'DELETE'])
  assertSuccess('gh api delete branch protection', result)
}

function getRecentWorkflowRuns(config: ScriptConfig): readonly WorkflowRunSummary[] {
  const endpoint = `repos/${config.owner}/${config.repo}/actions/runs`
  const result = runGhCommand([
    'api',
    endpoint,
    '--jq',
    '.workflow_runs[:10] | map({name: .name, status: .status, conclusion: .conclusion})',
  ])
  assertSuccess('gh api list workflow runs', result)
  return JSON.parse(result.stdout) as readonly WorkflowRunSummary[]
}

export type {CurrentProtectionResponse, WorkflowRunSummary}
export {configureBranchProtection, getCurrentProtection, getRecentWorkflowRuns, removeBranchProtection}
