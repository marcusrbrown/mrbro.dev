import type {CommandInput} from './copilot-hook-utils.ts'

import process from 'node:process'

import {hasForbiddenPattern, parseInput, resolveCommandText} from './copilot-hook-utils.ts'

const chunks: string[] = []

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
