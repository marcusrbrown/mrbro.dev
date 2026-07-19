/**
 * Shared filename contract for project preview images.
 *
 * Both the runtime transform (`src/hooks/UseGitHub.ts`) and the build-time
 * refresh script (`scripts/project-preview-refresh.ts`) import this pure
 * helper so the deterministic asset path can never desync between the two
 * sides — a single source of truth instead of two independently-derived
 * formulas.
 */

/** Returns true when `id` is usable as a preview-image filename key. */
const isValidRepoId = (id: number): boolean => Number.isInteger(id) && id > 0

/**
 * Returns the deterministic local URL path for a repo's preview image, e.g.
 * `/project-previews/12345.png`. Returns `undefined` for a missing/invalid
 * id so callers can degrade to an image-less card rather than emit a broken
 * path.
 */
export const previewImagePath = (repoId: number): string | undefined =>
  isValidRepoId(repoId) ? `/project-previews/${repoId}.png` : undefined
