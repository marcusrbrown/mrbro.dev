import {describe, expect, it} from 'vitest'
import {previewImagePath} from '../../src/utils/preview-image-path'

describe('previewImagePath', () => {
  it('returns the deterministic path for a valid positive integer id', () => {
    expect(previewImagePath(12345)).toBe('/project-previews/12345.png')
  })

  it('returns a path shaped exactly as /project-previews/<id>.png', () => {
    const id = 1
    expect(previewImagePath(id)).toBe(`/project-previews/${id}.png`)
  })

  it('returns undefined for a zero id', () => {
    expect(previewImagePath(0)).toBeUndefined()
  })

  it('returns undefined for a negative id', () => {
    expect(previewImagePath(-1)).toBeUndefined()
  })

  it('returns undefined for a non-integer id', () => {
    expect(previewImagePath(1.5)).toBeUndefined()
  })

  it('returns undefined for NaN', () => {
    expect(previewImagePath(Number.NaN)).toBeUndefined()
  })
})
