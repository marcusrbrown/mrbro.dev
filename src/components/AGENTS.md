# src/components/

22 React 19+ components — PascalCase `.tsx` files, no barrel exports, direct file imports only.

## Organization

| Domain | Components |
| --- | --- |
| **Theme** | `ThemeToggle`, `ThemeCustomizer`, `ThemePreview`, `PresetThemeGallery` |
| **Content** | `BlogPost`, `ProjectCard`, `CareerTimeline`, `SkillsShowcase`, `AboutSection` |
| **Layout** | `Header`, `Footer`, `HeroSection`, `BackgroundPattern`, `LoadingStates` |
| **Interactive** | `ProjectGallery`, `ProjectFilter`, `ProjectPreviewModal`, `SmoothScrollNav`, `TestimonialsCarousel`, `AnimatedCounters`, `CodeBlock`, `ContactCta` |

## Patterns

- **Theme integration**: Via `useTheme` hook + CSS custom properties — no inline styles
- **Imports**: Direct file paths only (`import { Header } from './Header'`), no index.ts barrel
- **Exports**: Named exports only, no `export default`
- **Props types**: Interfaces defined in-file or `src/types/`

## Accessibility (WCAG 2.1 AA)

- All interactive elements keyboard-focusable with visible focus rings
- ARIA labels required for modals (`ProjectPreviewModal`) and toggles (`ThemeToggle`)
- Animations must respect `prefers-reduced-motion`
- Maintain logical heading hierarchy within sections

## Testing Expectations

- **Unit**: Vitest tests in `tests/components/` (13 test files)
- **Visual**: Regression tests across themes in `tests/visual/`
- **A11y**: axe-core checks in `tests/accessibility/`
- Run `lsp_diagnostics` clean before commit
