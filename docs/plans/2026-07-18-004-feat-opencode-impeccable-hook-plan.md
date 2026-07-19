---
title: 'feat: Add Impeccable feedback to OpenCode edits'
type: feat
status: completed
date: 2026-07-18
deepened: 2026-07-18
---

# feat: Add Impeccable feedback to OpenCode edits

## Overview

Give OpenCode advisory, in-context Impeccable design feedback after file-mutating tool calls (`edit`, `write`, `apply_patch`, and their underscore/MCP-suffixed forms) by bridging the already-installed `.agents/skills/impeccable/scripts/hook.mjs` brain from a repo-local OpenCode plugin. The plugin never blocks, cancels, or replaces a completed edit: it spawns `hook.mjs`, applies a hard timeout, and appends a human-readable summary to tool output only when the hook has something to say.

## Problem Frame

This repo already has a fully installed Impeccable baseline (`.agents/skills/impeccable/**`, `.codex/hooks.json`, `.github/hooks/impeccable.json`, `PRODUCT.md`, `DESIGN.md`, `.impeccable/design.json`, `.impeccable/live/config.json`) with provider manifests configured for other harnesses (Codex, GitHub Copilot hooks) to invoke after edits; those manifests are configured, not proven live by this plan's own verification. OpenCode has no equivalent wiring, so edits made through OpenCode get no advisory design feedback. `marcusrbrown/mothership#19` — a Bun/Biome/Tauri project — specifies the behavioral contract for an OpenCode post-edit hook plugin. `fro-bot/dashboard` has a working reference implementation of that contract, itself on pnpm + ESLint + Vitest + Node 24 — close to this repo's pnpm + ESLint + Vitest + Vite + Node 22+ toolchain. The reference implementation needs light adaptation for this repo's Node version and Vite build, not a port from a different stack.

## Requirements Trace

