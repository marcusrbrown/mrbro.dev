import type {FC} from 'react'
import type {UseThemeReturn} from '../../src/hooks/UseTheme'
import type {ActiveThemeChoice, ThemeColors, ThemeMode} from '../../src/types'
import {fireEvent, render, screen} from '@testing-library/react'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import {ThemePicker} from '../../src/components/ThemePicker'
import {ThemeProvider} from '../../src/contexts/ThemeContext'
import {presetThemes} from '../../src/utils/preset-themes'

const mockSetActiveTheme = vi.fn()

const mockColors: ThemeColors = {
  primary: '#000000',
  secondary: '#111111',
  accent: '#222222',
  background: '#ffffff',
  surface: '#fcfcfc',
  text: '#000000',
  textSecondary: '#555555',
  border: '#dddddd',
  error: '#ff0000',
  warning: '#ffaa00',
  success: '#00ff00',
}

const mockUseTheme: UseThemeReturn = {
  currentTheme: {
    id: 'default-light',
    name: 'Default Light',
    mode: 'light' as const,
    colors: mockColors,
  },
  activeThemeChoice: {type: 'mode' as const, mode: 'light' as ThemeMode} as ActiveThemeChoice,
  activeCustomTheme: null,
  themeMode: 'light' as ThemeMode,
  availableThemes: [],
  systemPreference: 'light' as const,
  isDarkMode: false,
  isLightMode: true,
  isSystemMode: false,
  isSystemDark: false,
  isSystemLight: true,
  setThemeMode: vi.fn(),
  setCustomTheme: vi.fn(),
  setActiveTheme: mockSetActiveTheme,
  toggleTheme: vi.fn(),
  switchToLight: vi.fn(),
  switchToDark: vi.fn(),
  switchToSystem: vi.fn(),
  getEffectiveThemeMode: () => 'light',
  isCustomTheme: false,
}

vi.mock('../../src/hooks/UseTheme', () => ({
  useTheme: () => mockUseTheme,
}))

const ThemePickerWrapper: FC = () => (
  <ThemeProvider>
    <ThemePicker />
  </ThemeProvider>
)

