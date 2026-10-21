import { expect, test } from 'bun:test'
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  configuredServiceIds,
  createGitHubApi,
  deriveActivationSha,
} from './staging-deploy-baseline.mjs'

const response = (body: unknown, link = '', status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { link } })
const repository = 'example/project'
const prefix = `https://api.github.com/repos/${repository}/actions/`

test('GitHub adapter uses exact-attempt jobs and bounded read-only authenticated requests', async () => {
  const requests: Array<{ url: string; options: RequestInit }> = []
  const api = createGitHubApi(
    repository,
    'synthetic-test-token',
    async (url: string, options: RequestInit) => {
      requests.push({ url, options })
      return response({ jobs: [{ id: 10 }], total_count: 1 })
    },
  )
  expect(await api.listJobs(123, 2, 1)).toEqual({
    jobs: [{ id: 10 }],
    totalCount: 1,
    nextPage: null,
  })
  expect(requests[0]!.url).toBe(`${prefix}runs/123/attempts/2/jobs?per_page=100&page=1`)
  expect(requests[0]!.options.method).toBeUndefined()
  expect(requests[0]!.options.redirect).toBe('error')
  expect(requests[0]!.options.signal).toBeInstanceOf(AbortSignal)
})

test('GitHub adapter follows validated next-page metadata without changing repository', async () => {
  const next = `${prefix}workflows/ci.yml/runs?branch=staging&event=push&per_page=100&page=2`
  const api = createGitHubApi(repository, 'synthetic-test-token', async () =>
    response({ workflow_runs: [{ id: 1 }], total_count: 2 }, `<${next}>; rel="next"`),
  )
  expect(await api.listRuns(1)).toEqual({ runs: [{ id: 1 }], totalCount: 2, nextPage: 2 })
})

for (const defect of [
  'http',
  'network',
  'json',
  'count',
  'cross-origin',
  'wrong-path',
  'nonadvancing',
  'malformed-link',
  'malformed-with-next',
  'duplicate-next',
]) {
  test(`GitHub adapter refuses ${defect} without exposing response or token`, async () => {
    const marker = 'synthetic-private-response-marker'
    const api = createGitHubApi(repository, 'synthetic-test-token', async () => {
      if (defect === 'network') throw new Error(marker)
      if (defect === 'http') return response({ marker }, '', 403)
      if (defect === 'json') return new Response(marker)
      if (defect === 'count') return response({ jobs: [{ id: 1 }], total_count: 0 })
      const links: Record<string, string> = {
        'cross-origin': '<https://evil.invalid/runs?page=2>; rel="next"',
        'wrong-path': `<${prefix}runs/another?page=2>; rel="next"`,
        nonadvancing: `<${prefix}runs/1/attempts/1/jobs?page=1>; rel="next"`,
        'malformed-link': marker,
        'malformed-with-next': `<${prefix}runs/1/attempts/1/jobs?page=2>; rel="next", malformed`,
        'duplicate-next': `<${prefix}runs/1/attempts/1/jobs?page=2>; rel="next", <${prefix}runs/1/attempts/1/jobs?page=3>; rel="next"`,
      }
      return response({ jobs: [], total_count: 0 }, links[defect])
    })
    const error = await api.listJobs(1, 1, 1).then(
      () => null,
      (error) => error,
    )
    expect(error).toBeInstanceOf(Error)
    expect(error.message).not.toContain(marker)
    expect(error.message).not.toContain('synthetic-test-token')
  })
}

test('actual checked-in workflow service map is accepted without provider access', () => {
  const ids = configuredServiceIds(readFileSync('.github/workflows/ci.yml', 'utf8'))
  expect(Object.keys(ids)).toHaveLength(15)
  expect(ids.members).toBe('aa282801-ffba-477c-af6d-394b2f4f9af9')
})

test('real temporary Git history derives the epoch introduction without embedding its own SHA', () => {
  const directory = mkdtempSync(join(tmpdir(), 'staging-epoch-test-'))
  const git = (args: string[]) => {
    const result = spawnSync('git', args, {
      cwd: directory,
      encoding: 'utf8',
      timeout: 10_000,
      windowsHide: true,
      env: {
        ...process.env,
        GIT_AUTHOR_NAME: 'Test',
        GIT_AUTHOR_EMAIL: 'test@example.invalid',
        GIT_COMMITTER_NAME: 'Test',
        GIT_COMMITTER_EMAIL: 'test@example.invalid',
      },
    })
    if (result.error || result.status !== 0) throw new Error('temporary Git control failed')
    return result.stdout
  }
  try {
    git(['init', '--quiet'])
    mkdirSync(join(directory, '.github'))
    writeFileSync(join(directory, '.github/staging-deploy-epoch-v1.json'), '{"version":1}\n')
    git(['add', '.github/staging-deploy-epoch-v1.json'])
    git(['-c', 'commit.gpgsign=false', 'commit', '--quiet', '-m', 'introduce epoch'])
    const activation = git(['rev-parse', 'HEAD']).trim()
    git(['-c', 'commit.gpgsign=false', 'commit', '--quiet', '--allow-empty', '-m', 'later push'])
    const head = git(['rev-parse', 'HEAD']).trim()
    expect(head).not.toBe(activation)
    expect(deriveActivationSha(head, git)).toBe(activation)
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})
