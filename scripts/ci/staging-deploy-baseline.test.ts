import { expect, test } from 'bun:test'
import {
  baselineFailureCode,
  configuredServiceIds,
  createGitHubApi,
  deriveActivationSha,
  resolveBefore,
} from './staging-deploy-baseline.mjs'

const sha = (n: number) => n.toString(16).padStart(40, '0')
const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const B = sha(10),
  A = sha(20),
  C = sha(90)
const run = (id: number, head: string, attempt = 1) => ({
  id,
  path: '.github/workflows/ci.yml',
  head_sha: head,
  head_branch: 'staging',
  event: 'push',
  status: 'completed',
  conclusion: 'success',
  run_attempt: attempt,
})
const jobs = (r: ReturnType<typeof run>, completed = '2026-10-20T12:00:00Z') => [
  {
    id: r.id * 10 + 1,
    name: 'ci',
    run_id: r.id,
    head_sha: r.head_sha,
    run_attempt: r.run_attempt,
    status: 'completed',
    conclusion: 'success',
    completed_at: completed,
  },
  {
    id: r.id * 10 + 2,
    name: 'deploy-staging',
    run_id: r.id,
    head_sha: r.head_sha,
    run_attempt: r.run_attempt,
    status: 'completed',
    conclusion: 'success',
    completed_at: completed,
  },
]
function fixture() {
  const bootstrapRun = run(101, B)
  const ctx = {
    eventName: 'push',
    beforeInput: '',
    repository: 'informach/sistema-zero',
    currentSha: C,
    currentRunId: 999,
    activationSha: A,
    configuredServices: { svc: uuid(1) },
    bootstrap: {
      version: 1,
      headSha: B,
      ci: { runId: 101, attempt: 1, jobId: 1012 },
      coverage: {
        ciServices: ['svc'],
        extraServices: [] as string[],
        ciReceiptSha256: 'a'.repeat(64),
      },
      ready: {
        receiptSha256: 'b'.repeat(64),
        services: [
          {
            name: 'svc',
            serviceId: uuid(1),
            deploymentId: uuid(2),
            commitSha: B,
            status: 'SUCCESS',
          },
        ],
      },
    },
  }
  const runs = new Map([[101, bootstrapRun]])
  const jobPages = new Map([[101, jobs(bootstrapRun)]])
  let calls = 0
  const deps = {
    async getRun(id: number) {
      calls++
      return runs.get(id)
    },
    async listRuns(
      _page: number,
    ): Promise<{ runs: ReturnType<typeof run>[]; nextPage: number | null }> {
      calls++
      return { runs: [], nextPage: null }
    },
    async listJobs(
      id: number,
      _attempt: number,
      _page: number,
    ): Promise<{
      jobs: ReturnType<typeof jobs>
      nextPage: number | null
    }> {
      calls++
      return { jobs: jobPages.get(id) ?? [], nextPage: null }
    },
    async isAncestor(a: string, b: string) {
      calls++
      return BigInt(`0x${a}`) <= BigInt(`0x${b}`)
    },
  }
  const add = (id: number, head: string, completed?: string) => {
    const r = run(id, head)
    runs.set(id, r)
    jobPages.set(id, jobs(r, completed))
    return r
  }
  return { ctx, deps, runs, jobPages, add, calls: () => calls }
}

test('dispatch preserves before contract, including empty input, without consulting any dependency', async () => {
  for (const beforeInput of ['', sha(7), 'custom-existing-dispatch-value']) {
    const f = fixture()
    const ctx = { ...f.ctx, eventName: 'workflow_dispatch', beforeInput, bootstrap: null }
    expect(await resolveBefore(ctx, f.deps)).toEqual({ before: beforeInput, source: 'dispatch' })
    expect(f.calls()).toBe(0)
  }
})

