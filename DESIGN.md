---
name: "mrbro.dev"
description: "Engineering with taste, proven in public."
colors:
  primary: "#2563eb"
  secondary: "#4b5563"
  secondary-preload: "#64748b"
  accent: "#0ea5e9"
  background: "#ffffff"
  surface: "#f8fafc"
  text: "#0f172a"
  text-secondary: "#4b5563"
  text-secondary-preload: "#64748b"
  border: "#e2e8f0"
  error: "#dc2626"
  warning: "#d97706"
  success: "#16a34a"
  dark-primary: "#1d4ed8"
  dark-secondary: "#cbd5e1"
  dark-background: "#0f172a"
  dark-surface: "#1e293b"
  dark-border: "#334155"
  dark-text: "#f8fafc"
typography:
  display:
    fontFamily: "Arial, sans-serif"
    fontSize: "clamp(2.5rem, 6vw, 4.5rem)"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Arial, sans-serif"
    fontSize: "clamp(2rem, 4vw, 2.5rem)"
    fontWeight: 700
    lineHeight: 1.2
  title:
    fontFamily: "Arial, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: "Arial, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
  action:
    fontFamily: "Arial, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.6
  label:
    fontFamily: "Arial, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.6
rounded:
  radius-sm: "5px"
  radius-md: "6px"
  radius-lg: "8px"
  radius-xl: "12px"
  radius-pill: "20px"
spacing:
  padding-button: "20px 40px"
  padding-chip: "8px 12px"
  padding-card-globals: "1rem"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#ffffff"
    typography: "{typography.action}"
    rounded: "{rounded.radius-lg}"
    padding: "{spacing.padding-button}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.text}"
    typography: "{typography.action}"
    rounded: "{rounded.radius-lg}"
    padding: "{spacing.padding-button}"
  project-card-globals:
    backgroundColor: "{colors.background}"
    rounded: "{rounded.radius-sm}"
    padding: "{spacing.padding-card-globals}"
  filter-chip:
    backgroundColor: "#ffffff"
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.radius-pill}"
    padding: "{spacing.padding-chip}"
---

# Design System: mrbro.dev

## 1. Overview

**Creative North Star: \"The Working Bench\"**

This system represents an evidence-first and tactile portfolio interface that prioritizes public engineering credibility over stylistic performance. It is modeled as a functional developer bench—an organized, highly clear environment designed for software peers to explore shipping code. The layout structure relies on a flat, highly legible grid containing actual metrics and proof.

To align with this strategic objective, the design explicitly rejects standard marketing conventions and decorative embellishments. It rejects generic résumé templates, SaaS landing-page polish, terminal cosplay, and editorial affectation by name. The voice is direct, opinionated, and focused on functional utility.

**Key Characteristics:**

- **Tactile Responsiveness**: Immediate, predictable feedback on every interactive control and state change.
- **Evidence-First Hierarchy**: Direct representation of public repository work without marketing noise or abstract claims.
- **Intentional Transitions**: Safe theme and content switching that implements high-performance containment to minimize browser layout shifts.

## 2. Colors

The color palette is built around clear state transitions, utilizing high-contrast accents to guide interaction.

### Primary

- **Working Blue** (`#2563eb`): Used for primary interactive actions, including the main hero CTA and primary hover borders. It serves as the primary visual anchor.
- **Dark Blue** (`#1d4ed8`): The dark-theme equivalent for primary visual focal points and interactive borders.

### Secondary

- **Medium Gray** (`#4b5563`): Used for secondary body text and metadata under the hydrated React theme context.
- **Muted Slate** (`#64748b`): The secondary text and border color applied during the initial preloader phase before React hydration.

### Tertiary

- **Signal Cyan** (`#0ea5e9`): Serves as the focus, hover accent, and theme active marker. It signals a dynamic element or an active state change.

### Neutral

- **Deep Ink** (`#0f172a`): The light-theme text color and the dark-theme background color, ensuring high typographic contrast.
- **Frost Surface** (`#f8fafc`): The resting background of cards, headers, and container elements in the light theme.
- **Dark Slate Surface** (`#1e293b`): The dark-theme container background color.
- **Pure White** (`#ffffff`): The light-theme canvas background.
- **Frost Border** (`#e2e8f0`): The primary structural divider and border color.

**The Preload/Runtime Drift Rule.** Developers must account for preload/runtime drift between CSS-compiled tokens (`#64748b`) and hydrated React context tokens (`#4b5563`) on secondary text colors.

## 3. Typography

**Display Font:** Arial (with sans-serif fallback) **Body Font:** Arial (with sans-serif fallback) **Label/Mono Font:** Monaco, Menlo, Consolas (System Monospace)

**Character:** The system currently relies on Arial across all primary text blocks, delivering a functional, straightforward visual environment. Although a system sans stack is present in `index.html`, it is currently inactive due to the global `globals.css` overrides.

### Hierarchy

- **Display** (800, `clamp(2.5rem, 6vw, 4.5rem)`, 1.1): Used for the main hero heading.
- **Headline** (700, `clamp(2rem, 4vw, 2.5rem)`, 1.2): Applied to section headers.
- **Title** (600, `1.25rem`, 1.3): Used for cards and blog titles.
- **Body** (400, `1rem`, 1.6): Applied to standard descriptions and prose.
- **Label** (500, `0.875rem`, 1.6): Used for tags, secondary markers, and interactive controls.

