import type {ThemeContextValue} from '../types'
import {createContext, use} from 'react'

export const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

export const useThemeContext = (): ThemeContextValue => {
  const context = use(ThemeContext)
  if (context === undefined) {
    throw new Error('useThemeContext must be used within a ThemeProvider')
  }
  return context
}
