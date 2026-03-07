import {spawnSync} from 'node:child_process'

interface CommandResult {
  readonly stdout: string
  readonly stderr: string
  readonly status: number | null
}

function runGhCommand(args: readonly string[], input?: string): CommandResult {
  const result = spawnSync('gh', args, {
    encoding: 'utf8',
    input,
    stdio: ['pipe', 'pipe', 'pipe'],
  })

  if (result.error != null) {
    throw new Error(`Failed to run gh ${args.join(' ')}: ${result.error.message}`)
  }

  return {
    stdout: result.stdout,
    stderr: result.stderr,
    status: result.status,
  }
}

function assertSuccess(label: string, result: CommandResult): void {
  if (result.status !== 0) {
    throw new Error(
      [`${label} failed with exit code ${result.status ?? 'unknown'}`, result.stderr.trim()]
        .filter(part => part.length > 0)
        .join('\n'),
    )
  }
}

function ensureCliReady(): void {
  assertSuccess('gh --version', runGhCommand(['--version']))
  assertSuccess('gh auth status', runGhCommand(['auth', 'status']))
}

export type {CommandResult}
export {assertSuccess, ensureCliReady, runGhCommand}