test('safe adapter failure category survives the baseline boundary without raw response details', async () => {
  const f = fixture()
  const api = createGitHubApi(
    'example/project',
    'synthetic-token',
    async () => new Response(JSON.stringify({ id: 1, full_name: 'private-response-marker' })),
  )
  f.deps.getRun = api.getRun
  const error = await resolveBefore(f.ctx, f.deps).catch((error) => error)
  expect(baselineFailureCode(error)).toBe('github-repository')
  expect(error.message).not.toContain('private-response-marker')
  expect(error.message).not.toContain('synthetic-token')
})

test('verified bootstrap is used when no later eligible deployment exists', async () => {
  const f = fixture()
  expect(await resolveBefore(f.ctx, f.deps)).toMatchObject({ before: B, source: 'bootstrap' })
})

test('serviço criado depois do bootstrap histórico usa identidade fixa sem inventar histórico', async () => {
  for (const [name, id] of [
    ['arquipelago-api', 'ee19a264-7708-471a-adf9-c9db1cfdb9a2'],
    ['palco-gravacao', 'a9c67d3c-9880-4707-bb16-22a5e7a52c30'],
  ] as const) {
    const f = fixture()
    Object.assign(f.ctx.configuredServices, { [name]: id })
    expect(await resolveBefore(f.ctx, f.deps)).toMatchObject({ before: B, source: 'bootstrap' })
    Object.assign(f.ctx.configuredServices, { [name]: uuid(42) })
    await expect(resolveBefore(f.ctx, f.deps)).rejects.toThrow('identity diverged')
  }
})

test('service map parses actual Bash body and adds only configured optional services', () => {
  const text = `declare -A SVC_ID=(\n [svc]=${uuid(1)}\n [other-app]=${uuid(3)}\n)`
  expect(configuredServiceIds(text, {})).toEqual({ svc: uuid(1), 'other-app': uuid(3) })
  expect(
    configuredServiceIds(text, {
      HELPDESK_SERVICE_ID: uuid(4),
      HELPDESK_APP_SERVICE_ID: uuid(5),
      LIVE_RECORDER_SERVICE_ID: uuid(6),
    }),
  ).toEqual({
    svc: uuid(1),
    'other-app': uuid(3),
    helpdesk: uuid(4),
    'helpdesk-app': uuid(5),
    'live-recorder': uuid(6),
  })
  expect(() => configuredServiceIds('no map', {})).toThrow()
  expect(() => configuredServiceIds('declare -A SVC_ID=( [svc]=bad )', {})).toThrow()
  expect(() => configuredServiceIds(text, { HELPDESK_SERVICE_ID: 'bad' })).toThrow()
})

test('activation comes from the unique Git addition of the actual epoch file', async () => {
  let args: string[] = []
  expect(
    await deriveActivationSha(C, (value: string[]) => {
      args = value
      return `${A}\n`
    }),
  ).toBe(A)
  expect(args[0]).toBe('log')
  expect(args).toContain('--diff-filter=A')
  expect(args).toContain(C)
  expect(args.slice(-2)).toEqual(['--', '.github/staging-deploy-epoch-v1.json'])
  for (const output of ['', 'FACE', `${A}\n${B}\n`]) {
    await expect(
      Promise.resolve().then(() => deriveActivationSha(C, () => output)),
    ).rejects.toThrow()
  }
})

