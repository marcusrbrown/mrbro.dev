import type {ActiveThemeChoice, Theme, ThemeMode, ThemeSelection} from '../types'
import {useCallback, useMemo} from 'react'
import {getPresetThemeById} from '../utils/preset-themes'
import {useThemeContext} from './UseThemeContext'

const themeColorsMatch = (left: Theme['colors'], right: Theme['colors']): boolean =>
  left.primary === right.primary &&
  left.secondary === right.secondary &&
  left.accent === right.accent &&
  left.background === right.background &&
  left.surface === right.surface &&
  left.text === right.text &&
  left.textSecondary === right.textSecondary &&
  left.border === right.border &&
  left.error === right.error &&
  left.warning === right.warning &&
  left.success === right.success

const matchesPreset = (theme: Theme): boolean => {
  const preset = getPresetThemeById(theme.id)
  return Boolean(
    preset && theme.name === preset.name && theme.mode === preset.mode && themeColorsMatch(theme.colors, preset.colors),
  )
}

export interface UseThemeReturn {
  // Current theme data
  currentTheme: Theme
  activeThemeChoice: ActiveThemeChoice
  activeCustomTheme: Theme | null
  themeMode: ThemeMode
  availableThemes: Theme[]
  systemPreference: 'light' | 'dark'

  // Theme state checks
  isDarkMode: boolean
  isLightMode: boolean
  isSystemMode: boolean
  isSystemDark: boolean
  isSystemLight: boolean

  // Theme actions
  setThemeMode: (mode: ThemeMode) => void
  setCustomTheme: (theme: Theme) => void
  setActiveTheme: (selection: ThemeSelection) => void
  toggleTheme: () => void
  switchToLight: () => void
  switchToDark: () => void
  switchToSystem: () => void

  // Utilities
  getEffectiveThemeMode: () => 'light' | 'dark'
  isCustomTheme: boolean
}

/**
 * Custom hook for managing theme state and operations
 *
 * Provides a comprehensive interface for theme management including:
 * - System preference detection via prefers-color-scheme
 * - Theme mode switching (light, dark, system)
 * - Custom theme support
 * - Utility methods for theme state checks
 *
 * @returns UseThemeReturn object with theme data and controls
 */
export const useTheme = (): UseThemeReturn => {
  const {
    currentTheme,
    activeCustomTheme,
    themeMode,
    availableThemes,
    systemPreference,
    setThemeMode,
    setCustomTheme,
    setActiveTheme,
  } = useThemeContext()

  // Track whether a custom theme is currently active (derived state)
  const activeThemeChoice = useMemo<ActiveThemeChoice>(() => {
    if (!activeCustomTheme) return {type: 'mode', mode: themeMode}

    return matchesPreset(activeCustomTheme)
      ? {type: 'preset', theme: activeCustomTheme}
      : {type: 'legacy-custom', theme: activeCustomTheme}
  }, [activeCustomTheme, themeMode])

  const isCustomTheme = activeCustomTheme !== null || !availableThemes.some(theme => theme.id === currentTheme.id)

  const isDarkMode = currentTheme.mode === 'dark'
  const isLightMode = currentTheme.mode === 'light'
  const isSystemMode = themeMode === 'system'
  const isSystemDark = systemPreference === 'dark'
  const isSystemLight = systemPreference === 'light'

  /**
   * Get the effective theme mode (resolves 'system' to actual preference)
   */
  const getEffectiveThemeMode = useCallback((): 'light' | 'dark' => {
    if (themeMode === 'system') {
      return systemPreference
    }
    return themeMode
  }, [themeMode, systemPreference])

  /**
   * Toggle between light and dark modes
   * If currently in system mode, switches to opposite of system preference
   */
  const toggleTheme = useCallback(() => {
    const effectiveMode = getEffectiveThemeMode()
    setThemeMode(effectiveMode === 'dark' ? 'light' : 'dark')
  }, [getEffectiveThemeMode, setThemeMode])

  /**
   * Switch to light mode explicitly
   */
  const switchToLight = useCallback(() => {
    setThemeMode('light')
  }, [setThemeMode])

  /**
   * Switch to dark mode explicitly
   */
  const switchToDark = useCallback(() => {
    setThemeMode('dark')
  }, [setThemeMode])

  /**
   * Switch to system preference mode
   */
  const switchToSystem = useCallback(() => {
    setThemeMode('system')
  }, [setThemeMode])

  return {
    // Current theme data
    currentTheme,
    activeThemeChoice,
    activeCustomTheme,
    themeMode,
    availableThemes,
    systemPreference,

    // Theme state checks
    isDarkMode,
    isLightMode,
    isSystemMode,
    isSystemDark,
    isSystemLight,

    // Theme actions
    setThemeMode,
    setCustomTheme,
    setActiveTheme,
    toggleTheme,
    switchToLight,
    switchToDark,
    switchToSystem,

    // Utilities
    getEffectiveThemeMode,
    isCustomTheme,
  }
}