**The Monospace Code Cell Rule.** Monospace styling is reserved strictly for raw code blocks, repository identifiers, and terminal inputs to prevent aesthetic terminal cosplay.

## 4. Elevation

The system utilizes a tactile lift philosophy: resting surfaces maintain a shallow, grounded depth, rising with stronger elevation shadows only during active user interaction.

### Shadow Vocabulary

- **Resting Low Shadow** (`0 1px 3px rgba(0, 0, 0, 0.1)`): Applied to headers, footers, and resting blog card containers.
- **Resting Card Shadow** (`0 4px 12px rgba(0, 0, 0, 0.1)`): Applied to resting project cards.
- **Tactile Hover Lift Shadow** (`0 12px 32px rgba(0, 0, 0, 0.15)`): Fired dynamically on project card hover and active modal views.

**The Tactile Lift Rule.** Components must rest with shallow, grounded elevation shadows. Stronger box shadows and vertical translation transforms must trigger exclusively as a dynamic response to pointer hover. Keyboard navigation and focus states must use explicit, high-contrast outline rings and must not alter resting shadow elevation or vertical placement.

## 5. Components

### Buttons

- **Shape:** Softly curved corners (8px radius).
- **Primary Hero CTA:** Filled with Working Blue (`#2563eb`) with white text, utilizing `20px 40px` padding. Computes with a box-shadow of `0 4px 12px rgba(37,99,235,0.3)`.
- **Secondary Hero CTA:** Transparent background with Deep Ink text, a `2px` solid Frost Border (`#e2e8f0`), and identical `20px 40px` padding and 8px corner shape.
- **Hover / Focus:** Hovering primary buttons triggers a transition to Signal Cyan (`#0ea5e9`) and a vertical scale translation of -2px. Keyboard focus triggers a solid outline with a focus ring.

### Chips

- **Style:** Fully-rounded filter pills (20px radius) with Arial 14px/500 and `8px 12px` padding. Rest state features Medium Gray (`#4b5563`) on a white background with a `1px` Frost Border (`#e2e8f0`).
- **State:** Active state transitions to a solid Working Blue (`#2563eb`) background with white text and a `1px` solid Working Blue (`#2563eb`) border. Hovering any chip triggers a minor vertical translation of -1px.

### Cards / Containers

- **Corner Style:** Factual runtime computes to a sharp `5px` corner radius across project cards, despite a conflicting `12px` declaration inside `landing-page.css` which remains as a source-code drift.
- **Background:** Set to Pure White (`#ffffff`) in light mode (overriding the source `var(--color-surface)` declaration, which represents a known style drift noted in code). Dark mode uses Dark Slate Surface (`#1e293b`).
- **Shadow Strategy:** Computes to Resting Card Shadow at rest, shifting to Tactile Hover Lift Shadow on pointer-hover states. Keyboard focus-visible triggers a focus outline and does not affect shadow elevation.
- **Border:** Bound by a `1px` solid Frost Border (`#e2e8f0`).
- **Internal Padding:** Computes to `16px` (1rem) root padding at rest.

### Navigation

- **Style:** Sticky top-mounted bar with Frost Surface (`#f8fafc`) background and a `1px` bottom Frost Border (`#e2e8f0`). Links use Arial 16px/500. Under hydrated states, secondary navigation text computes to Medium Gray (`#4b5563`), transitioning to Active Working Blue (`#2563eb`) with a bottom underline when matching the active route.

### Theme Toggle

- **Style:** Compact surface button (6px radius) with Frost Surface (`#f8fafc`) background and a `1px` Frost Border (`#e2e8f0`). Displays a leading emoji symbol accompanied by 14px/500 status text.

## 6. Do's and Don'ts

### Do:

- **Do** respect the tactile lift resting rule, keeping deep shadows and translations active exclusively as pointer-hover feedback; focus-visible uses an outline ring.
- **Do** maintain a strict maximum text width of 70ch (`src/styles/globals.css`) for long blog prose to protect reading comfort.
- **Do** specify clear, plain labels for all action items and descriptive text elements.
- **Do** disable all transition animations immediately if `prefers-reduced-motion: reduce` is detected at the document root.

### Don't:

- **Don't** use generic résumé templates: this prohibits skill grids, percentages, and interchangeable portfolio sections in favor of shipped software proof.
- **Don't** apply SaaS landing-page polish: this forbids corporate gradients, metric heroes, and conversion theater in favor of clean layouts.
- **Don't** adopt terminal cosplay: this prohibits monospace or command-line motifs used as decorative developer shorthand outside real code execution cells.
- **Don't** rely on editorial affectation: this forbids magazine typography and complex art direction without a content reason.
- **Don't** use decorative text gradients (`background-clip: text`) on headlines, as seen on the current hero title highlight, which represents a known design inconsistency.
- **Don't** mix system font stacks with the current computed Arial typography rules until the underlying CSS conflicts are resolved.