const holes: Array<[string, (f: ReturnType<typeof fixture>) => void]> = [
  [
    'bootstrap from another workflow',
    (f) => {
      f.runs.get(101)!.path = '.github/workflows/other.yml'
    },
  ],
  [
    'wrong receipt hash',
    (f) => {
      f.ctx.bootstrap.coverage.ciReceiptSha256 = 'bad'
    },
  ],
  [
    'missing coverage',
    (f) => {
      f.ctx.bootstrap.coverage.ciServices = []
    },
  ],
  [
    'duplicate coverage',
    (f) => {
      f.ctx.bootstrap.coverage.ciServices.push('svc')
    },
  ],
  [
    'unknown covered service',
    (f) => {
      f.ctx.bootstrap.coverage.ciServices.push('unknown')
    },
  ],
  [
    'missing ready service',
    (f) => {
      f.ctx.bootstrap.ready.services = []
    },
  ],
  [
    'duplicate ready service',
    (f) => {
      f.ctx.bootstrap.ready.services.push({ ...f.ctx.bootstrap.ready.services[0]! })
    },
  ],
  [
    'invalid ready receipt',
    (f) => {
      f.ctx.bootstrap.ready.receiptSha256 = ''
    },
  ],
  [
    'wrong service identity',
    (f) => {
      f.ctx.bootstrap.ready.services[0]!.serviceId = uuid(9)
    },
  ],
  [
    'wrong ready commit',
    (f) => {
      f.ctx.bootstrap.ready.services[0]!.commitSha = sha(11)
    },
  ],
  [
    'unsuccessful ready deployment',
    (f) => {
      f.ctx.bootstrap.ready.services[0]!.status = 'FAILED'
    },
  ],
  [
    'bootstrap CI job mismatch',
    (f) => {
      f.ctx.bootstrap.ci.jobId = 12345
    },
  ],
  [
    'bootstrap latest attempt mismatch',
    (f) => {
      f.runs.get(101)!.run_attempt = 2
    },
  ],
  [
    'bootstrap run head mismatch',
    (f) => {
      f.runs.get(101)!.head_sha = sha(11)
    },
  ],
  [
    'bootstrap CI failed',
    (f) => {
      f.jobPages.get(101)![0]!.conclusion = 'failure'
    },
  ],
  [
    'bootstrap deployment skipped',
    (f) => {
      f.jobPages.get(101)![1]!.conclusion = 'skipped'
    },
  ],
  [
    'missing bootstrap CI job',
    (f) => {
      f.jobPages.get(101)!.shift()
    },
  ],
  [
    'duplicate bootstrap deploy job',
    (f) => {
      f.jobPages.get(101)!.push({ ...f.jobPages.get(101)![1]! })
    },
  ],
  [
    'bootstrap not ancestor',
    (f) => {
      f.deps.isAncestor = async (a) => a !== B
    },
  ],
  [
    'activation not ancestor',
    (f) => {
      f.deps.isAncestor = async (a) => a !== A
    },
  ],
]
for (const [label, breakFixture] of holes) {
  test(`bootstrap fails closed: ${label}`, async () => {
    const f = fixture()
    breakFixture(f)
    await expect(resolveBefore(f.ctx, f.deps)).rejects.toThrow()
  })
}

for (const jobName of ['ci', 'deploy-staging']) {
  for (const runId of [undefined, 9999]) {
    test(`same run identity is required: ${jobName} run_id=${runId}`, async () => {
      const f = fixture()
      Object.assign(f.jobPages.get(101)!.find((job) => job.name === jobName)!, { run_id: runId })
      await expect(resolveBefore(f.ctx, f.deps)).rejects.toThrow()
    })
  }
}

test('extra service coverage needs its receipt and the same complete ready evidence', async () => {
  const f = fixture()
  Object.assign(f.ctx.configuredServices, { extra: uuid(3) })
  f.ctx.bootstrap.coverage.extraServices = ['extra']
  f.ctx.bootstrap.ready.services.push({
    name: 'extra',
    serviceId: uuid(3),
    deploymentId: uuid(4),
    commitSha: B,
    status: 'SUCCESS',
  })
  await expect(resolveBefore(f.ctx, f.deps)).rejects.toThrow()
  Object.assign(f.ctx.bootstrap.coverage, { extraReceiptSha256: 'c'.repeat(64) })
  expect(await resolveBefore(f.ctx, f.deps)).toMatchObject({ before: B, source: 'bootstrap' })
})

