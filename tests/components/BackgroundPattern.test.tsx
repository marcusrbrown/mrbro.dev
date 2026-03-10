import {render} from '@testing-library/react'
import {describe, expect, it} from 'vitest'
import BackgroundPattern, {
  FloatingShapes,
  GradientOverlay,
  SectionDivider,
} from '../../src/components/BackgroundPattern'

describe('BackgroundPattern Component', () => {
  it('should render with default dots variant', () => {
    const {container} = render(<BackgroundPattern />)
    expect(container.firstChild).toHaveClass('background-pattern', 'background-pattern--dots')
  })

  it('should render with grid variant', () => {
    const {container} = render(<BackgroundPattern variant="grid" />)
    expect(container.firstChild).toHaveClass('background-pattern--grid')
  })

  it('should render with circles variant', () => {
    const {container} = render(<BackgroundPattern variant="circles" />)
    expect(container.firstChild).toHaveClass('background-pattern--circles')
  })

  it('should render with waves variant', () => {
    const {container} = render(<BackgroundPattern variant="waves" />)
    expect(container.firstChild).toHaveClass('background-pattern--waves')
  })

  it('should return null when variant is none', () => {
    const {container} = render(<BackgroundPattern variant="none" />)
    expect(container.firstChild).toBeNull()
  })

  it('should apply animated class by default', () => {
    const {container} = render(<BackgroundPattern />)
    expect(container.firstChild).toHaveClass('background-pattern--animated')
  })

  it('should not apply animated class when animated is false', () => {
    const {container} = render(<BackgroundPattern animated={false} />)
    expect(container.firstChild).not.toHaveClass('background-pattern--animated')
  })

  it('should apply custom className', () => {
    const {container} = render(<BackgroundPattern className="my-custom-class" />)
    expect(container.firstChild).toHaveClass('my-custom-class')
  })

  it('should set opacity as CSS custom property', () => {
    const {container} = render(<BackgroundPattern opacity={0.5} />)
    const element = container.firstChild as HTMLElement
    expect(element.style.getPropertyValue('--pattern-opacity')).toBe('0.5')
  })

  it('should have aria-hidden attribute', () => {
    const {container} = render(<BackgroundPattern />)
    expect(container.firstChild).toHaveAttribute('aria-hidden', 'true')
  })
})

describe('FloatingShapes Component', () => {
  it('should render with default count of 6 shapes', () => {
    const {container} = render(<FloatingShapes />)
    const shapes = container.querySelectorAll('.floating-shape')
    expect(shapes).toHaveLength(6)
  })

  it('should render with custom count', () => {
    const {container} = render(<FloatingShapes count={3} />)
    const shapes = container.querySelectorAll('.floating-shape')
    expect(shapes).toHaveLength(3)
  })

  it('should apply animated class by default', () => {
    const {container} = render(<FloatingShapes count={1} />)
    const shape = container.querySelector('.floating-shape')
    expect(shape).toHaveClass('floating-shape--animated')
  })

  it('should not apply animated class when animated is false', () => {
    const {container} = render(<FloatingShapes count={1} animated={false} />)
    const shape = container.querySelector('.floating-shape')
    expect(shape).not.toHaveClass('floating-shape--animated')
  })

  it('should apply custom className to container', () => {
    const {container} = render(<FloatingShapes className="custom-floating" />)
    expect(container.firstChild).toHaveClass('custom-floating')
  })

  it('should have aria-hidden on container', () => {
    const {container} = render(<FloatingShapes />)
    expect(container.firstChild).toHaveAttribute('aria-hidden', 'true')
  })

  it('should render circle shapes', () => {
    const {container} = render(<FloatingShapes count={1} shapes={['circle']} />)
    expect(container.querySelector('.floating-shape--circle')).toBeInTheDocument()
  })

  it('should render square shapes', () => {
    const {container} = render(<FloatingShapes count={1} shapes={['square']} />)
    expect(container.querySelector('.floating-shape--square')).toBeInTheDocument()
  })

  it('should render triangle shapes', () => {
    const {container} = render(<FloatingShapes count={1} shapes={['triangle']} />)
    expect(container.querySelector('.floating-shape--triangle')).toBeInTheDocument()
  })
})

describe('GradientOverlay Component', () => {
  it('should render a div element with gradient-overlay class', () => {
    const {container} = render(<GradientOverlay />)
    expect(container.querySelector('.gradient-overlay')).toBeInTheDocument()
  })

  it('should render without errors for all directions', () => {
    const directions = ['top', 'bottom', 'left', 'right', 'radial'] as const
    directions.forEach(direction => {
      const {container} = render(<GradientOverlay direction={direction} />)
      expect(container.querySelector('.gradient-overlay')).toBeInTheDocument()
    })
  })

  it('should apply custom className', () => {
    const {container} = render(<GradientOverlay className="my-overlay" />)
    expect(container.firstChild).toHaveClass('my-overlay')
  })

  it('should have aria-hidden attribute', () => {
    const {container} = render(<GradientOverlay />)
    expect(container.firstChild).toHaveAttribute('aria-hidden', 'true')
  })

  it('should render with top direction without error', () => {
    expect(() => render(<GradientOverlay direction="top" />)).not.toThrow()
  })

  it('should render with bottom direction without error', () => {
    expect(() => render(<GradientOverlay direction="bottom" />)).not.toThrow()
  })

  it('should render with left direction without error', () => {
    expect(() => render(<GradientOverlay direction="left" />)).not.toThrow()
  })

  it('should render with right direction without error', () => {
    expect(() => render(<GradientOverlay direction="right" />)).not.toThrow()
  })
})

describe('SectionDivider Component', () => {
  it('should render with wave variant by default', () => {
    const {container} = render(<SectionDivider />)
    expect(container.firstChild).toHaveClass('section-divider--wave')
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('should render with curve variant', () => {
    const {container} = render(<SectionDivider variant="curve" />)
    expect(container.firstChild).toHaveClass('section-divider--curve')
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('should render with line variant', () => {
    const {container} = render(<SectionDivider variant="line" />)
    expect(container.querySelector('.section-divider-line')).toBeInTheDocument()
  })

  it('should render with dots variant', () => {
    const {container} = render(<SectionDivider variant="dots" />)
    const dots = container.querySelectorAll('.section-divider-dot')
    expect(dots).toHaveLength(5)
  })

  it('should apply custom height', () => {
    const {container} = render(<SectionDivider height={120} />)
    const element = container.firstChild as HTMLElement
    expect(element.style.height).toBe('120px')
  })

  it('should apply custom className', () => {
    const {container} = render(<SectionDivider className="my-divider" />)
    expect(container.firstChild).toHaveClass('my-divider')
  })

  it('should have aria-hidden attribute', () => {
    const {container} = render(<SectionDivider />)
    expect(container.firstChild).toHaveAttribute('aria-hidden', 'true')
  })
})
