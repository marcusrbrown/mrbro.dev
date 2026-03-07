## Before You Change Code

1. Read `AGENTS.md` and relevant subdirectory `AGENTS.md` files (`src/components/AGENTS.md`, `src/hooks/AGENTS.md`, `scripts/AGENTS.md`, `tests/AGENTS.md`).
2. Follow the existing patterns in nearby files before introducing new structure.

## Repo Conventions You Must Follow

- Use **pnpm only**. Never use npm or yarn.
- Use **TypeScript strict mode** and keep types explicit/safe.
- Use **pure ESM** only (no `require`, no `module.exports`).
- Keep hook filenames in `src/hooks/` as **PascalCase** (example: `UseTheme.ts`).
- Use direct imports; do not add barrel exports except `src/types/index.ts`.
- Use `.yaml` extension for workflows/config where applicable (not `.yml` in this repo).
- Keep React components in `src/components/` as PascalCase `.tsx` files.

## Critical Do / Don't Examples

### Package manager

DO:

```bash
pnpm install --frozen-lockfile
pnpm run lint
pnpm run test
pnpm run build
```

DON'T:

```bash
npm install
yarn install
```

### Type-only imports (`verbatimModuleSyntax`)

DO:

```ts
import type {Theme} from "@/types/theme"
```

DON'T:

```ts
import {Theme} from "@/types/theme"
```

### Strict boolean checks

DO:

```ts
if (value != null) {
  // safe
}
```

DON'T:

```ts
if (!value) {
  // ambiguous for strict boolean expressions
}
```

### Hook naming and exports

DO:

```ts
// src/hooks/UseFeatureFlag.ts
export function useFeatureFlag(): boolean {
  const [enabled] = useState(true)
  return enabled
}
```

DON'T:

```ts
// src/hooks/useFeatureFlag.ts
export default function featureFlag() {
  return true
}
```

### Imports and barrels

DO:

```ts
import {useTheme} from "@/hooks/UseTheme"
```

DON'T:

```ts
import {useTheme} from "@/hooks"
```

## Verification Commands (Run Before Finishing)

Run these after making changes:

```bash
pnpm run lint
pnpm run test
pnpm run build
```

For type checks, run:

```bash
pnpm exec tsc --noEmit
```

## Security and Safety Rules

- Never commit secrets, tokens, private keys, or credential files.
- Never add telemetry or data collection without explicit opt-in and documented privacy behavior.
- Never bypass checks with `--no-verify`, `@ts-ignore`, `@ts-expect-error`, or `as any`.
- Never use destructive git operations (`push --force`, hard reset) unless explicitly instructed.

## Scope and Change Discipline

- Keep diffs focused to the requested task.
- Do not refactor unrelated modules.
- Match existing file structure, naming, and style in touched areas.
- Prefer small, auditable commits and deterministic scripts.
