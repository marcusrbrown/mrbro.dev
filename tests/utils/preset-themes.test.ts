import {describe, expect, it} from 'vitest'
import {
  getPresetThemeById,
  getPresetThemes,
  getPresetThemesByMode,
  getPresetThemesByTags,
  searchPresetThemes,
} from '../../src/utils/preset-themes'

describe('preset-themes', () => {
  describe('getPresetThemes', () => {
    it('should return an array of themes', () => {
      const themes = getPresetThemes()
      expect(Array.isArray(themes)).toBe(true)
      expect(themes.length).toBeGreaterThan(0)
    })

    it('should include themes with required properties', () => {
      const themes = getPresetThemes()
      themes.forEach(theme => {
        expect(theme).toHaveProperty('id')
        expect(theme).toHaveProperty('name')
        expect(theme).toHaveProperty('mode')
        expect(theme).toHaveProperty('colors')
      })
    })
  })

  describe('getPresetThemesByMode', () => {
    it('should return only light themes', () => {
      const themes = getPresetThemesByMode('light')
      expect(themes.length).toBeGreaterThan(0)
      themes.forEach(theme => {
        expect(theme.mode).toBe('light')
      })
    })

    it('should return only dark themes', () => {
      const themes = getPresetThemesByMode('dark')
      expect(themes.length).toBeGreaterThan(0)
      themes.forEach(theme => {
        expect(theme.mode).toBe('dark')
      })
    })

    it('should return empty array for invalid mode', () => {
      const themes = getPresetThemesByMode('invalid' as 'light' | 'dark')
      expect(themes).toHaveLength(0)
    })
  })

  describe('getPresetThemeById', () => {
    it('should return a theme by id', () => {
      const allThemes = getPresetThemes()
      const firstTheme = allThemes[0]
      const found = getPresetThemeById(firstTheme.id)
      expect(found).toBeDefined()
      expect(found?.id).toBe(firstTheme.id)
    })

    it('should return undefined for unknown id', () => {
      const theme = getPresetThemeById('non-existent-theme-id')
      expect(theme).toBeUndefined()
    })

    it('should return the material-light theme', () => {
      const theme = getPresetThemeById('material-light')
      expect(theme).toBeDefined()
      expect(theme?.name).toBe('Material Light')
    })
  })

  describe('getPresetThemesByTags', () => {
    it('should return themes matching any of the provided tags', () => {
      const themes = getPresetThemesByTags(['dark'])
      expect(themes.length).toBeGreaterThan(0)
    })

    it('should return empty array when no themes match', () => {
      const themes = getPresetThemesByTags(['non-existent-tag-xyz'])
      expect(themes).toHaveLength(0)
    })

    it('should return themes matching multiple tags', () => {
      const themes = getPresetThemesByTags(['light', 'dark'])
      const allThemes = getPresetThemes()
      // Should include themes with at least one matching tag
      expect(themes.length).toBeLessThanOrEqual(allThemes.length)
    })

    it('should return empty array for empty tag list', () => {
      const themes = getPresetThemesByTags([])
      expect(themes).toHaveLength(0)
    })
  })

  describe('searchPresetThemes', () => {
    it('should find themes by name', () => {
      const themes = searchPresetThemes('material')
      expect(themes.length).toBeGreaterThan(0)
      themes.forEach(theme => {
        const matchesName = theme.name.toLowerCase().includes('material')
        const matchesTags = theme.tags?.some(tag => tag.toLowerCase().includes('material')) ?? false
        const matchesDesc = theme.description?.toLowerCase().includes('material') ?? false
        expect(matchesName || matchesTags || matchesDesc).toBe(true)
      })
    })

    it('should find themes by tag', () => {
      const themes = searchPresetThemes('dark')
      expect(themes.length).toBeGreaterThan(0)
    })

    it('should be case-insensitive', () => {
      const lower = searchPresetThemes('material')
      const upper = searchPresetThemes('MATERIAL')
      expect(lower.length).toBe(upper.length)
    })

    it('should return empty array for no matches', () => {
      const themes = searchPresetThemes('xyznotatheme12345')
      expect(themes).toHaveLength(0)
    })

    it('should find themes by description', () => {
      const allThemes = getPresetThemes()
      const themeWithDescription = allThemes.find(t => t.description != null)
      if (themeWithDescription?.description) {
        const word = themeWithDescription.description.split(' ')[0]
        if (word) {
          const found = searchPresetThemes(word)
          expect(found.length).toBeGreaterThan(0)
        }
      }
    })
  })
})