test('complete pagination chooses greatest deployment completion, not run order or run creation', async () => {
  const f = fixture()
  const old = f.add(201, sha(40), '2026-10-20T13:00:00Z')
  const winner = f.add(202, sha(50), '2026-10-20T15:00:00Z')
  const newerRun = f.add(203, sha(60), '2026-10-20T14:00:00Z')
  f.deps.listRuns = async (page) =>
    page === 1 ? { runs: [newerRun, old], nextPage: 2 } : { runs: [winner], nextPage: null }
  const original = f.deps.listJobs
  f.deps.listJobs = async (id, attempt, page) =>
    id === 202
      ? page === 1
        ? { jobs: [f.jobPages.get(id)![0]!], nextPage: 2 }
        : { jobs: [f.jobPages.get(id)![1]!], nextPage: null }
      : original(id, attempt, page)
  expect(await resolveBefore(f.ctx, f.deps)).toMatchObject({
    before: winner.head_sha,
    source: 'ci-deploy',
    runId: 202,
    attempt: 1,
    jobId: 2022,
  })
})

test('current run, dispatch, nonancestor, and preactivation candidates never become baseline', async () => {
  const f = fixture()
  const current = f.add(999, C),
    dispatch = f.add(201, sha(40))
  dispatch.event = 'workflow_dispatch'
  const oldEpoch = f.add(202, sha(15)),
    offBranch = f.add(203, sha(95))
  f.deps.listRuns = async () => ({ runs: [current, dispatch, oldEpoch, offBranch], nextPage: null })
  expect(await resolveBefore(f.ctx, f.deps)).toMatchObject({ before: B, source: 'bootstrap' })
})

test('successful CI with failed or skipped deployment cannot replace verified bootstrap', async () => {
  for (const conclusion of ['failure', 'skipped', 'cancelled']) {
    const f = fixture(),
      r = f.add(201, sha(40))
    f.jobPages.get(201)![1]!.conclusion = conclusion
    f.deps.listRuns = async () => ({ runs: [r], nextPage: null })
    expect(await resolveBefore(f.ctx, f.deps)).toMatchObject({ before: B, source: 'bootstrap' })
  }
})

for (const defect of [
  'missing-ci',
  'missing-deploy',
  'duplicate-ci',
  'wrong-attempt',
  'wrong-head',
  'bad-date',
]) {
  test(`eligible candidate metadata fails closed: ${defect}`, async () => {
    const f = fixture(),
      r = f.add(201, sha(40)),
      records = f.jobPages.get(201)!
    if (defect === 'missing-ci') records.shift()
    if (defect === 'missing-deploy') records.pop()
    if (defect === 'duplicate-ci') records.push({ ...records[0]! })
    if (defect === 'wrong-attempt') records[1]!.run_attempt = 2
    if (defect === 'wrong-head') records[1]!.head_sha = sha(41)
    if (defect === 'bad-date') records[1]!.completed_at = 'not-a-date'
    f.deps.listRuns = async () => ({ runs: [r], nextPage: null })
    await expect(resolveBefore(f.ctx, f.deps)).rejects.toThrow()
  })
}

for (const boundary of ['getRun', 'listRuns', 'listJobs', 'isAncestor'] as const) {
  test(`dependency error fails closed: ${boundary}`, async () => {
    const f = fixture()
    const marker = 'test-only-sensitive-marker'
    f.deps[boundary] = async () => {
      throw new Error(marker)
    }
    const failure = await resolveBefore(f.ctx, f.deps).then(
      () => null,
      (error) => error,
    )
    expect(failure).toBeInstanceOf(Error)
    expect(failure.message).toStartWith('staging baseline:')
    expect(failure.message).not.toContain(marker)
  })
}

test('a later page API error is not hidden by an already-found eligible candidate', async () => {
  const f = fixture(),
    candidate = f.add(201, sha(40))
  f.deps.listRuns = async (page) => {
    if (page === 2) throw new Error('synthetic second page failure')
    return { runs: [candidate], nextPage: 2 }
  }
  await expect(resolveBefore(f.ctx, f.deps)).rejects.toThrow()
})

