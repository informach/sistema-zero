import { describe, expect, test } from 'bun:test'
import { runRemoteBootstrap } from '../release/kids-journey-bootstrap.mjs'
import { kidsJourneyTargets } from '../release/kids-journey-targets.mjs'
import { createRailwayPorts, runKidsJourneyRollout } from './kids-journey-rollout.mjs'

const target = kidsJourneyTargets.production
const sha = 'a'.repeat(40)
const oldSha = 'b'.repeat(40)
const ids = {
  members: ['11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222'],
  auth: ['33333333-3333-4333-8333-333333333333', '44444444-4444-4444-8444-444444444444'],
}
const preparationId = '55555555-5555-4555-8555-555555555555'
const localEnv = {
  RAILWAY_TOKEN: 'inert-test-only',
  RAILWAY_PROJECT_ID: target.project,
  RAILWAY_ENVIRONMENT_ID: target.environment,
}
const remoteEnv = {
  RAILWAY_PROJECT_ID: target.project,
  RAILWAY_ENVIRONMENT_ID: target.environment,
  RAILWAY_SERVICE_ID: target.members,
  RAILWAY_DEPLOYMENT_ID: ids.members[1],
  RAILWAY_GIT_COMMIT_SHA: sha,
  DATABASE_URL: 'inert-only',
  AUTH_BASE_URL: 'inert-only',
  AUTH_INTERNAL_TOKEN: 'inert-only',
  MEMBERS_PROFILE_ADMISSION_TOKEN: 'inert-only',
}

function fixture(
  options: {
    retire?: boolean
    wrongContext?: boolean
    wrongAck?: boolean
    wrongProjectProbe?: boolean
  } = {},
) {
  const retire = options.retire !== false
  const calls: Array<{ query: string; variables: Record<string, unknown> }> = []
  const commands: string[][] = []
  const order: string[] = []
  const deployed = new Set<string>()
  let clock = 0
  let initializations = 0
  const ports = createRailwayPorts(sha, localEnv, '/inert-existing-identity', {
    target: 'production',
    now: () => clock,
    sleep: async (ms: number) => {
      clock += ms
    },
    log: () => {},
    exec(command: string, args: string[]) {
      commands.push([command, ...args])
      if (command === 'ssh') return ''
      if (args[0] === '--version') return 'railway 5.62.1\n'
      const cmd = args.slice(args.indexOf('--') + 1)
      if (cmd[1] === '-e') {
        const nonce = /nonce:"([a-f0-9]{32})"/.exec(cmd[2])?.[1]
        return JSON.stringify({
          nonce,
          bun: '1.3.11',
          checks: {
            project: !options.wrongProjectProbe,
            environment: true,
            service: true,
            deployment: true,
            commit: true,
            required: true,
          },
        })
      }
      expect(cmd.slice(0, 4)).toEqual([
        'bun',
        'scripts/release/kids-journey-bootstrap.mjs',
        '--target',
        'production',
      ])
      const [action, , , nonce] = cmd.slice(4)
      order.push(action)
      if (action === 'initialize') initializations++
      const result =
        action === 'migrate'
          ? { status: 'migrated' }
          : action === 'initialize'
            ? initializations > 1
              ? { status: 'already-published', version: 1 }
              : { status: 'initializing', version: 0, preparationId }
            : action === 'advance'
              ? {
                  status: 'advanced',
                  phase: 'ready',
                  preparationId,
                  processed: 1,
                  progress: 'c'.repeat(64),
                }
              : { status: 'published', version: 1 }
      return JSON.stringify({
        kind: 'kids-journey-rollout',
        nonce,
        target: options.wrongAck ? 'staging' : 'production',
        project: target.project,
        environment: target.environment,
        ...result,
      })
    },
    async fetch(_url: string, request: { body: string }) {
      const { query, variables } = JSON.parse(request.body)
      calls.push({ query, variables })
      const service = variables.s === target.auth ? 'auth' : 'members'
      let data: unknown
      if (query.startsWith('mutation')) {
        deployed.add(service)
        order.push(`deploy-${service}`)
        data = { serviceInstanceDeployV2: ids[service][1] }
      } else if (query.includes('activeDeployments'))
        data = {
          serviceInstance: {
            activeDeployments: [
              {
                id: ids[service][deployed.has(service) ? 1 : 0],
                status: 'SUCCESS',
                meta: { commitHash: deployed.has(service) ? sha : oldSha },
              },
            ],
          },
        }
      else if (query.includes('deployments(input:'))
        data = { deployments: { edges: [], pageInfo: { hasNextPage: false } } }
      else {
        const rowService = Object.entries(ids).find(([, values]) =>
          values.includes(variables.id),
        )?.[0]
        if (rowService !== 'members' && rowService !== 'auth')
          throw new Error('Unexpected inert deployment')
        const old = variables.id === ids[rowService][0]
        data = {
          deployment: {
            id: variables.id,
            projectId: options.wrongContext ? 'inert-wrong-project' : target.project,
            environmentId: target.environment,
            serviceId: target[rowService],
            status: old && deployed.has(rowService) && retire ? 'REMOVED' : 'SUCCESS',
            meta: { commitHash: old ? oldSha : sha },
          },
        }
      }
      return { ok: true, json: async () => ({ data }) }
    },
  })
  return { ports, calls, commands, order }
}

