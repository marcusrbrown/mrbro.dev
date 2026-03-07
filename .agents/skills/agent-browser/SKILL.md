---
name: agent-browser
description: Browser automation CLI for AI agents. Use when you need to interact with the mrbro.dev site — navigating pages, checking for errors, capturing screenshots, verifying WCAG compliance, filling forms, clicking buttons, or testing any browser-based behavior. Triggers include "open the site", "take a screenshot", "check for errors", "verify accessibility", "test the deployed page", "scrape content", or any task requiring browser interaction with https://mrbro.dev or a local preview server.
license: MIT
metadata:
  author: marcusrbrown
  version: "1.0"
allowed-tools: Bash(npx agent-browser:*), Bash(agent-browser:*)
---

## Browser Automation for mrbro.dev with agent-browser

Use `agent-browser` (via `npx agent-browser`) to interact with the site in CI or from `workflow_dispatch` events.

## Core Workflow

Every browser session follows this pattern:

1. **Navigate**: `npx agent-browser open <url>`
2. **Snapshot**: `npx agent-browser snapshot -i` (get element refs like `@e1`, `@e2`)
3. **Interact**: Use refs to click, fill, select
4. **Re-snapshot**: After navigation or DOM changes, get fresh refs

```sh
npx agent-browser open https://mrbro.dev
npx agent-browser wait --load networkidle
npx agent-browser snapshot -i
```

## Essential Commands

```sh
# Navigation
npx agent-browser open <url>              # Navigate to a URL
npx agent-browser close                   # Close browser

# Snapshot (get element refs)
npx agent-browser snapshot -i             # Interactive elements with refs (recommended)
npx agent-browser snapshot -i -C          # Include cursor-interactive elements
npx agent-browser snapshot -s "#main"     # Scope to CSS selector

# Interact using @refs from snapshot
npx agent-browser click @e1
npx agent-browser fill @e2 "text"
npx agent-browser press Enter
npx agent-browser scroll down 500

# Get information
npx agent-browser get text @e1
npx agent-browser get url
npx agent-browser get title

# Wait
npx agent-browser wait @e1                # Wait for element
npx agent-browser wait --load networkidle # Wait for network idle
npx agent-browser wait --url "**/blog"    # Wait for URL pattern
npx agent-browser wait 2000               # Wait milliseconds

# Capture
npx agent-browser screenshot              # Screenshot to temp dir
npx agent-browser screenshot --full       # Full page screenshot
npx agent-browser screenshot --annotate   # Annotated with numbered element labels

# Diff (compare page states)
npx agent-browser diff url <url1> <url2>              # Compare two pages
npx agent-browser diff screenshot --baseline before.png  # Visual pixel diff
```

## Example Prompts for mrbro.dev

### Check site for JavaScript errors

```sh
npx agent-browser open https://mrbro.dev && npx agent-browser wait --load networkidle
npx agent-browser snapshot -i
# Review the snapshot for error indicators; use `get text` for console output
```

### Verify all pages load without errors

```sh
for PATH in "/" "/about" "/projects" "/blog"; do
  npx agent-browser open "https://mrbro.dev${PATH}" && npx agent-browser wait --load networkidle
  npx agent-browser screenshot --full
done
```

### Check WCAG accessibility (visual scan)

```sh
npx agent-browser open https://mrbro.dev && npx agent-browser wait --load networkidle
npx agent-browser snapshot -i
# Verify: landmark elements (nav, main, footer) are present
# Verify: all interactive elements have accessible refs in the snapshot
# Verify: color contrast looks appropriate in screenshots
npx agent-browser screenshot --full accessibility-check.png
```

### Verify dark/light theme toggle

```sh
npx agent-browser open https://mrbro.dev && npx agent-browser wait --load networkidle
npx agent-browser screenshot light-theme.png
npx agent-browser snapshot -i -C
# Find the theme toggle button ref (e.g. @e5) from snapshot
npx agent-browser click @e5
npx agent-browser wait 500
npx agent-browser screenshot dark-theme.png
npx agent-browser diff screenshot --baseline light-theme.png
```

### Test navigation links

```sh
npx agent-browser open https://mrbro.dev && npx agent-browser wait --load networkidle
npx agent-browser snapshot -i
# Find nav link refs and verify each navigates correctly
npx agent-browser click @e2  # About
npx agent-browser wait --url "**/about"
npx agent-browser get url    # Should contain /about
```

### Test with local preview server

```sh
# Start preview server first: pnpm preview
npx agent-browser open http://localhost:4173 && npx agent-browser wait --load networkidle
npx agent-browser snapshot -i
npx agent-browser screenshot local-preview.png
```

### Compare deployed vs local build

```sh
npx agent-browser diff url https://mrbro.dev http://localhost:4173 --wait-until networkidle
```

## Command Chaining

Chain commands with `&&` for efficiency — the browser persists between commands:

```sh
npx agent-browser open https://mrbro.dev && npx agent-browser wait --load networkidle && npx agent-browser screenshot --full site.png
```

## Integration with CI (workflow_dispatch)

In a GitHub Actions workflow step:

```yaml
- name: Check site with agent-browser
  run: |
    npx agent-browser open https://mrbro.dev
    npx agent-browser wait --load networkidle
    npx agent-browser screenshot --full site-check.png
    npx agent-browser snapshot -i
    npx agent-browser close
```
