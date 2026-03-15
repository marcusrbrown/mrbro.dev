import {act, fireEvent, render, screen} from '@testing-library/react'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import TestimonialsCarousel from '../../src/components/TestimonialsCarousel'

// Mock the UseScrollAnimation hook
vi.mock('../../src/hooks/UseScrollAnimation', () => ({
  useScrollAnimation: vi.fn(() => ({
    ref: {current: null},
    isInView: true,
  })),
}))

const mockTestimonials = [
  {
    id: '1',
    name: 'John Doe',
    role: 'Senior Developer',
    company: 'Tech Corp',
    content: 'Great work and professional attitude.',
  },
  {
    id: '2',
    name: 'Jane Smith',
    role: 'Product Manager',
    company: 'Innovation Inc',
    content: 'Excellent problem-solving skills and attention to detail.',
  },
  {
    id: '3',
    name: 'Bob Johnson',
    role: 'CTO',
    company: 'Startup LLC',
    content: 'Outstanding technical expertise and leadership.',
  },
]

describe('TestimonialsCarousel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render with default testimonials when none provided', () => {
      render(<TestimonialsCarousel />)

      expect(screen.getByRole('heading', {name: 'What People Say'})).toBeInTheDocument()
      expect(screen.getByText(/Testimonials from colleagues and clients/)).toBeInTheDocument()
    })

    it('should render with provided testimonials', () => {
      render(<TestimonialsCarousel testimonials={mockTestimonials} />)

      expect(
        screen.getByText(content => {
          return content.includes('Great work and professional attitude.')
        }),
      ).toBeInTheDocument()
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('Senior Developer at Tech Corp')).toBeInTheDocument()
    })

    it('should render nothing when empty testimonials array provided', () => {
      const {container} = render(<TestimonialsCarousel testimonials={[]} />)

      expect(container.firstChild).toBeNull()
    })

    it('should render navigation controls', () => {
      render(<TestimonialsCarousel testimonials={mockTestimonials} />)

      expect(screen.getByRole('button', {name: 'Previous testimonial'})).toBeInTheDocument()
      expect(screen.getByRole('button', {name: 'Next testimonial'})).toBeInTheDocument()
      expect(screen.getByRole('button', {name: 'Pause testimonials'})).toBeInTheDocument()
    })

    it('should render indicators for each testimonial', () => {
      render(<TestimonialsCarousel testimonials={mockTestimonials} />)

      const indicators = screen.getAllByRole('button', {name: /Go to testimonial/})
      expect(indicators).toHaveLength(3)
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<TestimonialsCarousel testimonials={mockTestimonials} />)

      const section = screen.getByRole('region', {name: 'Testimonials carousel'})
      expect(section).toHaveAttribute('aria-live', 'polite')

      const heading = screen.getByRole('heading', {name: 'What People Say'})
      expect(heading).toHaveAttribute('id', 'testimonials-heading')

      const carousel = screen.getByLabelText('What People Say')
      expect(carousel).toHaveAttribute('aria-labelledby', 'testimonials-heading')
    })

    it('should have screen reader friendly content', () => {
      render(<TestimonialsCarousel testimonials={mockTestimonials} />)

      const playButton = screen.getByRole('button', {name: 'Pause testimonials'})
      expect(playButton.querySelector('.sr-only')).toBeInTheDocument()
    })
  })

  describe('Avatar and LinkedIn Integration', () => {
    it('should render avatar when provided', () => {
      const testimonialsWithAvatar = [
        {
          id: '1',
          name: 'John Doe',
          role: 'Senior Developer',
          company: 'Tech Corp',
          content: 'Great work and professional attitude.',
          avatar: 'https://example.com/avatar.jpg',
        },
      ]

      render(<TestimonialsCarousel testimonials={testimonialsWithAvatar} />)

      const avatar = screen.getByRole('img', {name: 'John Doe avatar'})
      expect(avatar).toHaveAttribute('src', 'https://example.com/avatar.jpg')
    })

    it('should render LinkedIn link when provided', () => {
      const testimonialsWithLinkedIn = [
        {
          id: '1',
          name: 'John Doe',
          role: 'Senior Developer',
          company: 'Tech Corp',
          content: 'Great work and professional attitude.',
          linkedinUrl: 'https://linkedin.com/in/johndoe',
        },
      ]

      render(<TestimonialsCarousel testimonials={testimonialsWithLinkedIn} />)

      const linkedInLink = screen.getByRole('link', {name: 'John Doe'})
      expect(linkedInLink).toHaveAttribute('href', 'https://linkedin.com/in/johndoe')
      expect(linkedInLink).toHaveAttribute('target', '_blank')
      expect(linkedInLink).toHaveAttribute('rel', 'noopener noreferrer')
    })

    it('should render name as text when no LinkedIn URL provided', () => {
      render(<TestimonialsCarousel testimonials={mockTestimonials} />)

      const nameElement = screen.getByText('John Doe')
      expect(nameElement.tagName).toBe('CITE')
      expect(nameElement.closest('a')).toBeNull()
    })
  })

  describe('Performance', () => {
    it('should not render when testimonials is undefined and no defaults available', () => {
      const {container} = render(<TestimonialsCarousel testimonials={[]} />)

      expect(container.firstChild).toBeNull()
    })
  })
})