describe('explicit production canonical backend boundary, without remote I/O', () => {
  test('same algorithm keeps Members/init before Auth retirement/capture/publish and uses only actual production IDs', async () => {
    const f = fixture()
    expect(await runKidsJourneyRollout({ mode: 'deploy', sha }, f.ports)).toEqual({
      status: 'published',
      version: 1,
    })
    expect(f.order).toEqual([
      'deploy-members',
      'migrate',
      'initialize',
      'deploy-auth',
      'advance',
      'publish',
      'initialize',
    ])
    for (const { variables } of f.calls) {
      if (variables.e) expect(variables.e).toBe(target.environment)
      if (variables.input)
        expect(variables.input).toMatchObject({
          projectId: target.project,
          environmentId: target.environment,
        })
    }
    for (const command of f.commands.filter((c) => c[1] === 'ssh')) {
      expect(command).toContain(target.environment)
      expect(command).not.toContain(kidsJourneyTargets.staging.environment)
    }
  })
  test('production cannot use an arbitrary local project/environment or staging disguise', () => {
    for (const env of [
      { ...localEnv, RAILWAY_PROJECT_ID: 'wrong' },
      { ...localEnv, RAILWAY_ENVIRONMENT_ID: kidsJourneyTargets.staging.environment },
      { ...localEnv, RAILWAY_ENVIRONMENT_ID: undefined },
      { ...localEnv, STAGING_ENV_ID: kidsJourneyTargets.staging.environment },
    ])
      expect(() => createRailwayPorts(sha, env, '/inert', { target: 'production' })).toThrow(
        'produção',
      )
    expect(() => createRailwayPorts(sha, localEnv, '/inert', { target: 'other' })).toThrow(
      'Destino',
    )
    expect(() => createRailwayPorts(sha, localEnv, '/inert')).toThrow('target explícito')
  })
  test('actual deployment context drift refuses production before any mutation', async () => {
    const f = fixture({ wrongContext: true })
    await expect(runKidsJourneyRollout({ mode: 'deploy', sha }, f.ports)).rejects.toThrow(
      'divergente',
    )
    expect(f.calls.some((call) => call.query.startsWith('mutation'))).toBe(false)
  })
  test('old production deployment still blocks the exact same algorithm before migration/capture', async () => {
    const f = fixture({ retire: false })
    await expect(runKidsJourneyRollout({ mode: 'deploy', sha }, f.ports)).rejects.toThrow(
      'não retirados',
    )
    expect(f.order).toEqual(['deploy-members'])
  })
  test('production project probe failure is refused before any mutation', async () => {
    const f = fixture({ wrongProjectProbe: true })
    await expect(runKidsJourneyRollout({ mode: 'deploy', sha }, f.ports)).rejects.toThrow(
      'identidade',
    )
    expect(f.calls.some((call) => call.query.startsWith('mutation'))).toBe(false)
  })
  test('production never treats a staging bootstrap receipt as its own barrier', async () => {
    const f = fixture({ wrongAck: true })
    await expect(runKidsJourneyRollout({ mode: 'deploy', sha }, f.ports)).rejects.toThrow(
      'ACK bootstrap de produção',
    )
    expect(f.order).toEqual(['deploy-members', 'migrate'])
  })
  test.each([
    'RAILWAY_PROJECT_ID',
    'RAILWAY_ENVIRONMENT_ID',
    'RAILWAY_SERVICE_ID',
    'RAILWAY_DEPLOYMENT_ID',
    'RAILWAY_GIT_COMMIT_SHA',
  ])('remote production refuses wrong actual %s before any command', async (key) => {
    let called = false
    await expect(
      runRemoteBootstrap(
        {
          target: 'production',
          action: 'migrate',
          sha,
          deployment: ids.members[1],
          nonce: 'b'.repeat(32),
        },
        { ...remoteEnv, [key]: 'wrong' },
        {
          exec: () => {
            called = true
            return ''
          },
        },
      ),
    ).rejects.toThrow('divergente')
    expect(called).toBe(false)
  })
  test('explicit production wrapper binds a real valid target in its closed receipt', async () => {
    const result = await runRemoteBootstrap(
      {
        target: 'production',
        action: 'migrate',
        sha,
        deployment: ids.members[1],
        nonce: 'b'.repeat(32),
      },
      remoteEnv,
      { exec: () => '' },
    )
    expect(result).toEqual({
      kind: 'kids-journey-rollout',
      nonce: 'b'.repeat(32),
      target: 'production',
      project: target.project,
      environment: target.environment,
      status: 'migrated',
    })
  })
})
