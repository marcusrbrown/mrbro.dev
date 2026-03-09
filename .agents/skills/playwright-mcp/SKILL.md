---
name: playwright-mcp
description: Playwright MCP server for AI-driven browser automation. Use when agents need semantic, accessibility-tree-based browser interaction for mrbro.dev — navigating pages, running accessibility audits, verifying WCAG compliance, checking for visual regressions, testing responsive behavior, or automating any browser task via natural language instructions. Prefer over agent-browser when you need rich structured output from the accessibility tree rather than CLI snapshots.
license: MIT
metadata:
  author: marcusrbrown
  version: "1.0"
allowed-tools: mcp__playwright__*
---

## Playwright MCP for mrbro.dev

Playwright MCP exposes browser automation capabilities via the Model Context Protocol (MCP). It enables agents to interact with the site using the accessibility tree — making interactions robust and deterministic even as the UI changes.

## Setup

Add the Playwright MCP server to your agent's MCP config:

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest"]
    }
  }
}
```

For headed mode (shows the browser, useful for debugging):

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest", "--headed"]
    }
  }
}
```

### VS Code / GitHub Copilot

Place in `.vscode/mcp.json`:

```json
{
  "servers": {
    "playwright": {
      "type": "stdio",
      "command": "npx",
      "args": ["@playwright/mcp@latest"]
    }
  }
}
```

## Core Capabilities

Once connected, the agent can use these MCP tools:

- `browser_navigate` — Navigate to a URL
- `browser_snapshot` — Capture accessibility tree (structured element data)
- `browser_click` — Click an element by ref
- `browser_fill` — Fill a text input
- `browser_select_option` — Select a dropdown option
- `browser_check` — Check a checkbox
- `browser_press_key` — Press a keyboard key
- `browser_screenshot` — Take a screenshot
- `browser_wait_for` — Wait for an element or condition
- `browser_evaluate` — Run JavaScript in the page
- `browser_close` — Close the browser

## Example Prompts for mrbro.dev

### Check site accessibility (WCAG 2.1 AA)

```
Navigate to https://mrbro.dev, take a snapshot, and verify:
1. There is a <nav> landmark with at least 3 links
2. There is a <main> landmark
3. There is a <footer> landmark
4. All interactive elements have accessible names
5. No elements have role="button" without an accessible name
```

### Verify page loads without errors

```
Navigate to https://mrbro.dev and wait for network idle.
Take a screenshot and check the page title.
Then navigate to /about, /projects, and /blog, taking screenshots of each.
Report any pages that fail to load or show error content.
```

### Test dark/light theme toggle

```
Navigate to https://mrbro.dev, take a snapshot, find the theme toggle button,
click it, wait 500ms, take another screenshot.
Compare the two screenshots and verify the theme changed (background color should differ).
```

### Verify navigation works

```
Navigate to https://mrbro.dev, take a snapshot.
Click the "About" navigation link, wait for the URL to contain /about.
Verify the page heading mentions the site owner.
Click the "Projects" navigation link, wait for /projects.
Verify project cards are visible.
Click the "Blog" navigation link, wait for /blog.
Verify blog post listings are visible.
```

### Check responsive layout at mobile breakpoint

```
Navigate to https://mrbro.dev with viewport 375x667 (mobile).
Take a screenshot. Verify the mobile navigation menu exists.
Click the hamburger menu if present.
Take another screenshot verifying the navigation is expanded.
```

### Verify GitHub Pages base path (smoke test)

```
Navigate to https://mrbro.dev.
Verify the page loads (status 200, content visible).
Verify there are no broken image links (all <img> elements should be visible).
Verify CSS is loaded (check that body has a non-default background color).
Report any assets that failed to load (404 errors).
```

### Check for console errors

```
Navigate to https://mrbro.dev.
Run JavaScript: `window.__playwright_errors = []; window.addEventListener('error', e => window.__playwright_errors.push(e.message));`
Wait for network idle.
Run JavaScript: `return window.__playwright_errors`
Report any errors found.
```

### Full accessibility audit

```
Navigate to https://mrbro.dev and wait for network idle.
For each page (/, /about, /projects, /blog):
  1. Navigate to the page
  2. Take a snapshot
  3. Verify: landmark regions are present (nav, main, footer)
  4. Verify: all buttons and links have accessible names (not empty)
  5. Verify: heading hierarchy is logical (h1 → h2 → h3)
  6. Verify: images have alt text
  7. Take a screenshot
Report all violations found.
```

## Integration with mrbro.dev Tests

The existing Playwright test suite at `tests/accessibility/` and `tests/e2e/` runs full WCAG audits with axe-core. Use Playwright MCP for:

- **Exploratory testing**: Manually walking through flows that aren't yet covered by automated tests
- **Debugging failing tests**: Inspect the accessibility tree when a test assertion fails
- **Visual inspection**: Capture screenshots at specific UI states (e.g., after theme switch)
- **Regression checks from workflow_dispatch**: Run ad-hoc checks after deployments

## Running Against Local Preview

```
Start the preview server: pnpm preview (runs on http://localhost:4173)
Then use browser_navigate with http://localhost:4173 for local testing.
```
