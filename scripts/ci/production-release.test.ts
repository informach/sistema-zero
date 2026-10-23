import { describe, expect, test } from 'bun:test'
import { kidsJourneyTargets, productionApplicationIds } from '../release/kids-journey-targets.mjs'
import { createRailwayPorts } from './kids-journey-rollout.mjs'
import {
  productionCiJobs,
  resolveProductionSource,
  runProductionRelease,
  selectInitialProductionApplications,
  selectProductionServices,
} from './production-release.mjs'

const sha = 'a'.repeat(40)
const headSha = 'b'.repeat(40)
const tree = 'c'.repeat(40)
const target = kidsJourneyTargets.production
const env = {
  RAILWAY_PROJECT_ID: target.project,
  RAILWAY_ENVIRONMENT_ID: target.environment,
  RAILWAY_TOKEN: 'inert-only',
  HELPDESK_SERVICE_ID: '11111111-1111-4111-8111-111111111111',
  HELPDESK_APP_SERVICE_ID: '22222222-2222-4222-8222-222222222222',
  LIVE_RECORDER_SERVICE_ID: 'a4e0c11a-03be-4ada-bd79-d8f4cdf8d3fd',
}
const ids = productionApplicationIds(env)
const plan = { environmentId: target.environment, changeSet: { changes: [] } }

function github(
  options: {
    failedJob?: string
    failedLatest?: boolean
    drift?: boolean
    differentTree?: boolean
    wrongPlan?: boolean
  } = {},
) {
  const calls: string[] = []
  const get = async (path: string) => {
    calls.push(path)
    if (path === '/commits/main')
      return { sha: options.drift ? headSha : sha, commit: { tree: { sha: tree } } }
    if (path === `/commits/${headSha}`)
      return { sha: headSha, commit: { tree: { sha: options.differentTree ? sha : tree } } }
    if (path.startsWith(`/commits/${sha}/pulls?`))
      return [
        {
          number: 42,
          merged_at: '2026-10-22T00:00:00Z',
          merge_commit_sha: sha,
          base: { ref: 'main' },
          head: { sha: headSha, repo: { full_name: 'informach/sistema-zero' } },
        },
      ]
    if (path.startsWith('/actions/workflows/ci.yml/runs?'))
      return {
        total_count: 1,
        workflow_runs: [
          {
            id: 10,
            run_attempt: 2,
            path: '.github/workflows/ci.yml',
            event: 'pull_request',
            head_sha: headSha,
            pull_requests: [{ number: 42 }],
            status: 'completed',
            conclusion: options.failedLatest ? 'failure' : 'success',
          },
        ],
      }
    if (path.startsWith('/actions/runs/10/attempts/2/jobs?'))
      return {
        total_count: 9,
        jobs: productionCiJobs.map((name) => ({
          name,
          run_id: 10,
          status: 'completed',
          conclusion: name === options.failedJob ? 'failure' : 'success',
        })),
      }
    if (path.startsWith('/actions/artifacts?'))
      return {
        total_count: 1,
        artifacts: [
          {
            id: 20,
            name: `railway-production-plan-${headSha}`,
            expired: false,
            workflow_run: { id: 30, head_sha: headSha },
          },
        ],
      }
    if (path === '/actions/runs/30')
      return {
        id: 30,
        path: '.github/workflows/railway-config.yml',
        event: 'pull_request',
        head_sha: options.wrongPlan ? sha : headSha,
        status: 'completed',
        conclusion: 'success',
      }
    throw new Error(`Unexpected inert GitHub route ${path}`)
  }
  return { get, calls }
}

describe('approved promoted source, before provider access', () => {
  test('binds all nine jobs to one successful CI attempt and the plan to the same internal PR', async () => {
    const fixture = github()
    const result = await resolveProductionSource(sha, fixture.get)
    expect(result).toMatchObject({
      sha,
      approvedHead: headSha,
      tree,
      ci: { run: 10, attempt: 2, passedJobs: 9 },
      planArtifact: { id: 20, run: 30 },
    })
    expect(fixture.calls).toContain('/actions/runs/10/attempts/2/jobs?per_page=100&page=1')
  })
  test.each([
    { drift: true },
    { differentTree: true },
    { failedJob: 'ci' },
    { failedLatest: true },
    { wrongPlan: true },
  ])('refuses source/CI/plan drift %j', async (options) => {
    await expect(resolveProductionSource(sha, github(options).get)).rejects.toThrow()
  })
  test('incomplete GitHub pagination cannot truncate a failed check out of the evidence', async () => {
    const fixture = github()
    await expect(
      resolveProductionSource(sha, async (path: string) =>
        path.includes('/jobs?') ? { total_count: 10, jobs: [] } : fixture.get(path),
      ),
    ).rejects.toThrow('Paginação')
  })
})

