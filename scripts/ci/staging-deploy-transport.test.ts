import { expect, test } from 'bun:test'
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  baselineFailureCode,
  configuredServiceIds,
  createGitHubApi,
  deriveActivationSha,
} from './staging-deploy-baseline.mjs'

const response = (body: unknown, link = '', status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { link } })
const repository = 'example/project'
const repositoryUrl = `https://api.github.com/repos/${repository}`
const prefix = `https://api.github.com/repos/${repository}/actions/`
const canonicalPrefix = 'https://api.github.com/repositories/123/actions/'
const metadata = () => response({ id: 123, full_name: repository })

test('GitHub adapter uses exact-attempt jobs and bounded read-only authenticated requests', async () => {
  const requests: Array<{ url: string; options: RequestInit }> = []
  const api = createGitHubApi(
    repository,
    'synthetic-test-token',
    async (url: string, options: RequestInit) => {
      requests.push({ url, options })
      if (url === repositoryUrl) return metadata()
      return response({ jobs: [{ id: 10 }], total_count: 1 })
    },
  )
  expect(await api.listJobs(123, 2, 1)).toEqual({
    jobs: [{ id: 10 }],
    totalCount: 1,
    nextPage: null,
  })
  expect(requests.map(({ url }) => url)).toEqual([
    repositoryUrl,
    `${prefix}runs/123/attempts/2/jobs?per_page=100&page=1`,
  ])
  for (const { options } of requests) {
    expect(options.method).toBeUndefined()
    expect(options.redirect).toBe('error')
    expect(options.signal).toBeInstanceOf(AbortSignal)
    expect(new Headers(options.headers).get('authorization')).toBe('Bearer synthetic-test-token')
  }
  await api.listJobs(123, 2, 1)
  expect(requests.filter(({ url }) => url === repositoryUrl)).toHaveLength(1)
})

test('GitHub adapter follows validated next-page metadata without changing repository', async () => {
  const next = `${prefix}workflows/ci.yml/runs?branch=staging&event=push&per_page=100&page=2`
  const api = createGitHubApi(repository, 'synthetic-test-token', async (url: string) =>
    url === repositoryUrl
      ? metadata()
      : response({ workflow_runs: [{ id: 1 }], total_count: 2 }, `<${next}>; rel="next"`),
  )
  expect(await api.listRuns(1)).toEqual({ runs: [{ id: 1 }], totalCount: 2, nextPage: 2 })
})