- R1. Root `opencode.json` registers a single repo-local plugin; the plugin runtime module exposes exactly one plugin function export, with all helpers/types/constants in a separate `hook-bridge.ts`.
- R2. The plugin matches bare `edit`, `write`, `apply_patch`, plus names ending in `_edit`, `_write`, or `_apply_patch` (with one or multiple underscore-separated prefix segments, e.g. `mcp_edit`, `filesystem_write`, `github_mcp_apply_patch`), without loose substring false positives (e.g. must not match an unrelated tool name that merely contains "edit" without that suffix shape).
- R3. Extract `filePath` from `edit`/`write` tool calls, and deduplicated Add/Update/Delete/Move paths from `apply_patch` diff text.
- R4. Preserve the OpenCode session ID in the hook payload sent to `hook.mjs`.
- R5. Spawn the existing `hook.mjs` script as a subprocess with `IMPECCABLE_HOOK_HARNESS=claude` and `IMPECCABLE_HOOK_QUIET=1` set, and with any inherited `IMPECCABLE_HOOK_DEPTH` / `CLAUDE_HOOK_DEPTH` removed from the child environment; the plugin never sets either depth variable itself.
- R6. Hard timeout of approximately 5 seconds on the subprocess. On timeout, the runner closes stdin, sends a termination signal, allows a short bounded grace period, escalates to a forceful kill signal if the child has not exited, and only resolves once the child has actually exited and been reaped (or a final hard cap is hit); associated listeners and resources are cleaned up in every case.
- R7. The hook is strictly advisory: it runs after the edit has already completed, must return within the timeout budget, and never blocks indefinitely, cancels, reverts, or replaces the edit result.
- R8. When stdout is non-empty, strictly accept only the nested Claude-harness `PostToolUse` envelope shape carrying a non-empty string `additionalContext`, and surface only that human-readable text, appended to (not replacing) the original tool output, clearly delimited from it. Raw JSON must never reach the model-visible output. Wrong event name, a missing nested envelope, an empty or non-string `additionalContext`, a top-level or foreign-harness shape, and any other malformed non-empty output are all anomalies, not successful parses.
- R9. Contract resolution across five outcomes: (a) a recognized mutating tool call yields no extractable path — an explicit bypass where the subprocess runner is never invoked, distinct from a successful scan; (b) a valid payload is sent, the child exits 0, stdout is empty, and stderr is empty — intentional quiet-clean success, no visible output; (c) the child exits 0 with empty stdout but non-empty stderr — treated as an anomaly, not quiet-clean; (d) timeout, non-zero exit, spawn failure, or non-empty malformed/unrecognized stdout — a compact, model-visible warning appended once; (e) captured stdout or stderr exceeds a bounded size — an anomaly, with stderr content never appended verbatim to model-visible output. Repeated anomalies within the same plugin process/startup do not re-warn.
- R10. Reuse `hook.mjs`'s existing config, filter, dedup, and cache behavior unchanged; the plugin introduces no new detector or config model of its own.
- R11. Running `npx impeccable update` leaves the root OpenCode plugin registration and everything under `.opencode/impeccable/**` byte-identical (update must not clobber this feature's files).
- R12. Live, post-restart verification is mandatory before the feature is considered done: OpenCode loads the plugin without error; the actual invoked tool ID is observed directly (not assumed from docs); a first-time detectable design issue (e.g. a gradient-text pattern) introduced on a fresh file under a unique session surfaces readable advisory feedback within the timeout budget, with the cache recording that exact file, session, and finding (not just an mtime change); a separately-verified clean state produces no visible output, ruling out dedup masking a real miss; no edit is ever blocked; and the update-survival byte comparison (R11) passes.
- R13. Preserve the already-generated installer baseline (`.agents/skills/impeccable/**`, `.codex/hooks.json`, `.github/hooks/impeccable.json`, `.gitignore`, `PRODUCT.md`, `DESIGN.md`, `.impeccable/design.json`, `.impeccable/live/config.json`) exactly as-is; no work is planned against these files beyond confirming they remain untouched.
- R14. Isolate the plugin runtime from the app's typecheck/lint/build/CI surfaces: a dedicated `.opencode/tsconfig.json`, exclusion from the root `tsconfig.json`, exclusion from ESLint's app-focused config, and a shared `check-types` script used by both local `build` and the CI typecheck step, without changing existing CI design-check semantics.
- R15. Unit and integration test coverage: pure bridge helpers/state machine covered by unit tests; the real subprocess path (spawn, stdin/stdout separation, strict envelope parsing, exit-zero-empty clean, malformed non-empty output, non-zero exit, timeout-and-terminate) covered by integration tests.

## Scope Boundaries

In scope: a repo-local OpenCode plugin (registration, runtime, subprocess bridge, tests) that forwards post-edit tool-call metadata to the existing `hook.mjs` brain and relays its advisory output back into OpenCode's tool-call context, plus the minimal tooling isolation (tsconfig, lint ignore, CI typecheck wiring) needed to keep the plugin runtime out of the app's build/lint surfaces.

Out of scope:
- Reimplementing or directly invoking Impeccable's detector logic (`impeccable detect`) — the plugin only shells out to the existing `hook.mjs`.
- Any change to application runtime behavior, components, or pages.
- Visual-design cleanup of issues the Impeccable init crawl may have surfaced — tracked separately, not fixed here.
- Any change to the existing CI design-check job's semantics (only the typecheck step's script source moves to a shared command).

### Deferred to Separate Tasks

- Any visual/design remediation the live verification step (R12) happens to surface is logged for a follow-up, not fixed inline.

## Context & Research

### Relevant Code and Patterns

