# Branch Protection Configuration Guide

This guide explains how to configure GitHub branch protection rules to enforce comprehensive testing requirements for the mrbro.dev project.

## Overview

The project uses multiple test suites that should be enforced as required status checks before merging pull requests. This ensures high code quality and prevents regressions.

## Required Status Checks

### Required Status Checks (Current PR #6 Set)

These status checks are currently expected as required for merge:

1. `Test Notifications`
2. `Test Summary & Badge Generation`
3. `Performance Summary`
4. `Quality Gate`
5. `E2E Tests (chromium)`
6. `Build for Testing`
7. `Build Project`
8. `Validate Dependencies`
9. `Lint Code`
10. `Test`
11. `Type Check`
12. `Performance Audit (mobile)`
13. `Performance Audit (desktop)`
14. `Fro Bot`
15. `Setup and Cache`
16. `Setup E2E Environment`
17. `Renovate / Renovate`

### Individual Test Suite Checks (Alternative)

If you prefer granular control, you can require individual workflow jobs:

#### CI Workflow (`CI`)

- **`Quality Gate`** - Consolidates unit tests, linting, build, type checking, validation

#### E2E Tests Workflow (`E2E Tests`)

- **`Test Summary & Badge Generation`** - Consolidates E2E, visual, accessibility tests
- **`E2E Tests (chromium)`** - Core end-to-end functionality
- **`Visual Regression Tests`** - UI consistency validation

#### Performance Testing Workflow (`Performance Testing`)

- **`Performance Audit`** - Lighthouse performance validation
- **`Performance Summary`** - Aggregated performance metrics

## Configuration Steps

### Method 1: GitHub Web UI (Recommended)

1. **Navigate to Repository Settings**

   ```text
   GitHub.com → Repository → Settings → Branches
   ```

2. **Add/Edit Branch Protection Rule**
   - Branch name pattern: `main`
   - Enable "Restrict pushes that create files"

3. **Configure Required Status Checks**
   - ✅ Require status checks to pass before merging
   - ✅ Require branches to be up to date before merging

   **Required checks to add:**

   ```text
   Test Notifications
   Test Summary & Badge Generation
   Performance Summary
   Quality Gate
   E2E Tests (chromium)
   Build for Testing
   Build Project
   Validate Dependencies
   Lint Code
   Test
   Type Check
   Performance Audit (mobile)
   Performance Audit (desktop)
   Fro Bot
   Setup and Cache
   Setup E2E Environment
   Renovate / Renovate
   ```

   **Optional additional checks:**

   ```text
   Build Project
   Test
   Type Check
   E2E Tests (chromium)
   Performance Audit (desktop)
   Performance Audit (mobile)
   ```

4. **Additional Protection Settings**
   - ✅ Require pull request reviews before merging (1 reviewer minimum)
   - ✅ Dismiss stale PR approvals when new commits are pushed
   - ✅ Require review from CODEOWNERS
   - ✅ Restrict who can dismiss pull request reviews
   - ✅ Allow force pushes (disabled)
   - ✅ Allow deletions (disabled)

### Method 2: GitHub CLI Configuration

```bash
# Configure comprehensive branch protection
gh api repos/marcusrbrown/mrbro.dev/branches/main/protection \
  --method PUT \
  --field required_status_checks='{"strict":true,"contexts":["Test Notifications","Test Summary & Badge Generation","Performance Summary","Quality Gate","E2E Tests (chromium)","Build for Testing","Build Project","Validate Dependencies","Lint Code","Test","Type Check","Performance Audit (mobile)","Performance Audit (desktop)","Fro Bot","Setup and Cache","Setup E2E Environment","Renovate / Renovate"]}' \
  --field enforce_admins=false \
  --field required_pull_request_reviews='{"required_approving_review_count":1,"dismiss_stale_reviews":true,"require_code_owner_reviews":true}' \
  --field restrictions=null \
  --field allow_force_pushes=false \
  --field allow_deletions=false

# Alternative: More granular status checks
gh api repos/marcusrbrown/mrbro.dev/branches/main/protection \
  --method PUT \
  --field required_status_checks='{"strict":true,"contexts":["Build Project","Test","Type Check","E2E Tests (chromium)","Performance Audit (desktop)","Performance Audit (mobile)"]}' \
  --field enforce_admins=false \
  --field required_pull_request_reviews='{"required_approving_review_count":1,"dismiss_stale_reviews":true,"require_code_owner_reviews":true}' \
  --field restrictions=null \
  --field allow_force_pushes=false \
  --field allow_deletions=false
```

### Method 3: Repository Configuration Script

Use the provided script to configure branch protection programmatically:

```bash
# Run the branch protection configuration script
pnpm run configure:branch-protection
```

## Status Check Behaviors

### Consolidated Required Checks

**Advantages:**

- ✅ Small required-check set that mirrors real workflow gates
- ✅ Stable naming that matches current CI/E2E/performance job names
- ✅ Clear ownership of each gate by workflow
- ✅ Easier to manage and understand

**Status States:**

- `success` - The associated workflow gate passed
- `failure` - One or more upstream jobs failed
- `pending` - The gate is still evaluating

### Individual Status Checks

**Advantages:**

- ✅ Granular visibility into specific failures
- ✅ Can selectively bypass specific test types if needed
- ✅ Better for debugging which specific tests failed

**Considerations:**

- ⚠️ Requires managing multiple required checks
- ⚠️ More complex PR status interface
- ⚠️ Potential for configuration drift

## Testing Configuration

To verify your branch protection configuration:

1. **Create a test PR** with intentional test failures
2. **Verify status checks appear** in the PR interface
3. **Confirm merge is blocked** until all checks pass
4. **Test bypass permissions** (for repository admins)

## Troubleshooting

### Status Check Not Appearing

1. **Verify workflow names** match exactly in branch protection settings
2. **Check workflow triggers** include `pull_request` events
3. **Ensure workflows run** on the target branch
4. **Verify permissions** for status check creation

### Status Check Always Pending

1. **Check workflow execution** in Actions tab
2. **Verify API tokens** have sufficient permissions
3. **Review workflow logs** for errors
4. **Confirm context names** match configuration

### False Positive/Negative Status

1. **Review status check logic** in workflow files
2. **Verify all dependencies** are properly configured
3. **Check workflow conditions** and triggers
4. **Test manually** with workflow_dispatch

## Maintenance

### Regular Tasks

1. **Review status check names** when workflows change
2. **Update required checks** as testing strategy evolves
3. **Monitor workflow performance** and execution times
4. **Validate protection rules** remain effective

### When to Update

- Adding new test suites or workflows
- Changing workflow names or job names
- Modifying testing strategy or requirements
- Repository reorganization or refactoring

## Best Practices

### Configuration

- Use unified status check for simplicity
- Require up-to-date branches before merge
- Enable branch protection for all contributors including admins
- Configure appropriate reviewer requirements

### Workflow Design

- Keep status check jobs lightweight and fast
- Provide clear success/failure messaging
- Include links to detailed test results
- Use consistent naming conventions

### Monitoring

- Regularly review failed status checks
- Monitor workflow execution times
- Track false positive/negative rates
- Gather developer feedback on workflow effectiveness

## Related Documentation

- [GitHub Branch Protection Rules](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/defining-the-mergeability-of-pull-requests/about-protected-branches)
- [GitHub Status Checks API](https://docs.github.com/en/rest/commits/statuses)
- [Testing Documentation](./TESTING.md)
- [CI/CD Workflows](./.github/workflows/)