test('actual GitHub numeric-repository Link is accepted only after matching repository metadata', async () => {
  // Sanitized shape observed in run39533010730: the named endpoint returns a
  // Link under /repositories/1254724087; no run bodies or credentials are kept.
  const name = 'informach/sistema-zero'
  const calls: string[] = []
  const api = createGitHubApi(name, 'synthetic-test-token', async (url: string) => {
    calls.push(url)
    if (url === `https://api.github.com/repos/${name}`)
      return response({ id: 1254724087, full_name: 'Informach/Sistema-Zero' })
    return response(
      { workflow_runs: [{ id: 1 }], total_count: 815 },
      '<https://api.github.com/repositories/1254724087/actions/workflows/ci.yml/runs?branch=staging&event=push&per_page=100&page=2>; rel="next", <https://api.github.com/repositories/1254724087/actions/workflows/ci.yml/runs?branch=staging&event=push&per_page=100&page=9>; rel="last"',
    )
  })
  expect(await api.listRuns(1)).toEqual({ runs: [{ id: 1 }], totalCount: 815, nextPage: 2 })
  expect(calls).toEqual([
    `https://api.github.com/repos/${name}`,
    `https://api.github.com/repos/${name}/actions/workflows/ci.yml/runs?branch=staging&event=push&per_page=100&page=1`,
  ])
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
    const api = createGitHubApi(repository, 'synthetic-test-token', async (url: string) => {
      if (url === repositoryUrl) return metadata()
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
    const expectedCodes: Record<string, string> = {
      http: 'github-http',
      network: 'github-unavailable',
      json: 'github-json',
      count: 'github-page',
    }
    expect(baselineFailureCode(error)).toBe(expectedCodes[defect] ?? 'github-pagination')
  })
}

for (const [defect, transform] of [
  [
    'wrong repository ID',
    (url: URL) => {
      url.pathname = url.pathname.replace('/123/', '/124/')
    },
  ],
  [
    'wrong endpoint',
    (url: URL) => {
      url.pathname = url.pathname.replace('ci.yml', 'other.yml')
    },
  ],
  [
    'wrong origin',
    (url: URL) => {
      url.hostname = 'api.example.invalid'
    },
  ],
  [
    'wrong branch',
    (url: URL) => {
      url.searchParams.set('branch', 'main')
    },
  ],
  [
    'wrong event',
    (url: URL) => {
      url.searchParams.set('event', 'workflow_dispatch')
    },
  ],
  [
    'wrong page size',
    (url: URL) => {
      url.searchParams.set('per_page', '50')
    },
  ],
  [
    'skipped page',
    (url: URL) => {
      url.searchParams.set('page', '3')
    },
  ],
  [
    'duplicate page',
    (url: URL) => {
      url.searchParams.append('page', '2')
    },
  ],
  [
    'extra query',
    (url: URL) => {
      url.searchParams.set('unexpected', 'value')
    },
  ],
  [
    'userinfo',
    (url: URL) => {
      url.username = 'someone'
    },
  ],
  [
    'fragment',
    (url: URL) => {
      url.hash = 'untrusted'
    },
  ],
] as const) {
  test(`numeric-repository Link refuses ${defect} without following it`, async () => {
    const target = new URL(
      `${canonicalPrefix}workflows/ci.yml/runs?branch=staging&event=push&per_page=100&page=2`,
    )
    transform(target)
    const requests: string[] = []
    const api = createGitHubApi(repository, 'synthetic-test-token', async (url: string) => {
      requests.push(url)
      return url === repositoryUrl
        ? metadata()
        : response({ workflow_runs: [], total_count: 0 }, `<${target}>; rel="next"`)
    })
    const error = await api.listRuns(1).catch((error) => error)
    expect(baselineFailureCode(error)).toBe('github-pagination')
    expect(requests).toEqual([
      repositoryUrl,
      `${prefix}workflows/ci.yml/runs?branch=staging&event=push&per_page=100&page=1`,
    ])
  })
}

for (const record of [
  null,
  {},
  { id: 123, full_name: 'example/other' },
  { id: 123, full_name: `${repository}/extra` },
  ...[0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1, '123'].map((id) => ({ id, full_name: repository })),
]) {
  test(`repository identity is required before Actions requests: ${JSON.stringify(record)}`, async () => {
    const calls: string[] = []
    const api = createGitHubApi(repository, 'synthetic-test-token', async (url: string) => {
      calls.push(url)
      return response(record)
    })
    expect(baselineFailureCode(await api.listRuns(1).catch((error) => error))).toBe(
      'github-repository',
    )
    expect(calls).toEqual([repositoryUrl])
  })
}

for (const defect of ['http', 'network', 'json']) {
  test(`unavailable repository metadata (${defect}) fails closed without retry or raw diagnostics`, async () => {
    const marker = 'synthetic-private-metadata-marker'
    const calls: string[] = []
    const api = createGitHubApi(repository, 'synthetic-test-token', async (url: string) => {
      calls.push(url)
      if (defect === 'network') throw new Error(marker)
      return defect === 'http' ? response({ marker }, '', 503) : new Response(marker)
    })
    const error = await api.getRun(1).catch((error) => error)
    expect(baselineFailureCode(error)).toBe(
      defect === 'http' ? 'github-http' : defect === 'json' ? 'github-json' : 'github-unavailable',
    )
    expect(error.message).not.toContain(marker)
    expect(error.message).not.toContain('synthetic-test-token')
    await api.listRuns(1).catch(() => undefined)
    expect(calls).toEqual([repositoryUrl])
  })
}

test('diagnostic codes never trust arbitrary error messages or code fields', () => {
  expect(
    baselineFailureCode(Object.assign(new Error('private marker'), { code: 'github-http' })),
  ).toBe('unexpected')
  expect(baselineFailureCode(null)).toBe('unexpected')
})

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