- `.agents/skills/impeccable/scripts/hook.mjs` — the existing hook brain, already wired into `.codex/hooks.json` and `.github/hooks/impeccable.json` for other harnesses. This plan spawns it as-is; it is not modified.
- `.impeccable/design.json`, `.impeccable/live/config.json`, `PRODUCT.md`, `DESIGN.md` — already-generated Impeccable project context consumed by `hook.mjs`; confirmed present and correct, no changes planned.
- Root `opencode.json` (to be created in Unit 3, alongside `plugin.ts`) — OpenCode's plugin registration surface per `https://opencode.ai/docs/plugins/`. The dashboard reference's own root `opencode.json` registers its plugin by an explicit relative path to its runtime module; this plan follows that proven precedent rather than a namespaced or discovered registration.
- `fro-bot/dashboard` commit `f65de95ce8d6af26554f0a9fbb5768606046d2af` — reference implementation of the same contract, itself on pnpm + ESLint + Vitest + Node 24 (tool matching, path extraction, subprocess bridging, warn-once state machine, explicit relative-path plugin registration). Adapted here for `node:child_process`, this repo's Vite build, and Node 22+.
- Root `tsconfig.json`, `eslint.config.ts`, `.github/workflows/ci.yaml` — existing app-focused tooling surfaces that must exclude/isolate the new `.opencode/**` plugin runtime rather than absorb it. Every workflow that invokes the root build script (CI, deploy, E2E, performance, Copilot setup) transitively inherits the plugin typecheck gate through that shared script, even though only `.github/workflows/ci.yaml`'s standalone typecheck step is edited directly.
- `.opencode/package.json` — a single file ignored/untracked via `.opencode/.gitignore`; the surrounding `.opencode/` directory itself is not ignored, since this plan's own tracked files (`.opencode/tsconfig.json`, `.opencode/impeccable/**`) live under it.
- Vitest 4.1.10 default test discovery (`defaults.ts`) scans dot-directories (`dot: true`), so `.opencode/impeccable/*.test.ts` is picked up by the existing root test glob without a Vitest config change; coverage stays scoped to `src/**` (`project.ts`).

### Institutional Learnings

- `docs/solutions/integration-issues/gist-list-api-omits-content-snapshot-empty-2026-07-18.md` (medium relevance): integration boundaries that silently degrade are worse than ones that fail loudly. Applied here: the subprocess bridge must preserve real payload fidelity to `hook.mjs` (correct paths, session ID, environment), enforce a hard timeout with actual process termination rather than a soft await, and surface anomalies (timeout, malformed output, non-zero exit) as a visible warning rather than swallowing them — silent degradation on this boundary would mean advisory feedback quietly stops working with no signal.

## Key Technical Decisions

- **`node:child_process.spawn` over Bun's `$`/shell inside the Bun-hosted OpenCode plugin.** Avoids shell interpolation of user-influenced paths, gives a real handle to kill on timeout (vs. a shell subprocess that may survive), keeps the bridge portable to Node/Vitest for testing, and avoids a Bun-specific type dependency. Bun's Node compatibility layer supports `node:child_process`, and the repo already requires Node 22+, so this is a natural fit rather than a compromise.
- **Pin `@opencode-ai/plugin@1.18.2` as a root devDependency, used via type-only import, with a corresponding `pnpm-lock.yaml` update.** The root pin exists solely to make local and CI type-checking reproducible; it is never imported at runtime, so it has no effect on how the OpenCode host resolves or loads the plugin. The ignored `.opencode/package.json` file references `1.17.20`, which is not CI-reproducible since that specific file (not the surrounding `.opencode/` directory) is gitignored. Research confirms the plugin type contract is compatible across both versions, so the upgrade is not required for correctness — 1.18.2 is chosen to match the proven `fro-bot/dashboard` reference and current upstream release, not because 1.17.20 is broken.
- **New `.opencode/tsconfig.json`, with `.opencode/**` excluded from the root `tsconfig.json`, and a shared `check-types` script.** Keeps the plugin runtime's type-checking independent of the app's `tsc` run while still gating it in CI, via one script both `build` and the CI workflow call — avoiding two divergent typecheck code paths. This is the single entrypoint for both surfaces; no further consolidation is needed.
- **`.opencode/**` excluded from ESLint only; TypeScript and Vitest both still validate it.** The plugin runtime is a small, self-contained bridge; isolating it from app-oriented ESLint conventions avoids forcing unrelated lint rules onto Node subprocess/plugin code, while the shared `check-types` script and the existing test glob still hold the plugin to the same type-safety and test-coverage bar as application code. Vitest 4.1.10's default test discovery already scans dot-directories, so `.opencode/impeccable/*.test.ts` runs under the existing test gate with coverage still scoped to `src/**` — no Vite/Vitest config change is planned unless implementation proves otherwise.
- **Unit tests mirror dashboard's pure helper/state-machine cases; a real subprocess is exercised only in a dedicated integration test.** Keeps the fast unit suite deterministic (tool-name matching, path extraction/dedup, envelope parsing, warn-once state transitions) while still proving the actual spawn/timeout/kill behavior against a real child process. Integration test assertions on hook output avoid pinning exact detector wording, to stay resilient to `hook.mjs` copy changes.
- **Plugin registration (`opencode.json`) lands together with `plugin.ts` in Unit 3, not earlier, using an explicit relative-path registration matching the dashboard reference.** Registering a plugin module path before the module exists would leave an invalid or dangling registration mid-sequence; Unit 1 only prepares dependency and tooling isolation. The explicit relative path (rather than a discovery mechanism) is chosen because it is the pattern proven working in the dashboard reference.
- **Graduated timeout termination rather than a single kill signal.** On timeout, the runner closes stdin, sends a termination signal, waits a short bounded grace period, and escalates to a forceful kill signal only if the child hasn't exited — then resolves only after the child is confirmed exited/reaped. A single immediate forceful kill risks orphaned resources in the child (e.g. an in-flight write); a graduated approach gives the child a chance to exit cleanly while still guaranteeing termination within a bounded total time.
- **Bounded stdout/stderr capture, with stderr never surfaced verbatim.** Unbounded buffering of a runaway child's output is a resource risk; capture is capped and overflow is treated as an anomaly. stderr is diagnostic-only for the plugin's own warn-once state, never appended to model-visible tool output, to avoid leaking process internals or noise into the edit result.

