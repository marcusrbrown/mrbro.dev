import process from 'node:process'
import {
  configureBranchProtection,
  getCurrentProtection,
  getRecentWorkflowRuns,
  removeBranchProtection,
} from './branch-protection-api'
import {buildProtectionPayload, SCRIPT_CONFIG} from './branch-protection-config'
import {ensureCliReady} from './branch-protection-gh'

function printStatus(): void {
  const protection = getCurrentProtection(SCRIPT_CONFIG)
  if (protection == null) {
    process.stdout.write(`Branch ${SCRIPT_CONFIG.branch} has no branch protection.\n`)
    return
  }

  const checks = protection.required_status_checks?.contexts ?? []
  const reviewCount = protection.required_pull_request_reviews?.required_approving_review_count ?? 0
  const admins = protection.enforce_admins?.enabled ?? false

  process.stdout.write(`Branch: ${SCRIPT_CONFIG.branch}\n`)
  process.stdout.write(`Required review count: ${reviewCount}\n`)
  process.stdout.write(`Enforce for admins: ${admins}\n`)
  process.stdout.write(`Required status checks (${checks.length}):\n`)
  for (const check of checks) {
    process.stdout.write(`- ${check}\n`)
  }
}

function printRecentRuns(): void {
  const runs = getRecentWorkflowRuns(SCRIPT_CONFIG)
  process.stdout.write('Recent workflow runs:\n')
  for (const run of runs) {
    process.stdout.write(`- ${run.name}: ${run.status} (${run.conclusion ?? 'pending'})\n`)
  }
}

function printHelp(): void {
  process.stdout.write('Usage:\n')
  process.stdout.write('  pnpm run configure:branch-protection status\n')
  process.stdout.write('  pnpm run configure:branch-protection configure\n')
  process.stdout.write('  pnpm run configure:branch-protection remove\n')
  process.stdout.write('  pnpm run configure:branch-protection checks\n\n')
  process.stdout.write('Configured required checks:\n')
  for (const check of SCRIPT_CONFIG.requiredChecks) {
    process.stdout.write(`- ${check}\n`)
  }
}

function main(): void {
  ensureCliReady()

  const [command = 'status'] = process.argv.slice(2)
  if (command === 'status') {
    printStatus()
    return
  }

  if (command === 'configure') {
    configureBranchProtection(SCRIPT_CONFIG, buildProtectionPayload(SCRIPT_CONFIG.requiredChecks))
    printStatus()
    return
  }

  if (command === 'remove') {
    removeBranchProtection(SCRIPT_CONFIG)
    process.stdout.write(`Removed branch protection for ${SCRIPT_CONFIG.branch}.\n`)
    return
  }

  if (command === 'checks') {
    printRecentRuns()
    return
  }

  printHelp()
}

if (process.env.BRANCH_PROTECTION_TEST !== 'true') {
  try {
    main()
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    process.stderr.write(`${message}\n`)
    process.exit(1)
  }
}
