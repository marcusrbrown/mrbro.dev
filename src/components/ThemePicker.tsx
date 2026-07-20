import type {FC, KeyboardEvent, ReactNode} from 'react'
import type {Theme, ThemeMode} from '../types'
import {useEffect, useMemo, useRef, useState} from 'react'
import {useTheme} from '../hooks/UseTheme'
import {presetThemes} from '../utils/preset-themes'

type PickerOption =
  | {
      id: string
      name: string
      type: 'mode'
      mode: ThemeMode
      icon: string
    }
  | {
      id: string
      name: string
      type: 'preset'
      theme: Theme
    }

/**
 * ThemePicker replaces the single-cycle ThemeToggle.
 * It provides a compact, non-modal accessible overlay that lists all 15 choices
 * (System, Light, Dark, and 12 presets) and allows direct interaction and rapid comparison.
 */
export const ThemePicker: FC = () => {
  const {activeThemeChoice, setActiveTheme} = useTheme()
  const [isOpen, setIsOpen] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(0)

  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const optionsRef = useRef<(HTMLDivElement | null)[]>([])

  const previousIsOpenRef = useRef(isOpen)
  const shouldRestoreFocusRef = useRef(false)

  // Exactly 15 options: 3 system/mode items and 12 preset themes
  const options = useMemo<PickerOption[]>(() => {
    const modes: PickerOption[] = [
      {id: 'system', name: 'System', type: 'mode', mode: 'system', icon: '🖥️'},
      {id: 'light', name: 'Light', type: 'mode', mode: 'light', icon: '☀️'},
      {id: 'dark', name: 'Dark', type: 'mode', mode: 'dark', icon: '🌙'},
    ]
    const presets: PickerOption[] = presetThemes.map(theme => ({
      id: theme.id,
      name: theme.name,
      type: 'preset',
      theme,
    }))
    return [...modes, ...presets]
  }, [])

  // Clear references array on resize or open changes
  useEffect(() => {
    optionsRef.current = optionsRef.current.slice(0, options.length)
  }, [options])

  const closePicker = (restoreFocus: boolean) => {
    if (restoreFocus) {
      shouldRestoreFocusRef.current = true
    }
    setIsOpen(false)
  }

  // Get index of the currently active option, if any matches the 15 options
  const activeOptionIndex = useMemo(() => {
    return options.findIndex(option => {
      if (activeThemeChoice.type === 'mode') {
        return option.type === 'mode' && option.mode === activeThemeChoice.mode
      } else if (activeThemeChoice.type === 'preset') {
        return option.type === 'preset' && option.id === activeThemeChoice.theme.id
      }
      return false
    })
  }, [options, activeThemeChoice])

  // Focus the item at focusedIndex whenever it changes while open
  useEffect(() => {
    if (isOpen) {
      const el = optionsRef.current[focusedIndex]
      if (el) {
        el.focus()
        el.scrollIntoView({block: 'nearest'})
      }
    }
  }, [focusedIndex, isOpen])

  // Post-close focus restoration after overlay is completely unmounted
  useEffect(() => {
    if (previousIsOpenRef.current && !isOpen && shouldRestoreFocusRef.current) {
      requestAnimationFrame(() => {
        triggerRef.current?.focus()
      })
      shouldRestoreFocusRef.current = false
    }
    previousIsOpenRef.current = isOpen
  }, [isOpen])

  // Handle outside click/tap dismissal via pointer events
  useEffect(() => {
    if (!isOpen) return

    const handleOutsideClick = (e: PointerEvent) => {
      const target = e.target
      if (
        target instanceof Node &&
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        panelRef.current &&
        !panelRef.current.contains(target)
      ) {
        closePicker(false)
      }
    }

    document.addEventListener('pointerdown', handleOutsideClick)
    return () => {
      document.removeEventListener('pointerdown', handleOutsideClick)
    }
  }, [isOpen])

  const toggleOpen = () => {
    if (isOpen) {
      closePicker(false)
    } else {
      const targetIndex = Math.max(activeOptionIndex, 0)
      setFocusedIndex(targetIndex)
      setIsOpen(true)
    }
  }

  const applyOption = (option: PickerOption) => {
    if (option.type === 'mode') {
      if (activeThemeChoice.type === 'mode' && activeThemeChoice.mode === option.mode) {
        return // reselect no-op
      }
      setActiveTheme({type: 'mode', mode: option.mode})
    } else if (option.type === 'preset') {
      if (activeThemeChoice.type === 'preset' && activeThemeChoice.theme.id === option.theme.id) {
        return // reselect no-op
      }
      setActiveTheme({type: 'preset', theme: option.theme})
    }
  }

  const handleListboxKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setFocusedIndex(prev => (prev + 1) % options.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setFocusedIndex(prev => (prev - 1 + options.length) % options.length)
    } else if (event.key === 'Home') {
      event.preventDefault()
      setFocusedIndex(0)
    } else if (event.key === 'End') {
      event.preventDefault()
      setFocusedIndex(options.length - 1)
    } else if (event.key === 'Escape') {
      event.preventDefault()
      closePicker(true)
    } else if (event.key === 'Tab') {
      // Closes picker and lets normal tab index flow naturally
      closePicker(false)
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      const option = options[focusedIndex]
      if (option) {
        applyOption(option)
      }
    }
  }

  const getAriaLabel = (): string => {
    let activeName = ''
    if (activeThemeChoice.type === 'mode') {
      activeName = activeThemeChoice.mode.charAt(0).toUpperCase() + activeThemeChoice.mode.slice(1)
    } else if (activeThemeChoice.type === 'preset') {
      activeName = activeThemeChoice.theme.name
    } else {
      activeName = 'Custom'
    }
    return `Current theme: ${activeName}. Open theme picker.`
  }

  const getTriggerIcon = (): ReactNode => {
    if (activeThemeChoice.type === 'mode') {
      if (activeThemeChoice.mode === 'light') {
        return (
          <span className="theme-picker__trigger-icon" aria-hidden="true">
            ☀️
          </span>
        )
      }
      if (activeThemeChoice.mode === 'dark') {
        return (
          <span className="theme-picker__trigger-icon" aria-hidden="true">
            🌙
          </span>
        )
      }
      return (
        <span className="theme-picker__trigger-icon" aria-hidden="true">
          🖥️
        </span>
      )
    }
    if (activeThemeChoice.type === 'preset' || activeThemeChoice.type === 'legacy-custom') {
      const {theme} = activeThemeChoice
      return (
        <svg className="theme-picker__trigger-swatch-svg" width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
          <circle cx="6" cy="6" r="5" fill={theme.colors.primary} stroke={theme.colors.border} strokeWidth="1" />
        </svg>
      )
    }
    return (
      <span className="theme-picker__trigger-icon" aria-hidden="true">
        🖥️
      </span>
    )
  }

  const getTriggerText = (): string => {
    if (activeThemeChoice.type === 'mode') {
      return activeThemeChoice.mode.charAt(0).toUpperCase() + activeThemeChoice.mode.slice(1)
    }
    if (activeThemeChoice.type === 'preset') {
      return activeThemeChoice.theme.name
    }
    return 'Custom'
  }

  return (
    <div className="theme-picker">
      <button
        ref={triggerRef}
        type="button"
        onClick={toggleOpen}
        className="theme-picker__trigger theme-toggle"
        data-testid="theme-toggle"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={isOpen ? 'theme-picker-listbox' : undefined}
        aria-label={getAriaLabel()}
        tabIndex={0}
      >
        <span className="theme-picker__trigger-content">
          {getTriggerIcon()}
          <span className="theme-picker__trigger-text">{getTriggerText()}</span>
        </span>
        <span className="theme-picker__arrow" aria-hidden="true">
          ▾
        </span>
      </button>

      {isOpen && (
        <div ref={panelRef} className="theme-picker__panel">
          <div
            id="theme-picker-listbox"
            role="listbox"
            tabIndex={-1}
            aria-label="Theme choices"
            onKeyDown={handleListboxKeyDown}
            className="theme-picker__listbox"
          >
            {options.map((option, idx) => {
              const isSelected = idx === activeOptionIndex
              const isFocused = idx === focusedIndex

              return (
                <div
                  key={option.id}
                  ref={el => {
                    optionsRef.current[idx] = el
                  }}
                  role="option"
                  id={`theme-option-${option.id}`}
                  aria-selected={isSelected}
                  tabIndex={isFocused ? 0 : -1}
                  onFocus={() => setFocusedIndex(idx)}
                  onClick={() => applyOption(option)}
                  className={`theme-picker__option ${isSelected ? 'theme-picker__option--selected' : ''}`}
                >
                  <span className="theme-picker__option-left">
                    {option.type === 'mode' ? (
                      <span className="theme-picker__option-icon" aria-hidden="true">
                        {option.icon}
                      </span>
                    ) : (
                      <svg
                        className="theme-picker__option-swatch-svg"
                        width="14"
                        height="14"
                        viewBox="0 0 14 14"
                        aria-hidden="true"
                      >
                        <circle
                          cx="7"
                          cy="7"
                          r="6"
                          fill={option.theme.colors.primary}
                          stroke={option.theme.colors.border}
                          strokeWidth="1"
                        />
                      </svg>
                    )}
                    <span className="theme-picker__option-name">{option.name}</span>
                  </span>
                  {isSelected && (
                    <span className="theme-picker__checkmark" aria-hidden="true">
                      ✓
                    </span>
                  )}
                </div>
              )
            })}
          </div>

          {activeThemeChoice.type === 'legacy-custom' && (
            <div className="theme-picker__legacy-status">
              <svg
                className="theme-picker__legacy-swatch-svg"
                width="14"
                height="14"
                viewBox="0 0 14 14"
                aria-hidden="true"
              >
                <circle
                  cx="7"
                  cy="7"
                  r="6"
                  fill={activeThemeChoice.theme.colors.primary}
                  stroke={activeThemeChoice.theme.colors.border}
                  strokeWidth="1"
                />
              </svg>
              <span className="theme-picker__legacy-text">Current: Custom theme</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