## Open Questions

### Resolved During Planning

- Target repo — this `marcusrbrown.github.io` repo, not `mothership`. (Confirmed.)
- Baseline installer artifacts (`.agents/skills/impeccable/**`, hooks configs, `PRODUCT.md`, `DESIGN.md`, `.impeccable/design.json`, `.impeccable/live/config.json`) are in scope as an already-verified baseline, not new work. (Confirmed.)
- Subprocess mechanism — `node:child_process.spawn`, not Bun `$`/shell. (Confirmed, with rationale above.)
- `@opencode-ai/plugin` version — pin `1.18.2`, add lockfile entry. (Confirmed.)
- Detector reimplementation, application runtime changes, init-time visual cleanup, and CI design-check semantic changes are explicitly out of scope. (Confirmed.)
- Reference-stack correction — `fro-bot/dashboard` is pnpm + ESLint + Vitest + Node 24; `mothership` is the Bun/Biome/Tauri issue source. (Confirmed.)
- `opencode.json` registration style — explicit relative-path registration to the plugin module, matching the dashboard reference's proven pattern, not a discovery-based or namespaced registration. (Confirmed.)
- `@opencode-ai/plugin` root pin scope — type-only import for reproducible typechecking; runtime plugin resolution by the OpenCode host does not depend on this root devDependency. (Confirmed.)
- `.opencode/package.json` ignore scope — the file itself is gitignored via `.opencode/.gitignore`, not the whole `.opencode/` directory; this plan's tracked files under `.opencode/` are unaffected. (Confirmed; the earlier "dual-source" framing of this finding was rejected since the file and lockfile in question are untracked.)
- ESLint/TypeScript/Vitest split for the plugin runtime — ESLint intentionally skips `.opencode/**`; TypeScript (via `check-types`) and Vitest both still validate it. (Confirmed.)
- Timeout termination lifecycle — close stdin, send a termination signal, bounded grace period, escalate to a forceful kill if needed, resolve only after the child exits/is reaped, clean up listeners/resources in every case. (Confirmed, plan-level only.)
- Output handling — stdout and stderr capture are both bounded; overflow is an anomaly; stderr is never appended to model-visible output; non-empty stderr alongside an empty-stdout exit-0 child is an anomaly, not quiet-clean. (Confirmed.)
- Envelope acceptance — only the nested Claude-harness `PostToolUse` shape with a non-empty string `additionalContext` counts as a successful parse; all other shapes (wrong event, missing nesting, empty/non-string context, foreign-harness shapes) are anomalies. (Confirmed.)
- Pre-run bypass — a recognized mutating tool call with no extractable path is an explicit bypass (runner never invoked), distinct from a successful scan; it must be tested as its own case, not folded into quiet-clean. (Confirmed.)
- Live verification rigor — proof must tie a specific fresh file and a unique session to a specific cache entry recording that file/session/finding, not rely on cache-file mtime movement alone; a separate clean-state verification is required so dedup can't fake silence. (Confirmed.)

