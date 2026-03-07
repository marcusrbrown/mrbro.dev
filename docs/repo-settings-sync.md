# GitHub Repository Settings Apply Script (via `gh repo edit`)

This documents the TypeScript script that applies the desired repository settings baseline for `marcusrbrown/mrbro.dev` using `gh repo edit`.

`marcusrbrown/marcusrbrown.github.io` was used as the original reference to define the baseline values, but the script does not read that repository at runtime.

## What is applied

The following settings are covered by `gh repo edit` and are applied to this repo by script:

- `default_branch`
- `description`
- `homepage`
- `allow_auto_merge`
- `allow_update_branch`
- `allow_merge_commit`
- `allow_rebase_merge`
- `allow_squash_merge`
- `delete_branch_on_merge`
- `has_discussions`
- `has_issues`
- `has_projects`
- `has_wiki`
- topics from `package.json` `keywords`

Visibility is intentionally not changed by the script.

## One-off command used in this session

This is the exact `gh repo edit` command shape applied to `mrbro.dev`:

```bash
gh repo edit marcusrbrown/mrbro.dev \
  --default-branch main \
  --description "<package.json description>" \
  --homepage "<package.json homepage>" \
  --delete-branch-on-merge \
  --enable-discussions=false \
  --enable-issues \
  --enable-projects \
  --enable-wiki=false \
  --enable-auto-merge \
  --allow-update-branch=false \
  --enable-merge-commit=false \
  --enable-rebase-merge=false \
  --enable-squash-merge
```

Topic sync commands used by the script (keywords from `package.json`):

```bash
# remove existing topics first
gh api repos/marcusrbrown/mrbro.dev/topics --jq '.names[]?'
gh repo edit marcusrbrown/mrbro.dev --remove-topic "topic-a,topic-b"

# add every package.json keyword as a topic
gh repo edit marcusrbrown/mrbro.dev \
  --add-topic "portfolio,developer,blog,vite,typescript,react,github-pages"
```

The script loads the following fields from `package.json` at runtime:

- `description` → `--description`
- `homepage` → `--homepage`
- `keywords[]` → repeated `--add-topic`

## Repeatable TypeScript script

Use `scripts/apply-repo-settings.ts` to re-apply the baseline settings to `marcusrbrown/mrbro.dev`.

### Prerequisites

- GitHub CLI authenticated: `gh auth login`
- Admin permission on `marcusrbrown/mrbro.dev`

### Usage

```bash
# Apply baseline settings to mrbro.dev
pnpm exec tsx scripts/apply-repo-settings.ts

# Optional: apply to a different repository (same baseline)
TARGET_REPOSITORY=OWNER/REPO pnpm exec tsx scripts/apply-repo-settings.ts
```

### Verification command

```bash
gh api repos/marcusrbrown/mrbro.dev --jq '{full_name,allow_auto_merge,allow_update_branch,allow_merge_commit,allow_rebase_merge,allow_squash_merge,delete_branch_on_merge,has_discussions,has_issues,has_projects,has_wiki,description,homepage,default_branch,visibility,topics}'
```

Reference output used to define the baseline (historical reference):

```bash
gh api repos/marcusrbrown/marcusrbrown.github.io --jq '{full_name,allow_auto_merge,allow_update_branch,allow_merge_commit,allow_rebase_merge,allow_squash_merge,delete_branch_on_merge,has_discussions,has_issues,has_projects,has_wiki,description,homepage,default_branch,visibility,topics}'
```

## Notes

- `gh repo edit` does not expose every repository setting in GitHub.
- The script intentionally applies only fields that map cleanly to `gh repo edit` flags.
- Topic sync is reset-and-apply: current topics are removed, then `package.json` keywords are added.