describe('ThemePicker', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset mock state to light mode for each test
    mockUseTheme.themeMode = 'light'
    mockUseTheme.activeThemeChoice = {type: 'mode', mode: 'light'}
    mockUseTheme.currentTheme = {
      id: 'default-light',
      name: 'Default Light',
      mode: 'light',
      colors: mockColors,
    }
  })

  it('renders theme picker trigger button', () => {
    render(<ThemePickerWrapper />)
    const button = screen.getByRole('button')
    expect(button).toBeInTheDocument()
    expect(button).toHaveAttribute('aria-haspopup', 'listbox')
    expect(button).toHaveAttribute('aria-expanded', 'false')
  })

  it('trigger opens the picker listbox and displays options', () => {
    render(<ThemePickerWrapper />)
    const button = screen.getByRole('button')
    fireEvent.click(button)
    expect(button).toHaveAttribute('aria-expanded', 'true')
    expect(button).toHaveAttribute('aria-controls', 'theme-picker-listbox')

    const listbox = screen.getByRole('listbox')
    expect(listbox).toBeInTheDocument()
    expect(listbox).toHaveAttribute('id', 'theme-picker-listbox')
  })

  it('renders all 15 options', () => {
    render(<ThemePickerWrapper />)
    const button = screen.getByRole('button')
    fireEvent.click(button)

    const options = screen.getAllByRole('option')
    expect(options).toHaveLength(15) // System, Light, Dark + 12 presets
  })

  it('marks the currently active option with aria-selected="true"', () => {
    mockUseTheme.activeThemeChoice = {type: 'mode', mode: 'light'}
    render(<ThemePickerWrapper />)
    fireEvent.click(screen.getByRole('button'))

    const lightOption = screen.getByRole('option', {name: /^light$/i})
    expect(lightOption).toHaveAttribute('aria-selected', 'true')
  })

  it('renders legacy custom theme status outside the options and focuses first option on open without selecting it', () => {
    mockUseTheme.activeThemeChoice = {
      type: 'legacy-custom',
      theme: {
        id: 'user-custom',
        name: 'My Special Custom',
        mode: 'dark',
        colors: mockColors,
      },
    }

    render(<ThemePickerWrapper />)
    fireEvent.click(screen.getByRole('button'))

    // The legacy custom status text is rendered
    expect(screen.getByText(/Current: Custom theme/i)).toBeInTheDocument()

    // No option is aria-selected="true" since it's a legacy custom theme
    const options = screen.getAllByRole('option')
    options.forEach(opt => {
      expect(opt).not.toHaveAttribute('aria-selected', 'true')
    })
  })

  it('closes picker on Escape and restores focus to trigger after unmounting', async () => {
    render(<ThemePickerWrapper />)
    const button = screen.getByRole('button')
    button.focus()
    fireEvent.click(button)

    const listbox = screen.getByRole('listbox')
    expect(listbox).toBeInTheDocument()

    const spyFocus = vi.spyOn(button, 'focus')

    fireEvent.keyDown(listbox, {key: 'Escape'})

    // Synchronously, the overlay should be closed/closing
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()

    // Focus is not synchronously restored immediately
    expect(spyFocus).not.toHaveBeenCalled()

    // After a tick, focus is restored
    await vi.waitFor(() => {
      expect(spyFocus).toHaveBeenCalled()
    })
  })

  it('closes picker on Tab without stealing focus', () => {
    render(<ThemePickerWrapper />)
    const button = screen.getByRole('button')
    fireEvent.click(button)

    expect(screen.getByRole('listbox')).toBeInTheDocument()
    fireEvent.keyDown(screen.getByRole('listbox'), {key: 'Tab'})

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('closes picker on outside click', () => {
    render(<ThemePickerWrapper />)
    fireEvent.click(screen.getByRole('button'))

    expect(screen.getByRole('listbox')).toBeInTheDocument()

    // Click outside
    fireEvent.pointerDown(document.body)

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('handles arrow navigation wrapping and roving focus', () => {
    mockUseTheme.activeThemeChoice = {type: 'mode', mode: 'light'}
    render(<ThemePickerWrapper />)
    fireEvent.click(screen.getByRole('button'))

    const options = screen.getAllByRole('option')

    // First option (System) is index 0. Light is index 1.
    // ArrowDown from Light should move to Dark (index 2).
    const lightOption = screen.getByRole('option', {name: /^light$/i})
    fireEvent.focus(lightOption)

    fireEvent.keyDown(screen.getByRole('listbox'), {key: 'ArrowDown'})
    expect(document.activeElement).toBe(options[2] || document.body) // Dark

    // ArrowUp back to Light
    fireEvent.keyDown(screen.getByRole('listbox'), {key: 'ArrowUp'})
    expect(document.activeElement).toBe(options[1] || document.body) // Light

    // Wrap around to last item (index 14) from index 0
    fireEvent.focus(options[0] || document.body)
    fireEvent.keyDown(screen.getByRole('listbox'), {key: 'ArrowUp'})
    expect(document.activeElement).toBe(options[14] || document.body)

    // Wrap around to first item (index 0) from index 14
    fireEvent.focus(options[14] || document.body)
    fireEvent.keyDown(screen.getByRole('listbox'), {key: 'ArrowDown'})
    expect(document.activeElement).toBe(options[0] || document.body)
  })

  it('table-drives all 15 options: each exists once and activates the exact ThemeSelection', () => {
    render(<ThemePickerWrapper />)
    fireEvent.click(screen.getByRole('button'))

    const renderedOptions = screen.getAllByRole('option')
    expect(renderedOptions).toHaveLength(15)

    const testCases = [
      {id: 'system', name: 'System', selection: {type: 'mode' as const, mode: 'system' as const}},
      {id: 'light', name: 'Light', selection: {type: 'mode' as const, mode: 'light' as const}},
      {id: 'dark', name: 'Dark', selection: {type: 'mode' as const, mode: 'dark' as const}},
      ...presetThemes.map(theme => ({
        id: theme.id,
        name: theme.name,
        selection: {type: 'preset' as const, theme},
      })),
    ]

    testCases.forEach((tc, index) => {
      // Assert exact order using the index
      const optionElementByIndex = renderedOptions[index]
      if (!optionElementByIndex) {
        throw new Error(`optionElement at index ${index} is undefined`)
      }
      expect(optionElementByIndex).toHaveAttribute('id', `theme-option-${tc.id}`)

      // Assert exact screen reader accessible name
      const optionElement = screen.getByRole('option', {name: new RegExp(`^${tc.name}$`, 'i')})
      expect(optionElement).toBeInTheDocument()
      expect(optionElement).toBe(optionElementByIndex)

      // Click to select
      fireEvent.click(optionElement)

      // If it is already active (Light is active in beforeEach), reselection is a no-op
      if (tc.id === 'light') {
        expect(mockSetActiveTheme).not.toHaveBeenCalledWith(tc.selection)
      } else {
        expect(mockSetActiveTheme).toHaveBeenCalledWith(tc.selection)
      }

      vi.clearAllMocks()
    })
  })

  it('applies theme and keeps picker open with Space key activation on a non-active option', () => {
    mockUseTheme.activeThemeChoice = {type: 'mode', mode: 'light'}
    render(<ThemePickerWrapper />)
    fireEvent.click(screen.getByRole('button'))

    const options = screen.getAllByRole('option')
    const darkOption = options[2]
    if (!darkOption) {
      throw new Error('Dark option is undefined')
    }

    // Focus the non-active Dark option (index 2)
    fireEvent.focus(darkOption)
    // Press Space key (' ')
    fireEvent.keyDown(screen.getByRole('listbox'), {key: ' '})

    expect(mockSetActiveTheme).toHaveBeenCalledWith({type: 'mode', mode: 'dark'})
    expect(screen.getByRole('listbox')).toBeInTheDocument()
  })

  it('asserts exact trigger accessible name for active preset state', () => {
    const activePresetTheme = presetThemes[0]
    if (!activePresetTheme) {
      throw new Error('No preset themes available')
    }
    mockUseTheme.activeThemeChoice = {
      type: 'preset',
      theme: activePresetTheme,
    }
    render(<ThemePickerWrapper />)
    const button = screen.getByRole('button')
    expect(button).toHaveAttribute('aria-label', `Current theme: ${activePresetTheme.name}. Open theme picker.`)
  })

  it('asserts exact trigger accessible name for legacy custom state', () => {
    mockUseTheme.activeThemeChoice = {
      type: 'legacy-custom',
      theme: {
        id: 'user-custom',
        name: 'My Custom Theme',
        mode: 'dark',
        colors: mockColors,
      },
    }
    render(<ThemePickerWrapper />)
    const button = screen.getByRole('button')
    expect(button).toHaveAttribute('aria-label', 'Current theme: Custom. Open theme picker.')
  })
})