### Deferred to Implementation

- Exact tool ID strings OpenCode emits for MCP-suffixed edit/write/apply_patch variants — confirmed empirically during Unit 4's live verification, not assumed from documentation.
- Precise malformed-output and non-zero-exit fixtures for the integration test — derived from `hook.mjs`'s actual failure modes at implementation time.

## Implementation Units

- [x] **Unit 1: Dependency and tooling isolation**

**Goal:** Land the plugin's dependency and isolate its future runtime from the app's typecheck/lint/CI paths, while confirming the existing installer baseline is untouched. No plugin registration happens here.

**Requirements:** R11, R13, R14

**Dependencies:** None

**Files:**
- Create: `.opencode/tsconfig.json`
- Modify: `package.json` (add pinned `@opencode-ai/plugin` devDependency; add/update `check-types` script; wire `build` to use it), `pnpm-lock.yaml`, `tsconfig.json` (exclude `.opencode/**`), `eslint.config.ts` (ignore `.opencode/**`), `.github/workflows/ci.yaml` (point the standalone typecheck step at the shared `check-types` script)

**Approach:**
- Add `.opencode/tsconfig.json` scoped to the future plugin runtime, and exclude `.opencode/**` from the root `tsconfig.json` so app type-checking is unaffected.
- Introduce a `check-types` script that chains the app's existing type-check with the new plugin tsconfig's check, and point `build` and the CI workflow's typecheck step at it instead of duplicating the underlying commands inline.
- Add `.opencode/**` to ESLint's ignore patterns.
- Confirm (read-only) that none of the baseline files listed in R13 require or received changes.

**Test expectation:** none — this unit is non-behavioral setup (dependency, config, CI wiring). Verified structurally rather than via new tests.

**Verification:** dependency resolution succeeds with the pinned version locked; app type-checking no longer covers `.opencode/**`; lint runs skip `.opencode/**`; the shared `check-types` script contract exists and is what CI's typecheck step invokes; existing CI design-check job semantics are unchanged; baseline files listed in R13 show no diff.

- [x] **Unit 2: Pure bridge contracts**

**Goal:** Implement the deterministic, side-effect-free parts of the bridge in `hook-bridge.ts` — tool-name matching, path extraction/dedup, hook payload shaping (including session ID), envelope parsing, and the warn-once state machine — with full unit coverage.

**Requirements:** R2, R3, R4, R6 (grace-period/kill-signal state modeling only, no real subprocess), R8, R9, R10, R15 (unit portion)

**Dependencies:** Unit 1 (tsconfig scaffolding in place)

**Files:**
- Create: `.opencode/impeccable/hook-bridge.ts`
- Test: `.opencode/impeccable/plugin.test.ts`

**Approach:**
- Implement tool-name matching against bare `edit`, `write`, `apply_patch` and names ending in `_edit`, `_write`, or `_apply_patch` (single or multiple underscore-separated prefix segments), precise enough to avoid matching unrelated tool names that merely contain these substrings without that suffix shape.
- Implement `filePath` extraction for `edit`/`write` calls and deduplicated Add/Update/Delete/Move path extraction from `apply_patch` diff text.
- Implement hook payload construction, including the OpenCode session ID.
- Implement strict acceptance of only the nested Claude-harness `PostToolUse` envelope carrying a non-empty string `additionalContext`, extracting that text for human-readable output; wrong event name, missing nested envelope, empty/non-string `additionalContext`, top-level/foreign-harness shapes, and any other malformed non-empty output are all treated as parse failures, not silently accepted.
- Implement the pre-run bypass check: a recognized mutating tool call with no extractable path short-circuits before any subprocess invocation, modeled and tested as its own explicit outcome rather than folded into quiet-clean success.
- Implement the warn-once state machine covering the outcomes in R9: bypass, quiet-clean (valid payload sent, child exits 0, both stdout and stderr empty), stderr-present-with-empty-stdout anomaly, bounded-output-overflow anomaly, and the general timeout/non-zero-exit/spawn-failure/malformed-output anomaly; the first anomaly of any kind produces a compact visible warning, subsequent anomalies in the same plugin process/startup stay silent.
- Reuse `hook.mjs`'s config/filter/dedup/cache behavior as-is — the bridge passes data through, it does not reimplement filtering or caching.