function wave(
  options: {
    native?: boolean
    missingService?: boolean
    failAuth?: boolean
    failSecondPost?: boolean
    sourceDrift?: boolean
  } = {},
) {
  const order: string[] = []
  let sources = 0
  const backend = {
    now: () => 0,
    log: () => {},
    async requireNativeDisabled() {
      order.push('native-off')
      if (options.native) throw new Error('native enabled')
    },
    async preflightApplications() {
      order.push('all-selected-inventory')
      if (options.missingService) throw new Error('missing old healthy deployment')
    },
    async preflight() {
      order.push('backend-ssh')
    },
    async deploy(service: string) {
      order.push(`POST-${service}`)
      if (options.failSecondPost && service === 'community') throw new Error('unknown POST')
      return service
    },
    async waitRetired(service: string) {
      order.push(`REMOVED-old-${service}`)
      if (options.failAuth && service === 'auth') throw new Error('old Auth still active')
    },
    async remote(action: string) {
      order.push(action)
      return action === 'migrate'
        ? { status: 'migrated' }
        : action === 'initialize'
          ? { status: 'already-published', version: 1 }
          : { status: 'published', version: 1 }
    },
  }
  return {
    order,
    ports: {
      ids,
      backend,
      now: backend.now,
      log: (entry: { stage: string }) => order.push(entry.stage),
      async checkSource() {
        order.push('source')
        if (options.sourceDrift && ++sources > 1) throw new Error('main drift')
      },
      async checkConfiguration() {
        order.push('iac-readonly')
      },
    },
  }
}

describe('one production owner and canonical V1 barrier', () => {
  test('recorder initialization is opt-in and its POST still follows V1', async () => {
    const fixture = wave()
    const result = await runProductionRelease(
      { sha, services: 'members,auth,live-recorder', plan, initializeRecorder: true },
      fixture.ports,
    )
    expect(result.initialApplications).toEqual(['live-recorder'])
    expect(fixture.order.indexOf('POST-live-recorder')).toBeGreaterThan(
      fixture.order.indexOf('BACKEND_BARRIER_PASSED'),
    )
    expect(selectInitialProductionApplications(undefined, ['live-recorder'])).toEqual([])
    expect(selectInitialProductionApplications('false', ['live-recorder'])).toEqual([])
    expect(() => selectInitialProductionApplications(true, ['admin'])).toThrow()
    expect(() => selectInitialProductionApplications('all', ['live-recorder'])).toThrow()
  })
  test('Members/Auth retire and verify V1 before any app POST', async () => {
    const fixture = wave()
    const result = await runProductionRelease(
      { sha, services: 'members,auth,admin', plan },
      fixture.ports,
    )
    expect(result.state).toBe('PRODUCTION_WAVE_PASSED')
    expect(fixture.order.indexOf('native-off')).toBeLessThan(fixture.order.indexOf('iac-readonly'))
    expect(fixture.order.indexOf('POST-members')).toBeLessThan(fixture.order.indexOf('initialize'))
    expect(fixture.order.indexOf('REMOVED-old-auth')).toBeLessThan(fixture.order.indexOf('verify'))
    expect(fixture.order.indexOf('BACKEND_BARRIER_PASSED')).toBeLessThan(
      fixture.order.indexOf('POST-admin'),
    )
    expect(fixture.order).toContain('REMOVED-old-admin')
  })
  test.each([
    { native: true },
    { missingService: true },
  ])('preflight refusal prevents every POST %j', async (options) => {
    const fixture = wave(options)
    await expect(
      runProductionRelease({ sha, services: 'members,auth,admin', plan }, fixture.ports),
    ).rejects.toThrow()
    expect(fixture.order.some((entry) => entry.startsWith('POST-'))).toBe(false)
  })
  test('nonempty IaC is refused before config apply or backend mutation', async () => {
    const fixture = wave()
    await expect(
      runProductionRelease(
        {
          sha,
          services: 'members,auth,admin',
          plan: {
            ...plan,
            changeSet: { changes: [{ address: 'service.admin', field: 'deploy' }] },
          },
        },
        fixture.ports,
      ),
    ).rejects.toThrow('onda operacional')
    expect(fixture.order).toEqual([])
  })
  test('old Auth not removed prevents every app POST', async () => {
    const fixture = wave({ failAuth: true })
    await expect(
      runProductionRelease({ sha, services: 'members,auth,admin', plan }, fixture.ports),
    ).rejects.toThrow()
    expect(fixture.order).not.toContain('POST-admin')
  })
  test('app-only wave still verifies V1 without redeploying Members/Auth', async () => {
    const fixture = wave()
    await runProductionRelease({ sha, services: 'admin', plan }, fixture.ports)
    expect(fixture.order).toContain('verify')
    expect(fixture.order).not.toContain('POST-members')
    expect(fixture.order).not.toContain('POST-auth')
  })
  test('a lost second ACK stops dispatch and still retires the first owned ACK; never reports PASS', async () => {
    const fixture = wave({ failSecondPost: true })
    await expect(
      runProductionRelease(
        { sha, services: 'admin,community,community-kids', plan },
        fixture.ports,
      ),
    ).rejects.toThrow('unknown POST')
    expect(fixture.order).toContain('REMOVED-old-admin')
    expect(fixture.order).not.toContain('POST-community-kids')
  })
  test('final source drift prevents a successful receipt', async () => {
    const fixture = wave({ sourceDrift: true })
    await expect(
      runProductionRelease({ sha, services: 'admin', plan }, fixture.ports),
    ).rejects.toThrow('main drift')
  })
  test.each([
    'all',
    'members',
    'auth,admin',
    'admin,admin',
    'imaginary',
    '',
  ])('explicit selection refuses %s', (csv) => {
    expect(() => selectProductionServices(csv, ids)).toThrow()
  })
})

