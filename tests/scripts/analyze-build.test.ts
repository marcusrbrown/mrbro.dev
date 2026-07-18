import {describe, expect, it} from 'vitest'
import {hasCssBudgetViolation} from '../../scripts/analyze-build'

describe('build CSS budget', () => {
  it('passes at or below the hard budget', () => {
    expect(hasCssBudgetViolation(102_400)).toBe(false)
    expect(hasCssBudgetViolation(102_399)).toBe(false)
  })

  it('fails above the hard budget', () => {
    expect(hasCssBudgetViolation(102_401)).toBe(true)
  })
})
