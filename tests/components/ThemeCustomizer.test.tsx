/**
 * @vitest-environment happy-dom
 */

import type {Theme} from '../../src/types'
import {act, fireEvent, render, screen, waitFor} from '@testing-library/react'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {ThemeCustomizer} from '../../src/components/ThemeCustomizer'
import {ThemeProvider} from '../../src/contexts/ThemeContext'

// Mock the theme context for testing
const MockedThemeProvider = ({children}: {children: React.ReactNode}) => <ThemeProvider>{children}</ThemeProvider>

describe('ThemeCustomizer', () => {
  const savedThemeFixture: Theme = {
    id: 'saved-theme-1',
    name: 'Saved Test Theme',
    mode: 'dark',
    isBuiltIn: false,
    colors: {
      primary: '#6366f1',
      secondary: '#8b5cf6',
      accent: '#ec4899',
      background: '#0f172a',
      surface: '#1e293b',
      text: '#f8fafc',
      textSecondary: '#cbd5e1',
      border: '#334155',
      error: '#ef4444',
      warning: '#f59e0b',
      success: '#10b981',
    },
  }

  const importedThemeFixture: Theme = {
    ...savedThemeFixture,
    id: 'imported-theme-1',
    name: 'Imported Theme',
    mode: 'light',
  }

  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  const renderCustomizer = (props?: React.ComponentProps<typeof ThemeCustomizer>) =>
    render(
      <MockedThemeProvider>
        <ThemeCustomizer {...props} />
      </MockedThemeProvider>,
    )

  const openLibraryTab = () => {
    fireEvent.click(screen.getByRole('tab', {name: /Library/}))
  }

  const openPresetsTab = () => {
    fireEvent.click(screen.getByRole('tab', {name: 'Presets'}))
  }

  it('renders with basic structure', () => {
    render(
      <MockedThemeProvider>
        <ThemeCustomizer />
      </MockedThemeProvider>,
    )

    expect(screen.getByText('Theme Customizer')).toBeInTheDocument()
    expect(screen.getByDisplayValue(/Custom/)).toBeInTheDocument()
    expect(screen.getByText('Brand Colors')).toBeInTheDocument()
    expect(screen.getByText('Background Colors')).toBeInTheDocument()
    expect(screen.getByText('Text Colors')).toBeInTheDocument()
    expect(screen.getByText('Interface Colors')).toBeInTheDocument()
    expect(screen.getByText('Status Colors')).toBeInTheDocument()
  })

  it('shows close button when onClose prop is provided', () => {
    const mockClose = vi.fn()
    render(
      <MockedThemeProvider>
        <ThemeCustomizer onClose={mockClose} />
      </MockedThemeProvider>,
    )

    const closeButton = screen.getByLabelText('Close theme customizer (Escape)')
    expect(closeButton).toBeInTheDocument()

    fireEvent.click(closeButton)
    expect(mockClose).toHaveBeenCalledOnce()
  })

  it('allows theme mode selection', () => {
    render(
      <MockedThemeProvider>
        <ThemeCustomizer />
      </MockedThemeProvider>,
    )

    const lightModeRadio = screen.getByLabelText('Light')
    const darkModeRadio = screen.getByLabelText('Dark')

    expect(lightModeRadio).toBeInTheDocument()
    expect(darkModeRadio).toBeInTheDocument()

    fireEvent.click(darkModeRadio)
    expect(darkModeRadio).toBeChecked()
  })

  it('has color input fields for each color category', () => {
    render(
      <MockedThemeProvider>
        <ThemeCustomizer />
      </MockedThemeProvider>,
    )

    // Check for color inputs
    expect(screen.getByLabelText('Primary color value')).toBeInTheDocument()
    expect(screen.getByLabelText('Secondary color value')).toBeInTheDocument()
    expect(screen.getByLabelText('Accent color value')).toBeInTheDocument()
    expect(screen.getByLabelText('Background color value')).toBeInTheDocument()
    expect(screen.getByLabelText('Surface color value')).toBeInTheDocument()
    expect(screen.getByLabelText('Text color value')).toBeInTheDocument()
    expect(screen.getByLabelText('Secondary Text color value')).toBeInTheDocument()
    expect(screen.getByLabelText('Border color value')).toBeInTheDocument()
    expect(screen.getByLabelText('Error color value')).toBeInTheDocument()
    expect(screen.getByLabelText('Warning color value')).toBeInTheDocument()
    expect(screen.getByLabelText('Success color value')).toBeInTheDocument()
  })

  it('has HSL toggle buttons for color controls', () => {
    render(
      <MockedThemeProvider>
        <ThemeCustomizer />
      </MockedThemeProvider>,
    )

    const hslButtons = screen.getAllByText('HSL')
    expect(hslButtons.length).toBeGreaterThan(0)

    const firstHslButton = hslButtons[0] as HTMLElement
    expect(firstHslButton).toBeTruthy()
    fireEvent.click(firstHslButton)
    expect(firstHslButton).toHaveAttribute('aria-expanded', 'true')
  })

  it('allows color value editing', () => {
    render(
      <MockedThemeProvider>
        <ThemeCustomizer />
      </MockedThemeProvider>,
    )

    const primaryColorInput = screen.getByLabelText('Primary color value')

    fireEvent.change(primaryColorInput, {target: {value: '#ff0000'}})
    expect(primaryColorInput).toHaveValue('#ff0000')
  })

  it('validates color input values', () => {
    render(
      <MockedThemeProvider>
        <ThemeCustomizer />
      </MockedThemeProvider>,
    )

    const primaryColorInput = screen.getByLabelText('Primary color value')

    // Test invalid color
    fireEvent.change(primaryColorInput, {target: {value: 'invalid-color'}})
    expect(
      screen.getByText('Invalid color format. Use hex (#ffffff), hsl(), rgb(), or named colors.'),
    ).toBeInTheDocument()
  })

  it('has theme name input', () => {
    render(
      <MockedThemeProvider>
        <ThemeCustomizer />
      </MockedThemeProvider>,
    )

    const nameInput = screen.getByDisplayValue(/Custom/)
    expect(nameInput).toBeInTheDocument()

    fireEvent.change(nameInput, {target: {value: 'My Custom Theme'}})
    expect(nameInput).toHaveValue('My Custom Theme')
  })

  it('has apply and reset buttons', () => {
    render(
      <MockedThemeProvider>
        <ThemeCustomizer />
      </MockedThemeProvider>,
    )

    expect(screen.getByText('Apply Theme')).toBeInTheDocument()
    expect(screen.getByText('Reset')).toBeInTheDocument()
  })

  it('calls onThemeChange when colors are modified', () => {
    const mockThemeChange = vi.fn()
    render(
      <MockedThemeProvider>
        <ThemeCustomizer onThemeChange={mockThemeChange} />
      </MockedThemeProvider>,
    )

    const primaryColorInput = screen.getByLabelText('Primary color value')
    fireEvent.change(primaryColorInput, {target: {value: '#ff0000'}})

    expect(mockThemeChange).toHaveBeenCalled()
  })

  it('shows HSL controls when toggled', () => {
    render(
      <MockedThemeProvider>
        <ThemeCustomizer />
      </MockedThemeProvider>,
    )

    const hslButton = screen.getAllByText('HSL')[0] as HTMLElement
    expect(hslButton).toBeTruthy()
    fireEvent.click(hslButton)

    expect(screen.getByText(/Hue:/)).toBeInTheDocument()
    expect(screen.getByText(/Saturation:/)).toBeInTheDocument()
    expect(screen.getByText(/Lightness:/)).toBeInTheDocument()
  })

  it('updates HSL values with sliders', () => {
    render(
      <MockedThemeProvider>
        <ThemeCustomizer />
      </MockedThemeProvider>,
    )

    const hslButton = screen.getAllByText('HSL')[0] as HTMLElement
    expect(hslButton).toBeTruthy()
    fireEvent.click(hslButton)

    const hueSlider = screen.getByLabelText('Hue value')
    fireEvent.change(hueSlider, {target: {value: '180'}})

    expect(hueSlider).toHaveValue('180')
  })

  it('applies custom class name', () => {
    const {container} = render(
      <MockedThemeProvider>
        <ThemeCustomizer className="custom-class" />
      </MockedThemeProvider>,
    )

    expect(container.firstChild).toHaveClass('theme-customizer')
    expect(container.firstChild).toHaveClass('custom-class')
  })

  it('shows error notification when theme validation fails on apply', async () => {
    const themeValidation = await import('../../src/utils/theme-validation')
    const validateSpy = vi.spyOn(themeValidation, 'validateTheme').mockReturnValueOnce(false)

    render(
      <MockedThemeProvider>
        <ThemeCustomizer />
      </MockedThemeProvider>,
    )

    const applyButton = screen.getByText('Apply Theme')
    fireEvent.click(applyButton)

    expect(screen.getByText('Theme validation failed')).toBeInTheDocument()

    validateSpy.mockRestore()
  })

  it('should switch to Presets tab on click', () => {
    render(
      <MockedThemeProvider>
        <ThemeCustomizer />
      </MockedThemeProvider>,
    )

    fireEvent.click(screen.getByRole('tab', {name: 'Presets'}))
    // PresetThemeGallery is rendered — check the tab panel is present
    expect(screen.getByRole('tabpanel', {hidden: true})).toBeInTheDocument()
  })

  it('should switch to Library tab on click', () => {
    render(
      <MockedThemeProvider>
        <ThemeCustomizer />
      </MockedThemeProvider>,
    )

    fireEvent.click(screen.getByRole('tab', {name: /Library/}))
    // Library tab should render saved themes section
    expect(screen.getByText('Saved Themes')).toBeInTheDocument()
  })

  it('should update theme name input', () => {
    render(
      <MockedThemeProvider>
        <ThemeCustomizer />
      </MockedThemeProvider>,
    )

    const nameInput = screen.getByLabelText(/Theme Name/)
    fireEvent.change(nameInput, {target: {value: 'My Custom Theme'}})
    expect(nameInput).toHaveValue('My Custom Theme')
  })

  it('should call onThemeChange when theme mode is changed', () => {
    const onThemeChange = vi.fn()
    render(
      <MockedThemeProvider>
        <ThemeCustomizer onThemeChange={onThemeChange} />
      </MockedThemeProvider>,
    )

    const darkRadio = screen.getByLabelText('Dark')
    fireEvent.click(darkRadio)
    expect(onThemeChange).toHaveBeenCalled()
  })

  it('should apply theme and call onClose when validation passes', async () => {
    const onClose = vi.fn()
    const themeValidation = await import('../../src/utils/theme-validation')
    const validateSpy = vi.spyOn(themeValidation, 'validateTheme').mockReturnValueOnce(true)

    render(
      <MockedThemeProvider>
        <ThemeCustomizer onClose={onClose} />
      </MockedThemeProvider>,
    )

    fireEvent.click(screen.getByText('Apply Theme'))
    expect(onClose).toHaveBeenCalledOnce()

    validateSpy.mockRestore()
  })

  it('should show notification on save to library', () => {
    const {container} = render(
      <MockedThemeProvider>
        <ThemeCustomizer />
      </MockedThemeProvider>,
    )

    fireEvent.click(screen.getByRole('button', {name: /Save theme to library/i}))

    const notification = container.querySelector('.theme-customizer__notification')
    expect(notification).toBeTruthy()
    expect(notification?.textContent).toMatch(/saved successfully|validation failed|Failed to save/i)
  })

  it('should handle keyboard Escape to close', () => {
    const onClose = vi.fn()
    render(
      <MockedThemeProvider>
        <ThemeCustomizer onClose={onClose} />
      </MockedThemeProvider>,
    )

    // Escape is handled by the customizer's own onKeyDown, not document
    const dialog = screen.getByRole('dialog')
    fireEvent.keyDown(dialog, {key: 'Escape'})
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('should reset theme to current on reset button click', async () => {
    render(
      <MockedThemeProvider>
        <ThemeCustomizer />
      </MockedThemeProvider>,
    )

    // Change the name first
    const nameInput = screen.getByLabelText(/Theme Name/)
    fireEvent.change(nameInput, {target: {value: 'Changed Name'}})
    expect(nameInput).toHaveValue('Changed Name')

    // Click reset
    fireEvent.click(screen.getByRole('button', {name: /Reset/i}))

    // Name should be reset to default
    await waitFor(() => {
      const resetInput = screen.getByLabelText(/Theme Name/)
      expect(resetInput).not.toHaveValue('Changed Name')
    })
  })

  it('should load a preset theme on click', () => {
    render(
      <MockedThemeProvider>
        <ThemeCustomizer />
      </MockedThemeProvider>,
    )

    fireEvent.click(screen.getByRole('tab', {name: 'Presets'}))
    const applyButtons = screen.getAllByRole('button', {name: /Apply .* theme/i})
    expect(applyButtons.length).toBeGreaterThan(0)
    const firstButton = applyButtons[0] as HTMLElement
    expect(firstButton).toBeTruthy()
    fireEvent.click(firstButton)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('should handle import button in Library tab', () => {
    render(
      <MockedThemeProvider>
        <ThemeCustomizer />
      </MockedThemeProvider>,
    )

    fireEvent.click(screen.getByRole('tab', {name: /Library/}))
    const importBtn = screen.getByRole('button', {name: /Import Theme/i})
    expect(importBtn).toBeInTheDocument()
  })

  it('should handle export theme button click', () => {
    render(
      <MockedThemeProvider>
        <ThemeCustomizer />
      </MockedThemeProvider>,
    )

    const exportBtn = screen.getByRole('button', {name: /Export/})
    expect(exportBtn).toBeInTheDocument()
    expect(() => fireEvent.click(exportBtn)).not.toThrow()
  })

  it('shows save error notification when validateTheme is false', async () => {
    const themeValidation = await import('../../src/utils/theme-validation')
    vi.spyOn(themeValidation, 'validateTheme').mockReturnValueOnce(false)

    const {container} = renderCustomizer()
    fireEvent.click(screen.getByRole('button', {name: /Save theme to library/i}))

    const notification = container.querySelector('.theme-customizer__notification')
    expect(notification).toBeTruthy()
    expect(notification?.textContent).toContain('Theme validation failed')
  })

  it('shows save error when saveThemeToLibrary returns false', async () => {
    const themeValidation = await import('../../src/utils/theme-validation')
    const themeStorage = await import('../../src/utils/theme-storage')
    vi.spyOn(themeValidation, 'validateTheme').mockReturnValueOnce(true)
    vi.spyOn(themeStorage, 'saveThemeToLibrary').mockReturnValueOnce(false)

    const {container} = renderCustomizer()
    fireEvent.click(screen.getByRole('button', {name: /Save theme to library/i}))

    const notification = container.querySelector('.theme-customizer__notification')
    expect(notification).toBeTruthy()
    expect(notification?.textContent).toContain('Failed to save theme')
  })

  it('exports theme successfully and shows success notification', async () => {
    const themeExport = await import('../../src/utils/theme-export')
    const exportSpy = vi.spyOn(themeExport, 'exportTheme').mockImplementation(() => {})

    const {container} = renderCustomizer()
    fireEvent.click(screen.getByRole('button', {name: /Export theme as JSON file/i}))

    expect(exportSpy).toHaveBeenCalledOnce()
    const notification = container.querySelector('.theme-customizer__notification')
    expect(notification).toBeTruthy()
    expect(notification?.textContent).toContain('Theme exported successfully!')
  })

  it('shows export error notification when exportTheme throws', async () => {
    const themeExport = await import('../../src/utils/theme-export')
    vi.spyOn(themeExport, 'exportTheme').mockImplementationOnce(() => {
      throw new Error('boom')
    })

    const {container} = renderCustomizer()
    fireEvent.click(screen.getByRole('button', {name: /Export theme as JSON file/i}))

    const notification = container.querySelector('.theme-customizer__notification')
    expect(notification).toBeTruthy()
    expect(notification?.textContent).toContain('Failed to export theme')
  })

  it('copies theme successfully and shows success notification', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: {writeText: vi.fn(), readText: vi.fn()},
      configurable: true,
    })

    const themeExport = await import('../../src/utils/theme-export')
    const copySpy = vi.spyOn(themeExport, 'copyThemeToClipboard').mockResolvedValueOnce()
    const {container} = renderCustomizer()

    fireEvent.click(screen.getByRole('button', {name: /Copy theme JSON to clipboard/i}))

    await waitFor(() => {
      expect(copySpy).toHaveBeenCalledOnce()
      const notification = container.querySelector('.theme-customizer__notification')
      expect(notification?.textContent).toContain('Theme copied to clipboard!')
    })
  })

  it('shows copy error notification when copyThemeToClipboard rejects', async () => {
    const themeExport = await import('../../src/utils/theme-export')
    vi.spyOn(themeExport, 'copyThemeToClipboard').mockRejectedValueOnce(new Error('clipboard failed'))

    const {container} = renderCustomizer()
    fireEvent.click(screen.getByRole('button', {name: /Copy theme JSON to clipboard/i}))

    await waitFor(() => {
      const notification = container.querySelector('.theme-customizer__notification')
      expect(notification?.textContent).toContain('Failed to copy theme to clipboard')
    })
  })

  it('returns early for import when no file is selected', async () => {
    const themeExport = await import('../../src/utils/theme-export')
    const validateFileSpy = vi.spyOn(themeExport, 'validateThemeFile')

    const {container} = renderCustomizer()
    openLibraryTab()
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement
    expect(fileInput).toBeTruthy()

    fireEvent.change(fileInput, {target: {files: []}})
    expect(validateFileSpy).not.toHaveBeenCalled()
  })

  it('shows import validation error when validateThemeFile returns errors', async () => {
    const themeExport = await import('../../src/utils/theme-export')
    vi.spyOn(themeExport, 'validateThemeFile').mockReturnValueOnce(['bad extension'])

    const {container} = renderCustomizer()
    openLibraryTab()
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['{}'], 'broken.txt', {type: 'text/plain'})

    fireEvent.change(fileInput, {target: {files: [file]}})

    const notification = container.querySelector('.theme-customizer__notification')
    expect(notification).toBeTruthy()
    expect(notification?.textContent).toContain('Invalid file: bad extension')
  })

  it('imports theme successfully and updates editor fields', async () => {
    const themeExport = await import('../../src/utils/theme-export')
    vi.spyOn(themeExport, 'validateThemeFile').mockReturnValueOnce([])
    vi.spyOn(themeExport, 'importTheme').mockResolvedValueOnce(importedThemeFixture)

    const onThemeChange = vi.fn()
    const {container} = renderCustomizer({onThemeChange})
    openLibraryTab()
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['{}'], 'theme.json', {type: 'application/json'})

    fireEvent.change(fileInput, {target: {files: [file]}})

    await waitFor(() => {
      expect(onThemeChange).toHaveBeenCalledWith(expect.objectContaining({name: 'Imported Theme'}))
      const notification = container.querySelector('.theme-customizer__notification')
      expect(notification?.textContent).toContain('imported successfully')
    })

    fireEvent.click(screen.getByRole('button', {name: /Return to theme editor/i}))
    expect(screen.getByDisplayValue('Imported Theme')).toBeInTheDocument()
    expect(screen.getByLabelText('Light')).toBeChecked()
  })

  it('shows import error notification when importTheme rejects', async () => {
    const themeExport = await import('../../src/utils/theme-export')
    vi.spyOn(themeExport, 'validateThemeFile').mockReturnValueOnce([])
    vi.spyOn(themeExport, 'importTheme').mockRejectedValueOnce(new Error('invalid json'))

    const {container} = renderCustomizer()
    openLibraryTab()
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['{}'], 'theme.json', {type: 'application/json'})

    fireEvent.change(fileInput, {target: {files: [file]}})

    await waitFor(() => {
      const notification = container.querySelector('.theme-customizer__notification')
      expect(notification?.textContent).toContain('Import failed: invalid json')
    })
  })

  it('resets file input after successful import', async () => {
    const themeExport = await import('../../src/utils/theme-export')
    vi.spyOn(themeExport, 'validateThemeFile').mockReturnValueOnce([])
    vi.spyOn(themeExport, 'importTheme').mockResolvedValueOnce(importedThemeFixture)

    const {container} = renderCustomizer()
    openLibraryTab()
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['{}'], 'theme.json', {type: 'application/json'})

    fireEvent.change(fileInput, {target: {files: [file]}})

    await waitFor(() => {
      expect(fileInput?.value).toBe('')
    })
  })

  it('loads saved theme and shows success notification', () => {
    localStorage.setItem('mrbro-dev-saved-themes', JSON.stringify([savedThemeFixture]))

    const {container} = renderCustomizer()
    openLibraryTab()

    fireEvent.click(screen.getByRole('button', {name: /Load Saved Test Theme theme/i}))

    const notification = container.querySelector('.theme-customizer__notification')
    expect(notification?.textContent).toContain('loaded!')

    fireEvent.click(screen.getByRole('button', {name: /Return to theme editor/i}))
    expect(screen.getByDisplayValue('Saved Test Theme')).toBeInTheDocument()
  })

  it('deletes saved theme successfully and shows success notification', async () => {
    localStorage.setItem('mrbro-dev-saved-themes', JSON.stringify([savedThemeFixture]))
    const themeStorage = await import('../../src/utils/theme-storage')
    vi.spyOn(themeStorage, 'removeThemeFromLibrary').mockReturnValueOnce(true)

    const {container} = renderCustomizer()
    openLibraryTab()
    fireEvent.click(screen.getByRole('button', {name: /Delete Saved Test Theme theme from library/i}))

    const notification = container.querySelector('.theme-customizer__notification')
    expect(notification?.textContent).toContain('Theme deleted successfully!')
  })

  it('shows delete error notification when deleting saved theme fails', async () => {
    localStorage.setItem('mrbro-dev-saved-themes', JSON.stringify([savedThemeFixture]))
    const themeStorage = await import('../../src/utils/theme-storage')
    vi.spyOn(themeStorage, 'removeThemeFromLibrary').mockReturnValueOnce(false)

    const {container} = renderCustomizer()
    openLibraryTab()
    fireEvent.click(screen.getByRole('button', {name: /Delete Saved Test Theme theme from library/i}))

    const notification = container.querySelector('.theme-customizer__notification')
    expect(notification?.textContent).toContain('Failed to delete theme')
  })

  it('renders saved theme cards in library when themes exist', () => {
    localStorage.setItem('mrbro-dev-saved-themes', JSON.stringify([savedThemeFixture]))
    renderCustomizer()
    openLibraryTab()

    expect(screen.getByText('Saved Test Theme')).toBeInTheDocument()
    expect(screen.getByText('dark')).toBeInTheDocument()
  })

  it('renders empty state in library when no themes exist', () => {
    renderCustomizer()
    openLibraryTab()

    expect(screen.getByText('No saved themes yet.')).toBeInTheDocument()
  })

  it('cycles tabs with ArrowRight and ArrowLeft with wrap behavior', () => {
    renderCustomizer()

    const libraryTab = screen.getByRole('tab', {name: /Library/})
    fireEvent.click(libraryTab)
    fireEvent.keyDown(libraryTab, {key: 'ArrowRight'})

    expect(screen.getByRole('tab', {name: 'Editor'})).toHaveAttribute('aria-selected', 'true')
    const editorTab = screen.getByRole('tab', {name: 'Editor'})
    fireEvent.keyDown(editorTab, {key: 'ArrowLeft'})

    expect(screen.getByRole('tab', {name: /Library/})).toHaveAttribute('aria-selected', 'true')
  })

  it('handles Ctrl+S keyboard shortcut to save theme', async () => {
    const themeStorage = await import('../../src/utils/theme-storage')
    const saveSpy = vi.spyOn(themeStorage, 'saveThemeToLibrary').mockReturnValueOnce(true)

    renderCustomizer()
    fireEvent.keyDown(screen.getByRole('dialog'), {key: 's', ctrlKey: true})

    expect(saveSpy).toHaveBeenCalledOnce()
  })

  it('handles Ctrl+E keyboard shortcut to export theme', async () => {
    const themeExport = await import('../../src/utils/theme-export')
    const exportSpy = vi.spyOn(themeExport, 'exportTheme').mockImplementation(() => {})

    renderCustomizer()
    fireEvent.keyDown(screen.getByRole('dialog'), {key: 'e', ctrlKey: true})

    expect(exportSpy).toHaveBeenCalledOnce()
  })

  it('handles Ctrl+Enter keyboard shortcut to apply theme', async () => {
    const onClose = vi.fn()
    const themeValidation = await import('../../src/utils/theme-validation')
    vi.spyOn(themeValidation, 'validateTheme').mockReturnValueOnce(true)

    renderCustomizer({onClose})
    fireEvent.keyDown(screen.getByRole('dialog'), {key: 'Enter', ctrlKey: true})

    expect(onClose).toHaveBeenCalledOnce()
  })

  it('switches tabs using Enter key on tab buttons', () => {
    renderCustomizer()
    const presetsTab = screen.getByRole('tab', {name: 'Presets'})

    fireEvent.keyDown(presetsTab, {key: 'Enter'})
    expect(presetsTab).toHaveAttribute('aria-selected', 'true')
  })

  it('switches tabs using Space key on tab buttons', () => {
    renderCustomizer()
    const libraryTab = screen.getByRole('tab', {name: /Library/})

    fireEvent.keyDown(libraryTab, {key: ' '})
    expect(libraryTab).toHaveAttribute('aria-selected', 'true')
  })

  it('triggers footer action with Enter key via handleButtonKeyDown', async () => {
    const themeStorage = await import('../../src/utils/theme-storage')
    const saveSpy = vi.spyOn(themeStorage, 'saveThemeToLibrary').mockReturnValueOnce(true)
    renderCustomizer()

    fireEvent.keyDown(screen.getByRole('button', {name: /Save theme to library/i}), {key: 'Enter'})
    expect(saveSpy).toHaveBeenCalledOnce()
  })

  it('triggers footer action with Space key via handleButtonKeyDown', async () => {
    const themeExport = await import('../../src/utils/theme-export')
    const exportSpy = vi.spyOn(themeExport, 'exportTheme').mockImplementation(() => {})
    renderCustomizer()

    fireEvent.keyDown(screen.getByRole('button', {name: /Export theme as JSON file/i}), {key: ' '})
    expect(exportSpy).toHaveBeenCalledOnce()
  })

  it('SavedThemeCard load button works on Enter key', () => {
    localStorage.setItem('mrbro-dev-saved-themes', JSON.stringify([savedThemeFixture]))
    renderCustomizer()
    openLibraryTab()

    const loadButton = screen.getByRole('button', {name: /Load Saved Test Theme theme/i})
    fireEvent.keyDown(loadButton, {key: 'Enter'})

    fireEvent.click(screen.getByRole('button', {name: /Return to theme editor/i}))
    expect(screen.getByDisplayValue('Saved Test Theme')).toBeInTheDocument()
  })

  it('SavedThemeCard load button works on Space key', () => {
    localStorage.setItem('mrbro-dev-saved-themes', JSON.stringify([savedThemeFixture]))
    renderCustomizer()
    openLibraryTab()

    const loadButton = screen.getByRole('button', {name: /Load Saved Test Theme theme/i})
    fireEvent.keyDown(loadButton, {key: ' '})

    fireEvent.click(screen.getByRole('button', {name: /Return to theme editor/i}))
    expect(screen.getByDisplayValue('Saved Test Theme')).toBeInTheDocument()
  })

  it('SavedThemeCard export button works on click', async () => {
    localStorage.setItem('mrbro-dev-saved-themes', JSON.stringify([savedThemeFixture]))
    const themeExport = await import('../../src/utils/theme-export')
    const exportSpy = vi.spyOn(themeExport, 'exportTheme').mockImplementation(() => {})

    renderCustomizer()
    openLibraryTab()
    fireEvent.click(screen.getByRole('button', {name: /Export Saved Test Theme theme as JSON/i}))

    expect(exportSpy).toHaveBeenCalledWith(expect.objectContaining({id: 'saved-theme-1'}))
  })

  it('SavedThemeCard export button works on keyboard Enter', async () => {
    localStorage.setItem('mrbro-dev-saved-themes', JSON.stringify([savedThemeFixture]))
    const themeExport = await import('../../src/utils/theme-export')
    const exportSpy = vi.spyOn(themeExport, 'exportTheme').mockImplementation(() => {})

    renderCustomizer()
    openLibraryTab()
    fireEvent.keyDown(screen.getByRole('button', {name: /Export Saved Test Theme theme as JSON/i}), {key: 'Enter'})

    expect(exportSpy).toHaveBeenCalledWith(expect.objectContaining({id: 'saved-theme-1'}))
  })

  it('SavedThemeCard delete button works on keyboard Space', async () => {
    localStorage.setItem('mrbro-dev-saved-themes', JSON.stringify([savedThemeFixture]))
    const themeStorage = await import('../../src/utils/theme-storage')
    const deleteSpy = vi.spyOn(themeStorage, 'removeThemeFromLibrary').mockReturnValueOnce(true)

    renderCustomizer()
    openLibraryTab()
    fireEvent.keyDown(screen.getByRole('button', {name: /Delete Saved Test Theme theme from library/i}), {key: ' '})

    expect(deleteSpy).toHaveBeenCalledWith('saved-theme-1')
  })

  it('shows accessibility success message when theme is accessible', () => {
    renderCustomizer()
    expect(screen.getByText(/All color combinations meet WCAG 2.1 AA accessibility standards/i)).toBeInTheDocument()
  })

  it('shows accessibility issues list when theme has contrast issues', async () => {
    const themeValidation = await import('../../src/utils/theme-validation')
    vi.spyOn(themeValidation, 'validateThemeAccessibility').mockReturnValueOnce({
      isAccessible: false,
      issues: [
        {
          pair: ['text', 'background'],
          contrast: {ratio: 2.1, meetsAA: false, meetsAAA: false, grade: 'Fail'},
        },
      ],
    })

    renderCustomizer()
    expect(screen.getByText('Color contrast issues found:')).toBeInTheDocument()
    expect(screen.getByText('(needs 4.5:1 for WCAG AA)')).toBeInTheDocument()
  })

  it('auto-dismisses notification after timeout', async () => {
    vi.useFakeTimers()
    const themeStorage = await import('../../src/utils/theme-storage')
    vi.spyOn(themeStorage, 'saveThemeToLibrary').mockReturnValueOnce(true)

    const {container} = renderCustomizer()
    fireEvent.click(screen.getByRole('button', {name: /Save theme to library/i}))

    expect(container.querySelector('.theme-customizer__notification')).toBeTruthy()
    act(() => {
      vi.advanceTimersByTime(3000)
    })

    expect(container.querySelector('.theme-customizer__notification')).toBeNull()
  })

  it('renders error notification type class', async () => {
    const themeValidation = await import('../../src/utils/theme-validation')
    vi.spyOn(themeValidation, 'validateTheme').mockReturnValueOnce(false)

    const {container} = renderCustomizer()
    fireEvent.click(screen.getByRole('button', {name: /Save theme to library/i}))

    expect(container.querySelector('.theme-customizer__notification--error')).toBeTruthy()
  })

  it('renders success notification type class', async () => {
    const themeStorage = await import('../../src/utils/theme-storage')
    vi.spyOn(themeStorage, 'saveThemeToLibrary').mockReturnValueOnce(true)

    const {container} = renderCustomizer()
    fireEvent.click(screen.getByRole('button', {name: /Save theme to library/i}))

    expect(container.querySelector('.theme-customizer__notification--success')).toBeTruthy()
  })

  it('shows presets footer action and switches back to editor', () => {
    renderCustomizer()
    openPresetsTab()

    const customizeButton = screen.getByRole('button', {name: /Switch to editor tab to customize selected theme/i})
    expect(customizeButton).toBeInTheDocument()
    fireEvent.click(customizeButton)
    expect(screen.getByRole('button', {name: /Apply theme and close/i})).toBeInTheDocument()
  })

  it('shows library footer action and switches back to editor', () => {
    renderCustomizer()
    openLibraryTab()

    const backButton = screen.getByRole('button', {name: /Return to theme editor/i})
    expect(backButton).toBeInTheDocument()
    fireEvent.click(backButton)
    expect(screen.getByRole('button', {name: /Apply theme and close/i})).toBeInTheDocument()
  })

  it('applies HSL slider min and max bounds attributes', () => {
    renderCustomizer()
    const hslButton = screen.getAllByText('HSL')[0] as HTMLElement
    fireEvent.click(hslButton)

    const hueSlider = screen.getByLabelText('Hue value')
    const saturationSlider = screen.getByLabelText('Saturation value')
    const lightnessSlider = screen.getByLabelText('Lightness value')

    expect(hueSlider).toHaveAttribute('min', '0')
    expect(hueSlider).toHaveAttribute('max', '360')
    expect(saturationSlider).toHaveAttribute('min', '0')
    expect(saturationSlider).toHaveAttribute('max', '100')
    expect(lightnessSlider).toHaveAttribute('min', '0')
    expect(lightnessSlider).toHaveAttribute('max', '100')
  })

  it('parseColor handles HSL input and updates HSL slider values', () => {
    renderCustomizer()
    const primaryColorInput = screen.getByLabelText('Primary color value')
    fireEvent.change(primaryColorInput, {target: {value: 'hsl(120, 40%, 60%)'}})

    const hslButton = screen.getAllByText('HSL')[0] as HTMLElement
    fireEvent.click(hslButton)

    expect(screen.getByText('Hue: 120°')).toBeInTheDocument()
    expect(screen.getByText('Saturation: 40%')).toBeInTheDocument()
    expect(screen.getByText('Lightness: 60%')).toBeInTheDocument()
  })

  it('parseColor handles RGB input and converts to HSL', () => {
    renderCustomizer()
    const primaryColorInput = screen.getByLabelText('Primary color value')
    fireEvent.change(primaryColorInput, {target: {value: 'rgb(255, 0, 0)'}})

    const hslButton = screen.getAllByText('HSL')[0] as HTMLElement
    fireEvent.click(hslButton)

    expect(screen.getByText('Hue: 0°')).toBeInTheDocument()
    expect(screen.getByText('Saturation: 100%')).toBeInTheDocument()
    expect(screen.getByText('Lightness: 50%')).toBeInTheDocument()
  })

  it('parseColor handles hex input using fallback HSL values', () => {
    renderCustomizer()
    const hslButton = screen.getAllByText('HSL')[0] as HTMLElement
    fireEvent.click(hslButton)

    expect(screen.getByText('Hue: 0°')).toBeInTheDocument()
    expect(screen.getByText('Saturation: 50%')).toBeInTheDocument()
    expect(screen.getByText('Lightness: 50%')).toBeInTheDocument()
  })

  it('parseColor handles unknown format by preserving previous HSL values', () => {
    renderCustomizer()
    const primaryColorInput = screen.getByLabelText('Primary color value')
    fireEvent.change(primaryColorInput, {target: {value: 'hsl(10, 20%, 30%)'}})
    fireEvent.change(primaryColorInput, {target: {value: 'inherit'}})

    const hslButton = screen.getAllByText('HSL')[0] as HTMLElement
    fireEvent.click(hslButton)

    expect(screen.getByText('Hue: 10°')).toBeInTheDocument()
    expect(screen.getByText('Saturation: 20%')).toBeInTheDocument()
    expect(screen.getByText('Lightness: 30%')).toBeInTheDocument()
  })

  it('validateColor accepts hex3 format', () => {
    renderCustomizer()
    const input = screen.getByLabelText('Primary color value')
    fireEvent.change(input, {target: {value: '#fff'}})
    expect(input).not.toHaveClass('color-input__text--invalid')
  })

  it('validateColor accepts hex6 format', () => {
    renderCustomizer()
    const input = screen.getByLabelText('Primary color value')
    fireEvent.change(input, {target: {value: '#abcdef'}})
    expect(input).not.toHaveClass('color-input__text--invalid')
  })

  it('validateColor accepts hex8 format', () => {
    renderCustomizer()
    const input = screen.getByLabelText('Primary color value')
    fireEvent.change(input, {target: {value: '#11223344'}})
    expect(input).not.toHaveClass('color-input__text--invalid')
  })

  it('validateColor accepts hsl format', () => {
    renderCustomizer()
    const input = screen.getByLabelText('Primary color value')
    fireEvent.change(input, {target: {value: 'hsl(30, 60%, 50%)'}})
    expect(input).not.toHaveClass('color-input__text--invalid')
  })

  it('validateColor accepts hsla format', () => {
    renderCustomizer()
    const input = screen.getByLabelText('Primary color value')
    fireEvent.change(input, {target: {value: 'hsla(30, 60%, 50%, 0.5)'}})
    expect(input).not.toHaveClass('color-input__text--invalid')
  })

  it('validateColor accepts rgb format', () => {
    renderCustomizer()
    const input = screen.getByLabelText('Primary color value')
    fireEvent.change(input, {target: {value: 'rgb(10, 20, 30)'}})
    expect(input).not.toHaveClass('color-input__text--invalid')
  })

  it('validateColor accepts rgba format', () => {
    renderCustomizer()
    const input = screen.getByLabelText('Primary color value')
    fireEvent.change(input, {target: {value: 'rgba(10, 20, 30, 0.7)'}})
    expect(input).not.toHaveClass('color-input__text--invalid')
  })

  it('validateColor accepts transparent and currentcolor keywords', () => {
    renderCustomizer()
    const input = screen.getByLabelText('Primary color value')

    fireEvent.change(input, {target: {value: 'transparent'}})
    expect(input).not.toHaveClass('color-input__text--invalid')

    fireEvent.change(input, {target: {value: 'currentcolor'}})
    expect(input).not.toHaveClass('color-input__text--invalid')
  })

  it('validateColor rejects random invalid strings', () => {
    renderCustomizer()
    const input = screen.getByLabelText('Primary color value')
    fireEvent.change(input, {target: {value: 'totally-not-a-color'}})

    expect(input).toHaveClass('color-input__text--invalid')
  })
})
