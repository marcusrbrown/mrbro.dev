import {render, screen} from '@testing-library/react'
import {MemoryRouter} from 'react-router-dom'
import {describe, expect, it, vi} from 'vitest'
import About from '../../src/pages/About'

vi.mock('../../src/hooks/UsePageTitle', () => ({
  usePageTitle: vi.fn(),
}))

vi.mock('../../src/components/CodeBlock', () => ({
  default: ({children, language, title}: {children: string; language: string; title: string}) => (
    <pre data-testid="code-block" data-language={language} data-title={title}>
      {children}
    </pre>
  ),
}))

const AboutWrapper: React.FC = () => (
  <MemoryRouter>
    <About />
  </MemoryRouter>
)

describe('About Page', () => {
  it('should render the about heading', () => {
    render(<AboutWrapper />)
    expect(screen.getByRole('heading', {name: 'About Me'})).toBeInTheDocument()
  })

  it('should render the introduction paragraph', () => {
    render(<AboutWrapper />)
    expect(screen.getByText(/Hello! I'm Marcus R. Brown/)).toBeInTheDocument()
  })

  it('should render the portfolio description', () => {
    render(<AboutWrapper />)
    expect(screen.getByText(/This portfolio showcases/)).toBeInTheDocument()
  })

  it('should render the theme-aware code highlighting section', () => {
    render(<AboutWrapper />)
    expect(screen.getByRole('heading', {name: 'Theme-Aware Code Highlighting'})).toBeInTheDocument()
  })

  it('should render the code block with TypeScript language', () => {
    render(<AboutWrapper />)
    const codeBlock = screen.getByTestId('code-block')
    expect(codeBlock).toBeInTheDocument()
    expect(codeBlock).toHaveAttribute('data-language', 'typescript')
  })

  it('should render the code block with correct title', () => {
    render(<AboutWrapper />)
    const codeBlock = screen.getByTestId('code-block')
    expect(codeBlock).toHaveAttribute('data-title', 'Developer Profile Example')
  })

  it('should render the GitHub connect text', () => {
    render(<AboutWrapper />)
    expect(screen.getByText(/explore my work and connect with me on GitHub/)).toBeInTheDocument()
  })
})
