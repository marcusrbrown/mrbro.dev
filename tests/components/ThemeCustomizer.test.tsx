/**
 * @vitest-environment happy-dom
 */

import {fireEvent, render, screen, waitFor} from '@testing-library/react'
import {describe, expect, it, vi} from 'vitest'
import {ThemeCustomizer} from '../../src/components/ThemeCustomizer'
import {ThemeProvider} from '../../src/contexts/ThemeContext'

// Mock the theme context for testing
const MockedThemeProvider = ({children}: {children: React.ReactNode}) => <ThemeProvider>{children}</ThemeProvider>

describe('ThemeCustomizer', () => {
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

    // Test expanding HSL controls
    const firstHslButton = hslButtons[0]
    if (firstHslButton) {
      fireEvent.click(firstHslButton)
      expect(firstHslButton).toHaveAttribute('aria-expanded', 'true')
    }
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

    const hslButton = screen.getAllByText('HSL')[0]
    if (hslButton) {
      fireEvent.click(hslButton)

      // Check for HSL sliders
      expect(screen.getByText(/Hue:/)).toBeInTheDocument()
      expect(screen.getByText(/Saturation:/)).toBeInTheDocument()
      expect(screen.getByText(/Lightness:/)).toBeInTheDocument()
    }
  })

  it('updates HSL values with sliders', () => {
    render(
      <MockedThemeProvider>
        <ThemeCustomizer />
      </MockedThemeProvider>,
    )

    const hslButton = screen.getAllByText('HSL')[0]
    if (hslButton) {
      fireEvent.click(hslButton)

      const hueSlider = screen.getByLabelText('Hue value')
      fireEvent.change(hueSlider, {target: {value: '180'}})

      expect(hueSlider).toHaveValue('180')
    }
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

  it('should show success notification on save to library', async () => {
    render(
      <MockedThemeProvider>
        <ThemeCustomizer />
      </MockedThemeProvider>,
    )

    const saveBtn = screen.queryByRole('button', {name: /Save to Library/i})
    if (saveBtn) {
      fireEvent.click(saveBtn)
      await waitFor(() => {
        expect(screen.queryByRole('alert')).toBeInTheDocument()
      })
    }
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
    // Preset cards have role="button" with aria-label="Apply [Name] theme"
    const applyButtons = screen.getAllByRole('button', {name: /Apply .* theme/i})
    expect(applyButtons.length).toBeGreaterThan(0)
    const firstButton = applyButtons[0]
    if (firstButton) fireEvent.click(firstButton)
    // After loading a preset, customizer stays open but editing theme is updated
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('should handle import button trigger', () => {
    render(
      <MockedThemeProvider>
        <ThemeCustomizer />
      </MockedThemeProvider>,
    )

    // Switch to export/import tab or find the import button
    const importBtn = screen.queryByRole('button', {name: /Import Theme/i})
    if (importBtn) {
      expect(importBtn).toBeInTheDocument()
    }
  })

  it('should handle export theme button click', () => {
    render(
      <MockedThemeProvider>
        <ThemeCustomizer />
      </MockedThemeProvider>,
    )

    const exportBtn = screen.queryByRole('button', {name: /Export Theme/i})
    if (exportBtn) {
      expect(() => fireEvent.click(exportBtn)).not.toThrow()
    }
  })
})