describe('TestimonialsCarousel — navigation and interaction', () => {
  // Keep tests co-located but in a separate describe to avoid conflicts with fake-timer setup
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const mockTestimonials = [
    {id: '1', name: 'Alice', role: 'Dev', company: 'A Co', content: 'First testimonial'},
    {id: '2', name: 'Bob', role: 'PM', company: 'B Co', content: 'Second testimonial'},
    {id: '3', name: 'Carol', role: 'CTO', company: 'C Co', content: 'Third testimonial'},
  ]

  it('should navigate to next testimonial on next button click', () => {
    render(<TestimonialsCarousel testimonials={mockTestimonials} autoPlay={false} />)

    expect(screen.getByText(/First testimonial/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', {name: 'Next testimonial'}))

    expect(screen.getByText(/Second testimonial/)).toBeInTheDocument()
  })

  it('should navigate to previous testimonial on prev button click', () => {
    render(<TestimonialsCarousel testimonials={mockTestimonials} autoPlay={false} />)

    // Go to index 2 first
    fireEvent.click(screen.getByRole('button', {name: 'Next testimonial'}))
    fireEvent.click(screen.getByRole('button', {name: 'Next testimonial'}))
    expect(screen.getByText(/Third testimonial/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', {name: 'Previous testimonial'}))
    expect(screen.getByText(/Second testimonial/)).toBeInTheDocument()
  })

  it('should wrap around to last testimonial when clicking prev from first', () => {
    render(<TestimonialsCarousel testimonials={mockTestimonials} autoPlay={false} />)
    fireEvent.click(screen.getByRole('button', {name: 'Previous testimonial'}))
    expect(screen.getByText(/Third testimonial/)).toBeInTheDocument()
  })

  it('should wrap around to first testimonial when clicking next from last', () => {
    render(<TestimonialsCarousel testimonials={mockTestimonials} autoPlay={false} />)
    // Advance to last
    fireEvent.click(screen.getByRole('button', {name: 'Next testimonial'}))
    fireEvent.click(screen.getByRole('button', {name: 'Next testimonial'}))
    // Wrap around
    fireEvent.click(screen.getByRole('button', {name: 'Next testimonial'}))
    expect(screen.getByText(/First testimonial/)).toBeInTheDocument()
  })

  it('should go to specific testimonial on indicator click', () => {
    render(<TestimonialsCarousel testimonials={mockTestimonials} autoPlay={false} />)
    fireEvent.click(screen.getByRole('button', {name: 'Go to testimonial 3'}))
    expect(screen.getByText(/Third testimonial/)).toBeInTheDocument()
  })

  it('should toggle play/pause', () => {
    render(<TestimonialsCarousel testimonials={mockTestimonials} autoPlay={true} />)
    const playbackBtn = screen.getByRole('button', {name: 'Pause testimonials'})
    fireEvent.click(playbackBtn)
    expect(screen.getByRole('button', {name: 'Play testimonials'})).toBeInTheDocument()
  })

  it('should stop autoplay when prev button receives focus', () => {
    render(<TestimonialsCarousel testimonials={mockTestimonials} autoPlay={true} />)
    const prevBtn = screen.getByRole('button', {name: 'Previous testimonial'})
    fireEvent.focus(prevBtn)
    expect(screen.getByRole('button', {name: 'Play testimonials'})).toBeInTheDocument()
  })

  it('should stop autoplay when next button receives focus', () => {
    render(<TestimonialsCarousel testimonials={mockTestimonials} autoPlay={true} />)
    const nextBtn = screen.getByRole('button', {name: 'Next testimonial'})
    fireEvent.focus(nextBtn)
    expect(screen.getByRole('button', {name: 'Play testimonials'})).toBeInTheDocument()
  })

  it('should advance testimonial automatically when playing and in view', () => {
    render(<TestimonialsCarousel testimonials={mockTestimonials} autoPlay={true} autoPlayInterval={1000} />)
    expect(screen.getByText(/First testimonial/)).toBeInTheDocument()
    act(() => {
      vi.advanceTimersByTime(1100)
    })
    expect(screen.getByText(/Second testimonial/)).toBeInTheDocument()
  })

  it('should handle ArrowRight keyboard navigation', () => {
    render(<TestimonialsCarousel testimonials={mockTestimonials} autoPlay={false} />)
    fireEvent.keyDown(window, {key: 'ArrowRight'})
    expect(screen.getByText(/Second testimonial/)).toBeInTheDocument()
  })

  it('should handle ArrowLeft keyboard navigation', () => {
    render(<TestimonialsCarousel testimonials={mockTestimonials} autoPlay={false} />)
    fireEvent.keyDown(window, {key: 'ArrowRight'}) // go to 2
    fireEvent.keyDown(window, {key: 'ArrowLeft'}) // back to 1
    expect(screen.getByText(/First testimonial/)).toBeInTheDocument()
  })

  it('should toggle play/pause with spacebar', () => {
    render(<TestimonialsCarousel testimonials={mockTestimonials} autoPlay={true} />)
    fireEvent.keyDown(window, {key: ' '})
    expect(screen.getByRole('button', {name: 'Play testimonials'})).toBeInTheDocument()
  })
})
