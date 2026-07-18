# Project Preview Images

## Source

Each portfolio repository's GitHub Open Graph card is fetched from:

```text
https://opengraph.githubassets.com/1/<owner>/<repo>
```

The refresh runs at build time and self-hosts validated PNGs under `public/project-previews/`. The runtime serves `/project-previews/<id>.png`, where `<id>` is the repository's stable GitHub ID and the filename comes from the shared `previewImagePath` helper.

## Refresh

`.github/workflows/blog-refresh.yaml` refreshes preview images with the blog snapshot on the daily cron, or on demand with `workflow_dispatch`. Both refreshes share one change gate and one commit/push to `main`.

The script fetches the current public portfolio listing before refreshing images. Its wasPublished-first fail-safe makes a previously committed image failure fatal while allowing a new repository's failed image to be skipped with a warning. Successful listing refreshes also apply the R9 privacy prune, removing images for repositories no longer in the public portfolio set.

## Verify

Check the workflow result and hit the static asset directly:

```bash
curl -I https://mrbro.dev/project-previews/<id>.png
```

The response should be `200` with `Content-Type: image/png`. Do not verify through a SPA route: GitHub Pages' `spa-github-pages` design returns `404` for that route even when the static asset is present.

## Failure Modes

| Condition                              | Result                                       |
| -------------------------------------- | -------------------------------------------- |
| Previously committed image fetch fails | Fatal; existing assets are preserved         |
| New repository image fetch fails       | Skipped with a warning; other assets publish |
| Empty or garbage `200` image response  | Hard failure; invalid bytes are not written  |
| Repository listing fetch fails         | Fatal; nothing is pruned                     |
