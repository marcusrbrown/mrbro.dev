import {spawn} from 'node:child_process'
import process from 'node:process'

const checks = [
  {label: 'lint', args: ['run', 'lint']},
  {label: 'test', args: ['run', 'test']},
  {label: 'build', args: ['run', 'build']},
]

function runCheck(label: string, args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn('pnpm', [...args], {
      stdio: 'inherit',
      shell: process.platform === 'win32',
    })

    child.on('error', error => {
      reject(new Error(`${label} failed to start: ${error.message}`))
    })

    child.on('close', code => {
      if (code === 0) {
        resolve()
        return
      }

      reject(new Error(`${label} exited with code ${code ?? 'unknown'}`))
    })
  })
}

const results = await Promise.allSettled(checks.map(check => runCheck(check.label, check.args)))
const failedChecks = checks.filter((_, index) => results[index]?.status === 'rejected')

if (failedChecks.length > 0) {
  for (const failedCheck of failedChecks) {
    const result = results[checks.indexOf(failedCheck)]
    if (result?.status === 'rejected') {
      console.error(
        `\n[pre-push] ${failedCheck.label}: ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`,
      )
    }
  }

  process.exit(1)
}

console.warn('\n[pre-push] all checks passed')
