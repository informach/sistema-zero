import { expect, test } from 'bun:test'
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { configuredServiceIds, resolveBefore } from './staging-deploy-baseline.mjs'

test('resolved successful baseline retains the failed-push backlog in the actual Bash selector', async () => {
  // Entirely synthetic history and receipts. This is not a real bootstrap attestation.
  const directory = mkdtempSync(join(tmpdir(), 'staging-backlog-control-'))
  const workflow = readFileSync('.github/workflows/ci.yml', 'utf8')
  const start = workflow.indexOf('          declare -A SVC_ID=(')
  const end = workflow.indexOf('          ARQUIPELAGO_STATE=', start)
  expect(start).toBeGreaterThan(0)
  expect(end).toBeGreaterThan(start)
  const selector = workflow.slice(start, end)
  // Never run deployment or provider functions; refuse if that boundary changes.
  expect(selector).not.toMatch(
    /RAILWAY_TOKEN|RAILWAY_SSH_|serviceInstanceDeployV2|(^|\n)\s*(curl|node|ssh|railway|gql|disparar|esperar)\b/,
  )
  const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
  const optionalIds = {
    HELPDESK_SERVICE_ID: uuid(1),
    HELPDESK_APP_SERVICE_ID: uuid(2),
    LIVE_RECORDER_SERVICE_ID: uuid(3),
  }
  const configured = configuredServiceIds(workflow, optionalIds)
  // Os nomes vêm da fotografia histórica. IDs, execuções e recibos abaixo continuam sintéticos.
  const coverage = JSON.parse(
    readFileSync('.github/staging-deploy-bootstrap-v1.json', 'utf8'),
  ).coverage
  const historicalNames = new Set([...coverage.ciServices, ...coverage.extraServices])
  const historical = Object.fromEntries(
    Object.entries(configured).filter(([name]) => historicalNames.has(name)),
  )
  const childEnv = {
    PATH: process.env.PATH ?? process.env.Path,
    SYSTEMROOT: process.env.SYSTEMROOT,
    TEMP: process.env.TEMP,
    TMP: process.env.TMP,
    GIT_AUTHOR_NAME: 'Test',
    GIT_AUTHOR_EMAIL: 'test@example.invalid',
    GIT_COMMITTER_NAME: 'Test',
    GIT_COMMITTER_EMAIL: 'test@example.invalid',
  }
  const git = (args: string[]) => {
    const child = spawnSync('git', args, {
      cwd: directory,
      env: childEnv,
      encoding: 'utf8',
      timeout: 10_000,
      windowsHide: true,
    })
    if (child.error || child.status !== 0) throw new Error('synthetic Git control failed')
    return child.stdout.trim()
  }
  const commit = (path: string) => {
    mkdirSync(dirname(join(directory, path)), { recursive: true })
    writeFileSync(join(directory, path), 'synthetic diff fixture\n')
    git(['add', path])
    git(['-c', 'commit.gpgsign=false', 'commit', '--quiet', '-m', 'synthetic fixture'])
    return git(['rev-parse', 'HEAD'])
  }
  try {
    git(['init', '--quiet'])
    const baseline = commit('baseline.txt')
    commit('packages/hub/src/backlog.ts')
    const failedPush = commit('bun.lock')
    const current = commit('packages/admin/src/latest.ts')
    const run = {
      id: 101,
      run_attempt: 1,
      path: '.github/workflows/ci.yml',
      head_sha: baseline,
      event: 'push',
      head_branch: 'staging',
      status: 'completed',
      conclusion: 'success',
    }
    const result = await resolveBefore(
      {
        eventName: 'push',
        currentSha: current,
        currentRunId: 999,
        activationSha: baseline,
        configuredServices: configured,
        bootstrap: {
          version: 1,
          headSha: baseline,
          ci: { runId: 101, attempt: 1, jobId: 102 },
          coverage: {
            ciServices: Object.keys(historical),
            extraServices: [],
            ciReceiptSha256: 'a'.repeat(64),
          },
          ready: {
            receiptSha256: 'b'.repeat(64),
            services: Object.entries(historical).map(([name, serviceId], index) => ({
              name,
              serviceId,
              deploymentId: uuid(100 + index),
              commitSha: baseline,
              status: 'SUCCESS',
            })),
          },
        },
      },
      {
        getRun: async () => run,
        listRuns: async () => ({ runs: [], nextPage: null, totalCount: 0 }),
        listJobs: async () => ({
          jobs: ['ci', 'deploy-staging'].map((name, index) => ({
            id: 101 + index,
            name,
            run_id: run.id,
            run_attempt: 1,
            head_sha: baseline,
            status: 'completed',
            conclusion: 'success',
            completed_at: '2026-10-20T12:00:00Z',
          })),
          nextPage: null,
          totalCount: 2,
        }),
        isAncestor: async (older: string, newer: string) => {
          git(['merge-base', '--is-ancestor', older, newer])
          return true
        },
      },
    )
    const select = (before: string, event = 'push', forced = '') => {
      const script = `set -euo pipefail\n${selector.replaceAll(`\${{ github.event_name }}`, event)}\nprintf '__SERVICE__%s\\n' "\${!WANT[@]}"\n`
      const bash = process.platform === 'win32' ? 'C:/Program Files/Git/bin/bash.exe' : 'bash'
      const child = spawnSync(bash, ['--noprofile', '--norc', '-s'], {
        cwd: directory,
        env: { ...childEnv, ...optionalIds, BEFORE: before, GITHUB_SHA: current, FORCED: forced },
        input: script,
        encoding: 'utf8',
        timeout: 10_000,
        windowsHide: true,
      })
      if (child.error || child.status !== 0)
        throw new Error('read-only Bash selector control failed')
      return child.stdout
        .split(/\r?\n/)
        .filter((line) => line.startsWith('__SERVICE__'))
        .map((line) => line.slice('__SERVICE__'.length))
        .sort()
    }
    expect(select(failedPush)).toEqual(['admin'])
    expect(result.before).toBe(baseline)
    expect(select(result.before)).toEqual(Object.keys(configured).sort())
    expect(select(result.before)).toHaveLength(20)
    expect(select(result.before)).toContain('palco-gravacao')
    expect(select(failedPush, 'workflow_dispatch', 'all')).toHaveLength(20)
    expect(select(failedPush, 'workflow_dispatch', 'hub,funnel')).toEqual(['funnel', 'hub'])
    expect(select(baseline, 'workflow_dispatch', 'auto')).toHaveLength(20)
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
  // This integration control starts real Git/Bash processes repeatedly, including
  // on Windows. Keep a finite outer budget instead of Bun's 5 s unit-test default.
}, 30_000)