**Test scenarios:**
- Happy path: bare `edit`/`write`/`apply_patch` tool calls match; suffixed variants (`mcp_edit`, `filesystem_write`, `github_mcp_apply_patch`) match; unrelated tool names that merely contain "edit"/"write"/"apply_patch" without the required suffix shape do not match.
- Happy path: `edit`/`write` calls yield the correct `filePath`; `apply_patch` diff text with multiple Add/Update/Delete/Move entries, including duplicates, yields a correctly deduplicated path list.
- Happy path: hook payload includes the session ID unchanged from the invoking tool-call context.
- Happy path: a well-formed non-empty stdout envelope matching the strict nested Claude-harness `PostToolUse` shape with a non-empty string `additionalContext` is accepted and only the human-readable text is extracted (no raw JSON in the result).
- Edge case: a recognized mutating tool call with no extractable path resolves to the explicit bypass outcome, distinct from quiet-clean, with the subprocess runner never invoked.
- Edge case: a valid payload with exit 0, empty stdout, and empty stderr classifies as quiet-clean success (no visible output).
- Error case: exit 0 with empty stdout but non-empty stderr classifies as an anomaly, not quiet-clean, and stderr content is never surfaced in the visible warning.
- Error case: wrong event name, missing nested envelope, empty or non-string `additionalContext`, and a top-level/foreign-harness-shaped payload each classify as a malformed-output anomaly.
- Error case: stdout or stderr exceeding the bounded capture size classifies as an overflow anomaly.
- Edge case: warn-once — a second anomaly of any kind within the same simulated process/startup does not re-emit the warning; a fresh process/startup can warn again.

**Verification:** the unit test suite covering `hook-bridge.ts` behavior passes; no dependency on a live subprocess in this unit's tests.

- [x] **Unit 3: Plugin registration, subprocess runner, and adapter**

**Goal:** Register the plugin with OpenCode, implement the actual `node:child_process.spawn` subprocess runner (environment shaping, hard timeout with real termination), and implement the single-export plugin adapter that wires OpenCode's post-edit tool-call event into the Unit 2 bridge and this runner, with integration coverage against a real child process.

**Requirements:** R1, R5, R6, R7, R8 (end-to-end relay), R9 (end-to-end), R15 (integration portion)

**Dependencies:** Unit 2

**Files:**
- Create: `opencode.json`, `.opencode/impeccable/plugin.ts`, `.opencode/impeccable/hook-bridge.integration.test.ts`

**Approach:**
- Add `opencode.json` at the repo root registering the plugin module by an explicit relative path to `plugin.ts` now that it exists, matching the dashboard reference's proven registration style.
- Implement the subprocess runner: spawn `hook.mjs` with `IMPECCABLE_HOOK_HARNESS=claude` and `IMPECCABLE_HOOK_QUIET=1` set, with any inherited `IMPECCABLE_HOOK_DEPTH`/`CLAUDE_HOOK_DEPTH` stripped from the child's environment; cap captured stdout and stderr to a bounded size, treating overflow as an anomaly and never surfacing stderr verbatim; enforce a hard ~5 second timeout with the graduated termination lifecycle (close stdin, send a termination signal, bounded grace period, escalate to a forceful kill if still alive, resolve only after the child exits and is reaped, clean up listeners/resources in every case).
- Implement `plugin.ts` as the sole exported plugin function: on a matching post-edit tool call, first apply the Unit 2 bypass check, then build the payload via the Unit 2 bridge, invoke the runner, resolve the outcome via the Unit 2 state machine, and append (never replace) human-readable feedback to the tool output. This step is advisory only, bounded by the timeout budget — any runner failure or timeout must resolve to the warn path, never to blocking, cancelling, or altering the underlying edit result.
- Keep all types/constants/helpers in `hook-bridge.ts`; `plugin.ts` contains only the registration wiring and the single plugin export.
- Generate any real-child-process fixtures needed by the integration test ephemerally at test runtime (small inline test scripts written to a temp path during the test run), including a fixture that ignores a termination signal so the escalation path is exercised; no additional fixture file is tracked in the repo for this.

