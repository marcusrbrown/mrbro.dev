import React from 'react'
import {useParallax} from '../hooks/UseParallax'
import {useScrollAnimation} from '../hooks/UseScrollAnimation'

interface AboutSectionProps {
  className?: string
}

const AboutSection: React.FC<AboutSectionProps> = ({className = ''}) => {
  const {ref: headerRef, isInView: headerInView} = useScrollAnimation<HTMLElement>({
    threshold: 0.1,
    rootMargin: '100px 0px',
    triggerOnce: true,
  })

  const {ref: storyRef, isInView: storyInView} = useScrollAnimation<HTMLDivElement>({
    threshold: 0.1,
    rootMargin: '100px 0px',
    triggerOnce: true,
  })

  // Parallax effects for background elements
  const {ref: circle1Ref, transform: circle1Transform} = useParallax<HTMLDivElement>({
    speed: 0.3,
    direction: 'up',
  })

  const {ref: circle2Ref, transform: circle2Transform} = useParallax<HTMLDivElement>({
    speed: 0.2,
    direction: 'down',
  })

  const {ref: gridRef, transform: gridTransform} = useParallax<HTMLDivElement>({
    speed: 0.1,
    direction: 'up',
  })

  return (
    <section id="about" className={`about-section ${className}`.trim()} aria-labelledby="about-heading">
      <div className="container">
        {/* Section Header */}
        <header
          ref={headerRef}
          className="section-header"
          style={{
            opacity: headerInView ? 1 : 0,
            transform: headerInView ? 'translateY(0)' : 'translateY(2rem)',
            transition: 'opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1), transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <h2 id="about-heading" className="section-title">
            About Me
          </h2>
          <p className="section-subtitle">
            Passionate full-stack developer with a focus on creating exceptional digital experiences
          </p>
        </header>

        {/* Professional Story */}
        <div
          ref={storyRef}
          className="about-story"
          style={{
            opacity: storyInView ? 1 : 0,
            transform: storyInView ? 'translateY(0)' : 'translateY(2rem)',
            transition: 'opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1), transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
            transitionDelay: storyInView ? '0.2s' : '0s',
          }}
        >
          <div className="about-story-content">
            <p className="about-story-paragraph about-story-paragraph--lead">
              I'm a dedicated software engineer with over a decade of experience building scalable web applications and
              leading development teams. My journey began with a curiosity about how things work, which evolved into a
              passion for creating digital solutions that make a real impact.
            </p>

            <p className="about-story-paragraph">
              Throughout my career, I've specialized in modern web technologies, with expertise spanning from React and
              TypeScript on the frontend to Node.js and cloud platforms on the backend. I believe in writing clean,
              maintainable code and fostering collaborative development environments.
            </p>

            <p className="about-story-paragraph">
              When I'm not coding, you'll find me contributing to open-source projects, mentoring developers, or
              exploring the latest developments in web technologies. I'm always excited to take on new challenges and
              contribute to meaningful projects.
            </p>
          </div>
        </div>
      </div>

      {/* Background Decorative Elements */}
      <div className="about-bg-elements" aria-hidden="true">
        <div
          ref={circle1Ref}
          className="about-bg-circle about-bg-circle--1"
          style={{transform: circle1Transform}}
        ></div>
        <div
          ref={circle2Ref}
          className="about-bg-circle about-bg-circle--2"
          style={{transform: circle2Transform}}
        ></div>
        <div ref={gridRef} className="about-bg-grid" style={{transform: gridTransform}}></div>
      </div>
    </section>
  )
}

export default AboutSection