describe('actual Railway ports read the native toggle and deployment identity', () => {
  test.each([
    true,
    null,
    undefined,
  ])('native status %j refuses without a mutation', async (enabled) => {
    const requests: Array<{ query: string; variables: Record<string, string> }> = []
    const ports = createRailwayPorts(sha, env, 'inert', {
      target: 'production',
      applications: true,
      fetch: async (_url: string, request: { body: string }) => {
        const body = JSON.parse(request.body)
        requests.push(body)
        return Response.json({ data: { serviceInstanceAutoDeployStatus: { enabled } } })
      },
    })
    await expect(ports.requireNativeDisabled(['admin'])).rejects.toThrow('Trigger nativo')
    expect(requests[0]!.variables).toEqual({
      p: target.project,
      e: target.environment,
      s: ids.admin,
    })
    expect(requests.every((entry) => entry.query.startsWith('query'))).toBe(true)
  })
  test('a valid explicit false is accepted; arbitrary service identity is refused locally', async () => {
    let requests = 0
    const ports = createRailwayPorts(sha, env, 'inert', {
      target: 'production',
      applications: true,
      fetch: async () => {
        requests++
        return Response.json({ data: { serviceInstanceAutoDeployStatus: { enabled: false } } })
      },
    })
    await ports.requireNativeDisabled(['admin'])
    expect(requests).toBe(1)
    await expect(ports.requireNativeDisabled(['imaginary'])).rejects.toThrow()
    expect(requests).toBe(1)
  })
})

function application(
  options: {
    oldActive?: boolean
    wrongSha?: boolean
    skipped?: boolean
    wrongContext?: boolean
    blockedCheckpoint?: boolean
    service?: 'admin' | 'live-recorder'
    initiallyEmpty?: boolean
    concurrentActive?: boolean
    pending?: boolean
  } = {},
) {
  const old = '44444444-4444-4444-8444-444444444444'
  const fresh = '55555555-5555-4555-8555-555555555555'
  let deployed = false
  let clock = 0
  let mutations = 0
  let activeReads = 0
  const ports = createRailwayPorts(sha, env, 'inert', {
    target: 'production',
    applications: true,
    now: () => clock,
    sleep: async (ms: number) => {
      clock += ms
    },
    log: () => {},
    beforeDeploy: async () => {
      if (options.blockedCheckpoint) throw new Error('checkpoint persistence failed')
    },
    async fetch(_url: string, request: { body: string }) {
      const { query, variables } = JSON.parse(request.body)
      if (query.startsWith('mutation')) {
        mutations++
        deployed = true
        return Response.json({ data: { serviceInstanceDeployV2: fresh } })
      }
      if (query.includes('activeDeployments')) {
        activeReads++
        return Response.json({
          data: {
            serviceInstance: {
              activeDeployments:
                options.initiallyEmpty &&
                !deployed &&
                (!options.concurrentActive || activeReads === 1)
                  ? []
                  : [
                      {
                        id: deployed ? fresh : old,
                        status: 'SUCCESS',
                        meta: { commitHash: deployed ? sha : headSha },
                      },
                    ],
            },
          },
        })
      }
      if (query.includes('deployments(input:'))
        return Response.json({
          data: {
            deployments: {
              edges: options.pending ? [{ node: { id: old, status: 'BUILDING' } }] : [],
              pageInfo: { hasNextPage: false },
            },
          },
        })
      if (query.includes('deployment(id:'))
        return Response.json({
          data: {
            deployment: {
              id: variables.id,
              projectId: target.project,
              environmentId: options.wrongContext
                ? kidsJourneyTargets.staging.environment
                : target.environment,
              serviceId: ids[options.service ?? 'admin'],
              status:
                variables.id === old
                  ? deployed && !options.oldActive
                    ? 'REMOVED'
                    : 'SUCCESS'
                  : options.skipped
                    ? 'SKIPPED'
                    : 'SUCCESS',
              meta: {
                commitHash: variables.id === old ? headSha : options.wrongSha ? headSha : sha,
              },
            },
          },
        })
      throw new Error('Unexpected inert provider operation')
    },
  })
  return { ports, mutations: () => mutations }
}