**Test scenarios:**
- Happy path: spawning a real (ephemeral test-fixture) child process that exits 0 with empty stdout and empty stderr resolves quiet-clean, with no visible output appended.
- Happy path: a child process that exits 0 with a well-formed non-empty envelope matching the strict nested Claude-harness shape results in the human-readable `additionalContext` appended to tool output, clearly delimited from the original output, with no raw JSON visible.
- Error case: a child process that exits non-zero resolves to the warn path.
- Error case: a child process producing malformed/unrecognized non-empty stdout resolves to the warn path.
- Error case: a child process that exits 0 with empty stdout but non-empty stderr resolves to the warn path, with stderr content never appended to visible output.
- Error case: a child process whose stdout or stderr exceeds the bounded capture size resolves to the warn path as an overflow anomaly.
- Error case: a child process that ignores the initial termination signal past the timeout is escalated to a forceful kill, and the test asserts the process is actually gone/reaped afterward — not merely that the warn path was returned.
- Error case: a spawn failure (e.g. missing script) resolves to the warn path.
- Edge case: a recognized mutating tool call with no extractable path never invokes the subprocess runner at all.
- Integration: verify the child process's stdin/stdout are handled separately from the plugin's own I/O (no cross-contamination), that stdin is closed as part of the timeout sequence, and that environment variables are shaped as specified (harness/quiet set, both depth variables absent) for the actual spawned process.

**Verification:** the integration test suite covering the subprocess runner and plugin adapter passes, including real subprocess spawn/graduated-timeout/escalated-kill/reap behavior and the bypass, stderr-anomaly, and overflow-anomaly outcomes; no test relies on exact `hook.mjs` detector wording; the plugin registration resolves to a valid module by its explicit relative path.

- [x] **Unit 4: Live verification and update-survival evidence**

**Goal:** Prove the assembled plugin behaves correctly against a running OpenCode instance and survives `npx impeccable update`, closing out the mandatory live-verification requirement.

**Requirements:** R11, R12

**Dependencies:** Unit 1, Unit 2, Unit 3

**Files:**
- None expected to change; this unit is verification-only unless live testing surfaces a defect in prior units, in which case the affected unit's files are revisited.

**Approach:**
- Restart OpenCode with the plugin registered and confirm it loads without error.
- Observe and record the actual tool ID(s) OpenCode emits for edit/write/apply_patch and their MCP/underscore-suffixed variants, resolving the deferred question from Unit 2/3 empirically rather than from documentation assumptions.
- Using a fresh temporary file and a unique session, make a detectable design-flawed edit (e.g. a gradient-text pattern) on its first invocation through OpenCode and confirm readable advisory feedback appears in the tool-call context within the timeout budget; then confirm the cache records that exact file, session, and finding — not merely that a cache file's mtime moved.
- Using a separate fresh file or otherwise controlled clean state (so existing dedup logic cannot fake silence for an already-seen finding), make a clean edit and confirm no visible output is appended.
- Confirm no edit is ever blocked or altered by the plugin regardless of hook outcome, and that any hook response arrives within the ~5 second timeout budget rather than hanging.
- Run `npx impeccable update` and byte-compare the root OpenCode plugin registration and `.opencode/impeccable/**` before and after, confirming no changes.

**Test expectation:** none — this unit produces live verification evidence (observed behavior, cache-entry and byte comparisons), not new automated tests. Any defect found here is fixed by returning to the relevant earlier unit.

**Verification:** all live-verification conditions in R12 hold, including the file/session/finding tie in the cache entry; the update-survival byte comparison in R11 passes with no diff.

## System-Wide Impact

