export interface CommandInput {
  command?: unknown
  bash?: unknown
  args?: unknown
  input?: unknown
  toolInput?: {command?: unknown}
  tool_input?: {command?: unknown}
}

export function parseInput(raw: string): Record<string, unknown> {
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

const denyPatterns: {pattern: RegExp; label: string}[] = [
  {pattern: /git\s+push\b[^|;]*--force(?:-with-lease)?\b/, label: 'git push --force'},
  {pattern: /git\s+push\b[^|;]*\s-f\b/, label: 'git push -f'},
  {pattern: /git\s+reset\s+--hard\b/, label: 'git reset --hard'},
  {pattern: /\brm\s+-[rf]+\s+\//, label: 'rm -rf /'},
  {pattern: /\bcurl\s+https?:\/\//, label: 'curl http(s)'},
  {pattern: /\bwget\s+https?:\/\//, label: 'wget http(s)'},
]

export function hasForbiddenPattern(commandText: string): string | undefined {
  const match = denyPatterns.find(entry => entry.pattern.test(commandText))
  return match?.label
}

function extractFromValue(value: unknown): string {
  if (typeof value === 'string') {
    return value
  }

  if (Array.isArray(value)) {
    return value
      .map(item => extractFromValue(item))
      .filter(s => s.trim().length > 0)
      .join(' ')
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

export function resolveCommandText(payload: CommandInput): string {
  const candidates = [payload?.toolInput?.command, payload?.tool_input?.command, payload?.command, payload?.input]

  for (const candidate of candidates) {
    const extracted = extractFromValue(candidate)
    if (extracted.trim().length > 0) {
      return extracted
    }
  }

  return ''
}