describe('apps reuse the real canonical deployment ports, without an SSH backend probe', () => {
  test('first recorder deployment uses its exact identity, then proves unique healthy readiness', async () => {
    const fixture = application({ service: 'live-recorder', initiallyEmpty: true })
    await fixture.ports.preflightApplications(['live-recorder'], Infinity, ['live-recorder'])
    const id = await fixture.ports.deploy('live-recorder')
    await fixture.ports.waitRetired('live-recorder', id)
    expect(fixture.mutations()).toBe(1)
  })
  test('no healthy recorder remains a refusal without explicit initialization', async () => {
    const fixture = application({ service: 'live-recorder', initiallyEmpty: true })
    await expect(fixture.ports.preflightApplications(['live-recorder'])).rejects.toThrow()
    expect(fixture.mutations()).toBe(0)
  })
  test('a substituted recorder service ID refuses before any provider call', async () => {
    let calls = 0
    const ports = createRailwayPorts(
      sha,
      { ...env, LIVE_RECORDER_SERVICE_ID: '33333333-3333-4333-8333-333333333333' },
      'inert',
      {
        target: 'production',
        applications: true,
        fetch: async () => {
          calls++
          throw new Error('provider must not be called')
        },
      },
    )
    await expect(
      ports.preflightApplications(['live-recorder'], Infinity, ['live-recorder']),
    ).rejects.toThrow('somente o gravador')
    expect(calls).toBe(0)
  })
  test.each([
    'admin',
    'members',
    'auth',
    'unknown',
  ])('initialization cannot weaken an existing backend/app: %s', async (service) => {
    const fixture = application({ initiallyEmpty: true })
    await expect(
      fixture.ports.preflightApplications([service], Infinity, [service]),
    ).rejects.toThrow()
    expect(fixture.mutations()).toBe(0)
  })
  test.each([
    { pending: true },
    { concurrentActive: true },
  ])('a pending/concurrent recorder prevents a duplicate POST: %j', async (options) => {
    const fixture = application({ service: 'live-recorder', initiallyEmpty: true, ...options })
    await expect(
      (async () => {
        await fixture.ports.preflightApplications(['live-recorder'], Infinity, ['live-recorder'])
        await fixture.ports.deploy('live-recorder')
      })(),
    ).rejects.toThrow()
    expect(fixture.mutations()).toBe(0)
  })
  test('an existing healthy recorder refuses first-deployment mode', async () => {
    const fixture = application({ service: 'live-recorder' })
    await expect(
      fixture.ports.preflightApplications(['live-recorder'], Infinity, ['live-recorder']),
    ).rejects.toThrow('já tem')
    expect(fixture.mutations()).toBe(0)
  })
  test('exact app SHA/context plus unique active and old REMOVED permits completion', async () => {
    const fixture = application()
    await fixture.ports.preflightApplications(['admin'])
    const id = await fixture.ports.deploy('admin')
    await fixture.ports.waitRetired('admin', id)
    expect(fixture.mutations()).toBe(1)
  })
  test.each([
    { oldActive: true },
    { wrongSha: true },
    { skipped: true },
  ])('actual readiness refusal remains strict %j', async (options) => {
    const fixture = application(options)
    await fixture.ports.preflightApplications(['admin'])
    const id = await fixture.ports.deploy('admin')
    await expect(fixture.ports.waitRetired('admin', id)).rejects.toThrow()
    expect(fixture.mutations()).toBe(1)
  })
  test('foreign context refuses before every app POST', async () => {
    const fixture = application({ wrongContext: true })
    await expect(fixture.ports.preflightApplications(['admin'])).rejects.toThrow('Identidade')
    expect(fixture.mutations()).toBe(0)
  })
  test('failed durable checkpoint or fresh-source gate prevents the POST, without retry', async () => {
    const fixture = application({ blockedCheckpoint: true })
    await fixture.ports.preflightApplications(['admin'])
    await expect(fixture.ports.deploy('admin')).rejects.toThrow('checkpoint')
    expect(fixture.mutations()).toBe(0)
  })
})
