import { expect, test } from 'bun:test'
import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import {
  STAGING_DEPLOYMENT_TIMEOUT_MS,
  STAGING_ROLLOUT_TIMEOUT_MS,
} from './kids-journey-rollout.mjs'

const workflow = readFileSync('.github/workflows/ci.yml', 'utf8')
const { jobs } = Bun.YAML.parse(workflow) as {
  jobs: Record<
    string,
    { 'timeout-minutes': number; steps: Array<{ name: string; 'timeout-minutes'?: number }> }
  >
}
const deploy = workflow.slice(workflow.indexOf('\n  deploy-staging:'))
const resolver = resolve('scripts/ci/staging-deploy-baseline.mjs')

test('only the deployment job receives the larger wall-clock budget', () => {
  expect(STAGING_DEPLOYMENT_TIMEOUT_MS).toBe(60 * 60 * 1000)
  expect(STAGING_ROLLOUT_TIMEOUT_MS).toBe(140 * 60 * 1000)
  expect(deploy).toContain('timeout-minutes: 240')
  expect(deploy).toContain('node scripts/ci/staging-deploy-monitor.mjs "$GITHUB_SHA"')
  const monitor = readFileSync('scripts/ci/staging-deploy-monitor.mjs', 'utf8')
  expect(monitor).toContain('const deadline = now() + STAGING_DEPLOYMENT_TIMEOUT_MS')
  expect(monitor).toContain('railwayReadQuery(query, variables,')
  expect(deploy).toContain(`--connect-timeout 5 --max-time "\${2:-15}"`)
  expect(deploy).not.toContain('seq 1 60')
  expect(
    Object.fromEntries(
      Object.entries(jobs)
        .filter(([name]) => name !== 'deploy-staging')
        .map(([name, job]) => [name, job['timeout-minutes']]),
    ),
  ).toEqual({
    ci: 45,
    'studio-storage-macos': 15,
    'desktop-windows': 20,
    'community-kids-e2e': 20,
    'studio-e2e-chromium': 30,
    'studio-e2e-firefox': 20,
    'studio-e2e-webkit': 20,
    'members-image': 25,
  })
  expect(
    jobs.ci!.steps.find(
      (step) => step.name === 'Verificar cancelamento Python por RPC no runtime real',
    )?.['timeout-minutes'],
  ).toBe(2)
})

test('workflow resolves before installation, public/provider access, SSH and apply', () => {
  const resolverPosition = deploy.indexOf('run: node scripts/ci/staging-deploy-baseline.mjs')
  expect(resolverPosition).toBeGreaterThan(0)
  expect(deploy.slice(0, resolverPosition)).toContain('fetch-depth: 0')
  expect(deploy.slice(0, resolverPosition)).toContain('actions: read')
  expect(deploy.slice(0, resolverPosition)).toContain('contents: read')
  for (const boundary of [
    'oven-sh/setup-bun',
    'bun install',
    'r2:cors:public:check',
    'setup-railway',
    'kids-journey-rollout.mjs preflight',
    'railway-config.mjs plan',
    'railway-config.mjs apply',
  ]) {
    expect(deploy.indexOf(boundary)).toBeGreaterThan(resolverPosition)
  }
  expect(deploy).toContain(`BEFORE: \${{ steps.staging-baseline.outputs.before }}`)
  expect(deploy).toContain(
    `if: \${{ success() && steps.staging-baseline.outcome == 'success' && steps.staging-baseline.outputs.selector != '' }}`,
  )
  expect(deploy).not.toContain('fromJSON(')
  expect(deploy).not.toContain('github.event.before')
  expect(deploy).toContain(`FORCED: \${{ github.event.inputs.services }}`)
})

test.each([
  { label: 'empty', before: '' },
  { label: 'SHA', before: 'a'.repeat(40) },
  { label: 'multiline', before: 'existing-dispatch-value\nselector=must-remain-inside-json' },
])('real Node CLI preserves dispatch $label without Git, bootstrap or GitHub credentials', ({
  before,
}) => {
  const directory = mkdtempSync(join(tmpdir(), 'staging-dispatch-cli-'))
  try {
    const event = join(directory, 'event.json')
    const output = join(directory, 'output.txt')
    writeFileSync(event, JSON.stringify({ inputs: { services: 'auto', before_sha: before } }))
    const child = spawnSync('node', [resolver], {
      cwd: directory,
      encoding: 'utf8',
      timeout: 10_000,
      windowsHide: true,
      env: {
        ...process.env,
        GITHUB_EVENT_PATH: event,
        GITHUB_EVENT_NAME: 'workflow_dispatch',
        GITHUB_OUTPUT: output,
        GH_TOKEN: '',
        GITHUB_TOKEN: '',
      },
    })
    expect(child.status).toBe(0)
    const content = readFileSync(output, 'utf8')
    const firstNewline = content.indexOf('\n')
    expect(JSON.parse(content.slice('selector='.length, firstNewline))).toEqual({
      before,
      source: 'dispatch',
    })
    const remaining = content.slice(firstNewline + 1)
    const header = /^before<<([a-z0-9_-]+)\n/.exec(remaining)
    expect(header).not.toBeNull()
    if (!header) throw new Error('multiline output header required')
    expect(remaining).toBe(`before<<${header[1]}\n${before}\n${header[1]}\n`)
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})

test('real Node CLI refuses an unprepared push without producing a selector', () => {
  const directory = mkdtempSync(join(tmpdir(), 'staging-refusal-cli-'))
  try {
    const event = join(directory, 'event.json')
    const output = join(directory, 'output.txt')
    writeFileSync(event, '{}')
    const child = spawnSync('node', [resolver], {
      cwd: directory,
      encoding: 'utf8',
      timeout: 10_000,
      windowsHide: true,
      env: {
        ...process.env,
        GITHUB_EVENT_PATH: event,
        GITHUB_EVENT_NAME: 'push',
        GITHUB_SHA: 'a'.repeat(40),
        GITHUB_RUN_ID: '123',
        GITHUB_OUTPUT: output,
        GH_TOKEN: 'synthetic-test-token',
        GITHUB_TOKEN: '',
      },
    })
    expect(child.status).toBe(1)
    expect(child.stderr).toContain('refused before provider access')
    expect(child.stderr).toContain('[validation]')
    expect(child.stdout + child.stderr).not.toContain('synthetic-test-token')
    expect(existsSync(output)).toBe(false)
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})