- **Interaction graph:** the plugin listens to OpenCode's post-tool-call event for a bounded set of edit-shaped tools and calls out to the existing, unmodified `hook.mjs`; no other part of the app or its build graph depends on or is depended on by this plugin.
- **API surface parity:** none — this is an OpenCode-side integration with no effect on the application's runtime, routes, or components.
- **Build/typecheck implementation changes; runtime and gate behavior does not:** the typecheck implementation is extended to cover the plugin runtime via a shared script, and the test gate now also validates the plugin runtime (unit and integration tests), while ESLint intentionally continues to skip `.opencode/**`. Application build outputs, existing lint rules for app code, and existing test behavior for app code are otherwise unchanged; the CI design-check job's semantics are unchanged. Every workflow invoking the root build script inherits the extended typecheck gate, even though only the CI workflow's standalone typecheck step is edited.
- **Update tooling:** `npx impeccable update` must remain a no-op against this feature's files (R11), so the plugin's registration and runtime paths must stay outside whatever the updater manages or regenerates.

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| OpenCode's actual tool IDs differ from the assumed bare/suffixed pattern, causing missed or false matches | Unit 4 observes real tool IDs live before considering the feature done; Unit 2's matching logic is unit-tested against the assumed set and adjustable |
| Subprocess hangs and is not actually killed on timeout, silently blocking future hook invocations | Unit 3's integration tests specifically assert real process termination, not just promise rejection |
| `npx impeccable update` regenerates or overwrites the new `.opencode/impeccable/**` files | Unit 4 performs an explicit byte comparison before/after running update |
| Advisory output leaks raw JSON or destabilizes tool-call output formatting | Unit 2/3 tests assert only `additionalContext` is surfaced, clearly delimited from original output |
| Pinning `@opencode-ai/plugin@1.18.2` diverges from an already-working local `1.17.20` install | Confirmed compatible by research before pinning; lockfile update makes the version CI-reproducible |
| The upstream-managed Impeccable bundle (tens of thousands of lines under `.agents/skills/impeccable/**` and related config) can obscure the small custom plugin diff in review | Confirm the managed baseline's contents/hashes are unchanged from the installer output before review, and review the custom `.opencode/**` and root config changes as a separate, isolated diff from the managed baseline |
| A recognized mutating tool call with no extractable path is silently miscounted as a successful scan, masking a real gap in path extraction | Unit 2/3 model and test the bypass as its own explicit outcome, distinct from quiet-clean, so it stays visible in test results rather than blending into the silent-success path |
| Unbounded stdout/stderr capture from a misbehaving or malicious child lets a runaway process exhaust plugin process memory | Unit 3 bounds captured output size and treats overflow as an anomaly rather than buffering without limit |
| A child process ignores termination signals or is left as a zombie/orphan after timeout, leaking resources across repeated edits | Unit 3's timeout lifecycle escalates from a termination signal to a forceful kill and resolves only after confirmed exit/reap; a dedicated integration test exercises a signal-resistant fixture and asserts the process is actually gone afterward |

## Documentation / Operational Notes

- OpenCode plugins load at process startup; a running OpenCode instance must be restarted to pick up a new or changed plugin registration.
- The Unit 4 live verification pass is a mandatory completion gate for this feature, not an optional follow-up.
- If live verification surfaces a new, reusable failure mode (e.g. an unexpected tool ID shape or a subprocess edge case not covered by Unit 3's tests), record it as a solution doc under `docs/solutions/` following this repo's existing convention; otherwise no additional documentation is expected.

## Sources & References

- `https://github.com/marcusrbrown/mothership/issues/19` — behavioral requirements source for the OpenCode post-edit hook plugin.
- `fro-bot/dashboard` commit `f65de95ce8d6af26554f0a9fbb5768606046d2af` — reference implementation of the same contract (pnpm + ESLint + Vitest + Node 24).
- `https://opencode.ai/docs/plugins/` — OpenCode plugin registration and event contract.
- `https://nodejs.org/api/child_process.html` — Node.js `child_process` documentation: subprocess spawn, environment, and termination semantics.
- `https://github.com/vitest-dev/vitest/blob/v4.1.10/packages/vitest/src/defaults.ts` — Vitest 4.1.10 default test include behavior (dot-directory scanning).
- `https://github.com/vitest-dev/vitest/blob/v4.1.10/packages/vitest/src/node/project.ts` — Vitest 4.1.10 project/coverage scoping.
- `docs/solutions/integration-issues/gist-list-api-omits-content-snapshot-empty-2026-07-18.md` — institutional lesson on integration boundary fidelity, hard timeouts, and loud anomalies.