test('malformed pagination is rejected rather than silently truncating evidence', async () => {
  for (const nextPage of [0, -1, 1, 1.5]) {
    const f = fixture()
    f.deps.listRuns = async () => ({ runs: [], nextPage })
    await expect(resolveBefore(f.ctx, f.deps)).rejects.toThrow()
  }
  for (const response of [null, {}, { runs: null, nextPage: null }, { runs: [], nextPage: '2' }]) {
    const f = fixture()
    // Exercise untrusted API payloads rather than TypeScript's valid-page contract.
    Object.assign(f.deps, { listRuns: async () => response })
    await expect(resolveBefore(f.ctx, f.deps)).rejects.toThrow()
  }
})

test('malformed candidate job page cannot silently fall back to bootstrap', async () => {
  const f = fixture(),
    r = f.add(201, sha(40))
  f.deps.listRuns = async () => ({ runs: [r], nextPage: null })
  const original = f.deps.listJobs
  Object.assign(f.deps, {
    listJobs: async (id: number, attempt: number, page: number) =>
      id === 101 ? original(id, attempt, page) : { jobs: null, nextPage: null },
  })
  await expect(resolveBefore(f.ctx, f.deps)).rejects.toThrow()
})

test('unknown ready service cannot impersonate configured coverage through two undefined IDs', async () => {
  const f = fixture()
  Object.assign(f.ctx.bootstrap.ready.services[0]!, { name: 'unknown', serviceId: undefined })
  await expect(resolveBefore(f.ctx, f.deps)).rejects.toThrow()
})

test('configured service IDs must be UUIDs even when the ready receipt repeats them', async () => {
  const f = fixture()
  f.ctx.configuredServices.svc = 'invalid-id'
  f.ctx.bootstrap.ready.services[0]!.serviceId = 'invalid-id'
  await expect(resolveBefore(f.ctx, f.deps)).rejects.toThrow()
})

test('two configured names cannot use the same service ID even with complete named receipts', async () => {
  const f = fixture()
  Object.assign(f.ctx.configuredServices, { duplicate: uuid(1) })
  f.ctx.bootstrap.coverage.ciServices.push('duplicate')
  f.ctx.bootstrap.ready.services.push({
    ...f.ctx.bootstrap.ready.services[0]!,
    name: 'duplicate',
    deploymentId: uuid(3),
  })
  await expect(resolveBefore(f.ctx, f.deps)).rejects.toThrow()
})

for (const resource of ['runs', 'jobs'] as const) {
  test(`${resource}: changing totalCount between pages fails despite a matching final count`, async () => {
    const f = fixture()
    if (resource === 'runs') {
      const ignored = f.add(201, sha(40))
      ignored.event = 'workflow_dispatch'
      f.deps.listRuns = async (page) =>
        page === 1
          ? { runs: [f.add(999, C)], nextPage: 2, totalCount: 3 }
          : { runs: [ignored], nextPage: null, totalCount: 2 }
    } else {
      const records = f.jobPages.get(101)!
      f.deps.listJobs = async (_id, _attempt, page) =>
        page === 1
          ? { jobs: [records[0]!], nextPage: 2, totalCount: 3 }
          : { jobs: [records[1]!], nextPage: null, totalCount: 2 }
    }
    await expect(resolveBefore(f.ctx, f.deps)).rejects.toThrow()
  })
  test(`${resource}: skipping a pagination page cannot claim complete evidence`, async () => {
    const f = fixture()
    if (resource === 'runs') {
      f.deps.listRuns = async (page) => ({ runs: [], nextPage: page === 1 ? 3 : null })
    } else {
      const records = f.jobPages.get(101)!
      f.deps.listJobs = async (_id, _attempt, page) => ({
        jobs: [records[page === 1 ? 0 : 1]!],
        nextPage: page === 1 ? 3 : null,
      })
    }
    await expect(resolveBefore(f.ctx, f.deps)).rejects.toThrow()
  })
}
