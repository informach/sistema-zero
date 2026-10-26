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

test.each([
  'success',
  'retirement-failure',
  'dispatch-failure',
])('staging commercial barrier executes the workflow shell: %s', (scenario) => {
  const start = deploy.indexOf('          COMMERCIAL=()')
  const end = deploy.indexOf(`          for s in "\${!WANT[@]}"; do disparar`, start)
  expect(start).toBeGreaterThan(0)
  expect(end).toBeGreaterThan(start)
  const barrier = deploy.slice(start, end)
  const shell = process.platform === 'win32' ? 'C:/Program Files/Git/bin/bash.exe' : 'bash'
  const child = spawnSync(
    shell,
    [
      '--noprofile',
      '--norc',
      '-c',
      `
set -euo pipefail
declare -A WANT=([admin]=1 [catalog]=1 [payments]=1 [referrals]=1)
declare -A DEP=()
disparar() {
  echo "POST-$1"
  if [ "$CASE" = dispatch-failure ] && [ "$1" = payments ]; then return 1; fi
  DEP[$1]="$1-id"
}
esperar() {
  for service in "$@"; do echo "REMOVED-$service"; done
  if [ "$CASE" = retirement-failure ]; then return 1; fi
}
${barrier}
for service in "\${!WANT[@]}"; do disparar "$service"; done
`,
    ],
    {
      encoding: 'utf8',
      windowsHide: true,
      timeout: 10_000,
      env: { ...process.env, CASE: scenario },
    },
  )
  expect(child.error).toBeUndefined()
  const events = child.stdout.trim().split(/\r?\n/)
  expect(events).toContain('REMOVED-catalog')
  if (scenario === 'success') {
    expect(child.status, child.stderr).toBe(0)
    for (const service of ['catalog', 'payments', 'referrals']) {
      expect(events.indexOf(`REMOVED-${service}`)).toBeLessThan(events.indexOf('POST-admin'))
      expect(events.filter((event) => event === `POST-${service}`)).toHaveLength(1)
    }
  } else {
    expect(child.status).toBe(1)
    expect(events).not.toContain('POST-admin')
    if (scenario === 'dispatch-failure') expect(events).not.toContain('POST-referrals')
  }
})

test('CI and deployment budgets preserve individual proofs and other job deadlines', () => {
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
    ci: 60,
    'studio-python-extensions': 15,
    'studio-storage-macos': 15,
    'desktop-windows': 20,
    'community-kids-e2e': 20,
    'studio-e2e-chromium': 30,
    'studio-e2e-firefox': 20,
    'studio-e2e-webkit': 20,
    'members-image': 25,
  })
  expect(deploy).toContain('needs: [ci, studio-python-extensions,')
  expect(
    jobs.ci!.steps.find(
      (step) => step.name === 'Verificar cancelamento Python por RPC no runtime real',
    )?.['timeout-minutes'],
  ).toBe(2)
  expect(
    jobs.ci!.steps.find(
      (step) => step.name === 'Provar objetivos Python com programas reais no sandbox sem rede',
    )?.['timeout-minutes'],
  ).toBe(8)
  expect(
    jobs.ci!.steps.find(
      (step) => step.name === 'Provar objetivos Jogo 3D e three.js no sandbox sem rede',
    )?.['timeout-minutes'],
  ).toBe(5)
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
