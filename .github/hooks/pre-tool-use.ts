import process from 'node:process'

function parseInput(raw: string): Record<string, unknown> {
  if (raw.trim().length === 0) {
    return {}
  }

  try {
    const parsed = JSON.parse(raw)
    if (typeof parsed === 'object' && parsed !== null) {
      return parsed as Record<string, unknown>
    }

    return {}
  } catch {
    return {}
  }
}

function hasForbiddenPattern(commandText: string): string | undefined {
  const denyPatterns = [
    'git push --force',
    'git push -f',
    'git reset --hard',
    'rm -rf /',
    'curl http://',
    'wget http://',
  ]

  return denyPatterns.find(pattern => commandText.includes(pattern))
}

interface CommandInput {
  command?: unknown
  bash?: unknown
  args?: unknown
  input?: unknown
  toolInput?: {command?: unknown}
  tool_input?: {command?: unknown}
}

function resolveCommandText(payload: CommandInput): string {
  const extractFromValue = (value: unknown): string => {
    if (typeof value === 'string') {
      return value
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        const extracted = extractFromValue(item)
        if (extracted.trim().length > 0) {
          return extracted
        }
      }

      return ''
    }

    if (typeof value !== 'object' || value == null) {
      return ''
    }

    const commandInput = value as CommandInput

    const objectCandidates: unknown[] = [
      commandInput.command,
      commandInput.bash,
      commandInput.args,
      commandInput.input,
      commandInput.toolInput?.command,
      commandInput.tool_input?.command,
    ]

    for (const candidate of objectCandidates) {
      const extracted = extractFromValue(candidate)
      if (extracted.trim().length > 0) {
        return extracted
      }
    }

    return ''
  }

  const candidates = [payload?.toolInput?.command, payload?.tool_input?.command, payload?.command, payload?.input]

  for (const candidate of candidates) {
    const extracted = extractFromValue(candidate)
    if (extracted.trim().length > 0) {
      return extracted
    }
  }

  return ''
}

const chunks = []

for await (const chunk of process.stdin) {
  chunks.push(typeof chunk === 'string' ? chunk : chunk.toString('utf8'))
}

const payload = parseInput(chunks.join('')) as CommandInput
const commandText = resolveCommandText(payload).toLowerCase()
const forbidden = hasForbiddenPattern(commandText)

if (forbidden !== undefined) {
  const response = {
    action: 'deny',
    message: `Blocked by Copilot guardrails: '${forbidden}' is not allowed.`,
  }

  process.stdout.write(`${JSON.stringify(response)}\n`)
  process.exit(0)
}

process.stdout.write(`${JSON.stringify({action: 'allow'})}\n`)
