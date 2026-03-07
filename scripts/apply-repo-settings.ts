import {spawnSync} from 'node:child_process'
import {readFileSync} from 'node:fs'
import process from 'node:process'

interface CommandResult {
  readonly stdout: string
  readonly stderr: string
  readonly status: number | null
}

interface RepoSettings {
  readonly defaultBranch: string
  readonly description: string
  readonly homepage: string
  readonly deleteBranchOnMerge: boolean
  readonly enableDiscussions: boolean
  readonly enableIssues: boolean
  readonly enableProjects: boolean
  readonly enableWiki: boolean
  readonly enableAutoMerge: boolean
  readonly allowUpdateBranch: boolean
  readonly enableMergeCommit: boolean
  readonly enableRebaseMerge: boolean
  readonly enableSquashMerge: boolean
}

const TARGET_REPOSITORY = process.env.TARGET_REPOSITORY ?? 'marcusrbrown/mrbro.dev'

const BASELINE_SETTINGS: Omit<RepoSettings, 'description' | 'homepage'> = {
  defaultBranch: 'main',
  deleteBranchOnMerge: true,
  enableDiscussions: false,
  enableIssues: true,
  enableProjects: true,
  enableWiki: false,
  enableAutoMerge: true,
  allowUpdateBranch: false,
  enableMergeCommit: false,
  enableRebaseMerge: false,
  enableSquashMerge: true,
}

interface PackageJson {
  readonly description?: string
  readonly homepage?: string
  readonly keywords?: readonly string[]
}

function runGhCommand(args: readonly string[]): CommandResult {
  const result = spawnSync('gh', args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  if (result.error != null) {
    throw new Error(`Failed to run gh ${args.join(' ')}: ${result.error.message}`)
  }

  return {
    stdout: result.stdout,
    stderr: result.stderr,
    status: result.status,
  }
}

function assertSuccess(commandLabel: string, result: CommandResult): void {
  if (result.status !== 0) {
    throw new Error(
      [`${commandLabel} failed with exit code ${result.status ?? 'unknown'}`, result.stderr.trim()]
        .filter(part => part.length > 0)
        .join('\n'),
    )
  }
}

function assertGhAvailable(): void {
  const versionResult = runGhCommand(['--version'])
  assertSuccess('gh --version', versionResult)
}

function assertGhAuthenticated(): void {
  const authResult = runGhCommand(['auth', 'status'])
  assertSuccess('gh auth status', authResult)
}

function toEnabledFlag(flag: string, enabled: boolean): string {
  return enabled ? flag : `${flag}=false`
}

function buildEditArguments(settings: RepoSettings): readonly string[] {
  return [
    'repo',
    'edit',
    TARGET_REPOSITORY,
    '--default-branch',
    settings.defaultBranch,
    '--description',
    settings.description,
    '--homepage',
    settings.homepage,
    toEnabledFlag('--delete-branch-on-merge', settings.deleteBranchOnMerge),
    toEnabledFlag('--enable-discussions', settings.enableDiscussions),
    toEnabledFlag('--enable-issues', settings.enableIssues),
    toEnabledFlag('--enable-projects', settings.enableProjects),
    toEnabledFlag('--enable-wiki', settings.enableWiki),
    toEnabledFlag('--enable-auto-merge', settings.enableAutoMerge),
    toEnabledFlag('--allow-update-branch', settings.allowUpdateBranch),
    toEnabledFlag('--enable-merge-commit', settings.enableMergeCommit),
    toEnabledFlag('--enable-rebase-merge', settings.enableRebaseMerge),
    toEnabledFlag('--enable-squash-merge', settings.enableSquashMerge),
  ]
}

function readKeywordsFromPackageJson(): readonly string[] {
  const packageJsonRaw = readFileSync('package.json', 'utf8')
  const parsed = JSON.parse(packageJsonRaw) as PackageJson
  const keywords = parsed.keywords ?? []
  return keywords
    .map(keyword => keyword.trim().toLowerCase())
    .filter(keyword => keyword.length > 0)
    .filter((keyword, index, all) => all.indexOf(keyword) === index)
}

function readRepoTextSettingsFromPackageJson(): Pick<RepoSettings, 'description' | 'homepage'> {
  const packageJsonRaw = readFileSync('package.json', 'utf8')
  const parsed = JSON.parse(packageJsonRaw) as PackageJson

  return {
    description: parsed.description?.trim() ?? '',
    homepage: parsed.homepage?.trim() ?? '',
  }
}

function syncTopicsFromKeywords(): void {
  const keywords = readKeywordsFromPackageJson()
  const currentTopicsResult = runGhCommand(['api', `repos/${TARGET_REPOSITORY}/topics`, '--jq', '.names[]?'])
  assertSuccess('gh api list current topics', currentTopicsResult)
  const currentTopics = currentTopicsResult.stdout
    .split('\n')
    .map(topic => topic.trim())
    .filter(topic => topic.length > 0)

  if (currentTopics.length > 0) {
    const removeArgs = ['repo', 'edit', TARGET_REPOSITORY, '--remove-topic', currentTopics.join(',')]
    const removeResult = runGhCommand(removeArgs)
    assertSuccess('gh repo edit --remove-topic <topic1,topic2,...>', removeResult)
  }

  if (keywords.length > 0) {
    const addArgs = ['repo', 'edit', TARGET_REPOSITORY, '--add-topic', keywords.join(',')]
    const addResult = runGhCommand(addArgs)
    assertSuccess('gh repo edit --add-topic <topic1,topic2,...>', addResult)
  }
}

function printVerificationSnapshot(): void {
  const query =
    '{full_name,default_branch,description,homepage,allow_auto_merge,allow_update_branch,allow_merge_commit,allow_rebase_merge,allow_squash_merge,delete_branch_on_merge,has_discussions,has_issues,has_projects,has_wiki,visibility}'
  const result = runGhCommand(['api', `repos/${TARGET_REPOSITORY}`, '--jq', query])
  assertSuccess('gh api repo snapshot', result)
  process.stdout.write(`Applied settings snapshot for ${TARGET_REPOSITORY}:\n`)
  process.stdout.write(`${result.stdout.trim()}\n`)
}

function main(): void {
  assertGhAvailable()
  assertGhAuthenticated()

  const textSettings = readRepoTextSettingsFromPackageJson()
  const desiredSettings: RepoSettings = {
    ...BASELINE_SETTINGS,
    ...textSettings,
  }

  const editArgs = buildEditArguments(desiredSettings)
  const editResult = runGhCommand(editArgs)
  assertSuccess('gh repo edit', editResult)

  syncTopicsFromKeywords()

  printVerificationSnapshot()
}

main()
