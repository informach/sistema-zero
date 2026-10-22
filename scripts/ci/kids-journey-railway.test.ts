import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { stagingJourney } from '../release/kids-journey-bootstrap.mjs'
import {
  createRailwayPorts,
  describeKidsJourneyRolloutFailure,
  prepareSsh,
  runKidsJourneyRollout,
  validateBackendRolloutPlan,
} from './kids-journey-rollout.mjs'

const sha = 'a'.repeat(40),
  oldSha = 'b'.repeat(40)
const oldId = '44444444-4444-4444-8444-444444444444'
const newId = '55555555-5555-4555-8555-555555555555'
const imageDigest = `sha256:${'c'.repeat(64)}`
const adoption = { id: newId, commitSha: sha, imageDigest, previousIds: [oldId] }

function transport(
  options: {
    relayOnly?: boolean
    retire?: boolean
    wrongSha?: boolean
    hideOldAfterProbe?: boolean
    failedProbeCheck?: 'environment' | 'service' | 'deployment' | 'commit' | 'required'
    probeStderr?: string
    pendingForMs?: number
    adoption?: typeof adoption
    failAt?: 'cli' | 'openssh' | 'inventory' | 'probe'
    reply?: (query: string, call: number) => Response | undefined
  } = {},
) {
  const commands: string[][] = [],
    queries: string[] = [],
    logs: unknown[] = []
  let deployed = !!options.adoption,
    polls = 0
  let activeReads = 0
  let elapsedMs = 0
  const ports = createRailwayPorts(
    sha,
    { RAILWAY_TOKEN: 'local-test-only' },
    '/isolated/identity',
    {
      ...(options.adoption ? { adoptDeployments: { members: options.adoption } } : {}),
      exec(command: string, args: string[]) {
        commands.push([command, ...args])
        if (
          (options.failAt === 'cli' && args[0] === '--version') ||
          (options.failAt === 'openssh' && command === 'ssh') ||
          (options.failAt === 'probe' && args[0] === 'ssh')
        )
          throw Object.assign(new Error('sensitive raw transport detail'), {
            stderr: options.probeStderr ?? 'sensitive raw transport detail',
          })
        if (command === 'ssh') return ''
        if (args[0] === '--version') return 'railway 5.62.1\n'
        const code = args.at(-1) ?? ''
        if (options.relayOnly) return '{"status":"waiting-for-container"}'
        const nonce = /nonce:"([a-f0-9]{32})"/.exec(code)?.[1]
        if (!nonce) throw new Error('Unexpected remote command')
        return JSON.stringify({
          nonce,
          bun: '1.3.11',
          checks: {
            environment: options.failedProbeCheck !== 'environment',
            service: options.failedProbeCheck !== 'service',
            deployment: options.failedProbeCheck !== 'deployment',
            commit: options.failedProbeCheck !== 'commit',
            required: options.failedProbeCheck !== 'required',
          },
        })
      },
      async fetch(_url: string, request: { body: string }) {
        const { query, variables } = JSON.parse(request.body)
        queries.push(query)
        const intercepted = options.reply?.(query, queries.length)
        if (intercepted) return intercepted
        if (options.failAt === 'inventory')
          return {
            ok: true,
            json: async () => ({ errors: [{ message: 'Not Authorized' }] }),
          }
        let data: unknown
        if (query.startsWith('mutation')) {
          deployed = true
          data = { serviceInstanceDeployV2: newId }
        } else if (query.includes('deployments(input:'))
          data = { deployments: { edges: [], pageInfo: { hasNextPage: false, endCursor: null } } }
        else if (query.includes('activeDeployments'))
          data = {
            serviceInstance: {
              activeDeployments:
                !deployed && options.hideOldAfterProbe && activeReads++ >= 2
                  ? []
                  : [
                      {
                        id: deployed ? newId : oldId,
                        status: 'SUCCESS',
                        meta: { commitHash: deployed ? sha : oldSha, imageDigest },
                      },
                    ],
            },
          }
        else
          data = {
            deployment: {
              id: variables.id,
              projectId: stagingJourney.project,
              environmentId: stagingJourney.environment,
              serviceId: stagingJourney.members,
              status:
                variables.id === oldId
                  ? options.retire && (polls > 0 || options.adoption)
                    ? 'REMOVED'
                    : 'SUCCESS'
                  : elapsedMs < (options.pendingForMs ?? 0)
                    ? 'BUILDING'
                    : 'SUCCESS',
              meta: { commitHash: options.wrongSha ? oldSha : sha, imageDigest },
            },
          }
        return { ok: true, json: async () => ({ data }) }
      },
      now: () => elapsedMs,
      sleep: async (ms: number) => {
        polls++
        elapsedMs += ms
      },
      log: (value: unknown) => logs.push(value),
    },
  )
  return {
    ports,
    commands,
    queries,
    logs,
    polls: () => polls,
    elapsed: () => elapsedMs,
    advance: (ms: number) => {
      elapsedMs += ms
    },
  }
}

describe('actual Railway boundary without remote I/O', () => {
  test('explicit adoption reuses only the exact healthy image and still requires retirement plus admission', async () => {
    const f = transport({ adoption, retire: true })
    await f.ports.preflight()
    const id = await f.ports.deploy('members')
    expect(id).toBe(newId)
    expect(f.queries.some((query) => query.startsWith('mutation'))).toBe(false)
    expect(f.commands.filter((command) => command[1] === 'ssh')).toHaveLength(2)
    expect(f.logs).toContainEqual({
      stage: 'members-deployment-adopted',
      deployment: newId,
      adopted: true,
      mutationOutcome: 'not-attempted',
    })
    await f.ports.waitRetired('members', id)
    expect(f.commands.filter((command) => command[1] === 'ssh')).toHaveLength(3)
    expect(f.queries.filter((query) => query.includes('deployments(input:'))).toHaveLength(2)
  })

  test.each([
    { field: 'id', value: oldId },
    { field: 'projectId', value: oldId },
    { field: 'environmentId', value: oldId },
    { field: 'serviceId', value: stagingJourney.auth },
    { field: 'status', value: 'DEPLOYING' },
    { field: 'meta', value: { commitHash: oldSha, imageDigest } },
    { field: 'meta', value: { commitHash: sha, imageDigest: `sha256:${'d'.repeat(64)}` } },
  ])('adoption refuses changed remote $field without mutation', async ({ field, value }) => {
    const f = transport({
      adoption,
      retire: true,
      reply(query) {
        if (!query.includes('deployment(id:')) return undefined
        return Response.json({
          data: {
            deployment: {
              id: newId,
              projectId: stagingJourney.project,
              environmentId: stagingJourney.environment,
              serviceId: stagingJourney.members,
              status: 'SUCCESS',
              meta: { commitHash: sha, imageDigest },
              [field]: value,
            },
          },
        })
      },
    })
    await f.ports.preflight()
    await expect(f.ports.deploy('members')).rejects.toThrow('adoção')
    expect(f.queries.some((query) => query.startsWith('mutation'))).toBe(false)
  })

  test.each([
    { edges: [{ node: { id: oldId, status: 'BUILDING' } }], hasNextPage: false },
    { edges: [], hasNextPage: true },
  ])('pending or incomplete inventory cannot authorize adoption', async ({
    edges,
    hasNextPage,
  }) => {
    const f = transport({
      adoption,
      retire: true,
      reply(query) {
        return query.includes('deployments(input:')
          ? Response.json({ data: { deployments: { edges, pageInfo: { hasNextPage } } } })
          : undefined
      },
    })
    await f.ports.preflight()
    await expect(f.ports.deploy('members')).rejects.toThrow('pendente')
    expect(f.queries.some((query) => query.startsWith('mutation'))).toBe(false)
  })

  test('adoption requires every explicit predecessor to be REMOVED, not just absent from active', async () => {
    const f = transport({ adoption })
    await f.ports.preflight()
    await expect(f.ports.deploy('members')).rejects.toThrow('Predecessores')
    expect(f.queries.some((query) => query.startsWith('mutation'))).toBe(false)
  })

  test('a competing active deployment observed after preflight refuses adoption', async () => {
    let activeReads = 0
    const f = transport({
      adoption,
      retire: true,
      reply(query) {
        if (!query.includes('activeDeployments') || ++activeReads <= 2) return undefined
        return Response.json({
          data: {
            serviceInstance: {
              activeDeployments: [
                { id: newId, status: 'SUCCESS', meta: { commitHash: sha, imageDigest } },
                { id: oldId, status: 'SUCCESS', meta: { commitHash: oldSha } },
              ],
            },
          },
        })
      },
    })
    await f.ports.preflight()
    await expect(f.ports.deploy('members')).rejects.toThrow('único')
    expect(f.queries.some((query) => query.startsWith('mutation'))).toBe(false)
  })

  test('an adoption read that exhausts the shared deadline starts no further operation', async () => {
    const f = transport({
      adoption,
      retire: true,
      reply(query) {
        if (query.includes('deployment(id:')) f.advance(101)
        return undefined
      },
    })
    await f.ports.preflight()
    await expect(f.ports.deploy('members', 100)).rejects.toThrow('limite')
    expect(f.queries.some((query) => query.includes('deployments(input:'))).toBe(false)
    expect(f.queries.some((query) => query.startsWith('mutation'))).toBe(false)
  })

  test('a new pending deployment between adoption and admission blocks the release', async () => {
    let inventories = 0
    const f = transport({
      adoption,
      retire: true,
      reply(query) {
        if (!query.includes('deployments(input:') || ++inventories === 1) return undefined
        return Response.json({
          data: {
            deployments: {
              edges: [{ node: { id: oldId, status: 'BUILDING' } }],
              pageInfo: { hasNextPage: false },
            },
          },
        })
      },
    })
    await f.ports.preflight()
    const id = await f.ports.deploy('members')
    await expect(f.ports.waitRetired('members', id)).rejects.toThrow('pendente')
    expect(f.commands.filter((command) => command[1] === 'ssh')).toHaveLength(2)
  })

  test('malformed adoption is refused before provider access', () => {
    for (const candidate of [
      { ...adoption, commitSha: oldSha },
      { ...adoption, imageDigest: 'latest' },
      { ...adoption, previousIds: [] },
      { ...adoption, previousIds: [newId] },
      { ...adoption, previousIds: [oldId, oldId] },
      { ...adoption, unexpected: true },
    ])
      expect(() =>
        createRailwayPorts(sha, {}, '/isolated/identity', {
          adoptDeployments: { members: candidate },
          fetch: () => {
            throw new Error('Must not access provider')
          },
        }),
      ).toThrow('Adoção')
  })
  test('post-preflight failures identify refresh, mutation, ACK and first poll without releasing apps', async () => {
    for (const [call, step, reason, mutationOutcome, status] of [
      [3, 'members-active-refresh', 'api-authorization-rejected', 'not-attempted', 401],
      [4, 'members-deploy-mutation', 'api-provider-unavailable', 'unknown', 503],
      [4, 'members-deploy-ack', 'invalid-ack', 'unknown', 200],
      [5, 'members-first-poll', 'api-provider-unavailable', 'acknowledged', 502],
    ] as const) {
      const f = transport({
        reply: (_query, current) =>
          current === call
            ? Response.json(
                { data: { serviceInstanceDeployV2: 'sensitive-invalid-ack' } },
                { status },
              )
            : undefined,
      })
      let caught: unknown
      try {
        await runKidsJourneyRollout({ mode: 'deploy', sha }, f.ports)
      } catch (error) {
        caught = error
      }
      expect(caught).toBeInstanceOf(Error)
      expect(describeKidsJourneyRolloutFailure(caught)).toEqual({
        kind: 'kids-journey-rollout-failure',
        step,
        reason,
        mutationOutcome,
        ...(status !== 200 ? { httpStatus: status } : {}),
        ...(call === 5 ? { deployment: newId } : {}),
      })
      expect(f.queries).toHaveLength(call)
      expect(f.queries.filter((query) => query.startsWith('mutation'))).toHaveLength(
        call === 3 ? 0 : 1,
      )
      expect(f.commands.filter((command) => command[1] === 'ssh')).toHaveLength(2)
      expect(f.polls()).toBe(0)
      expect(JSON.stringify([describeKidsJourneyRolloutFailure(caught), f.logs])).not.toContain(
        'sensitive',
      )
    }
  })
  test('HTTP classification is bounded and never reads or prints a rejected body', async () => {
    for (const [status, reason] of [
      [400, 'api-http-rejected'],
      [403, 'api-authorization-rejected'],
      [404, 'api-http-rejected'],
      [408, 'api-timeout'],
      [409, 'api-http-rejected'],
      [429, 'api-rate-limited'],
      [500, 'api-provider-unavailable'],
      [503, 'api-provider-unavailable'],
      [504, 'api-timeout'],
    ] as const) {
      const response = Response.json({ token: 'sensitive-response-token' }, { status })
      const f = transport({ reply: (_query, call) => (call === 4 ? response : undefined) })
      await f.ports.preflight()
      let caught: unknown
      try {
        await f.ports.deploy('auth')
      } catch (error) {
        caught = error
      }
      expect(describeKidsJourneyRolloutFailure(caught)).toEqual({
        kind: 'kids-journey-rollout-failure',
        step: 'auth-deploy-mutation',
        reason,
        httpStatus: status,
        mutationOutcome: 'unknown',
      })
      expect(response.bodyUsed).toBe(false)
      expect(f.queries).toHaveLength(4)
      expect(f.polls()).toBe(0)
      expect(JSON.stringify([describeKidsJourneyRolloutFailure(caught), f.logs])).not.toMatch(
        /sensitive|local-test-only|Bearer|graphql|serviceInstanceDeployV2/,
      )
    }
  })
  test('only exact known GraphQL errors get specific reasons, including partial data failures', async () => {
    for (const [message, reason] of [
      ['Not Authorized', 'api-authorization-rejected'],
      ['Commit not found', 'api-commit-not-found'],
      ['Deployments paused sensitive-provider-body', 'api-operation-rejected'],
      ['Commit not found: sensitive-commit-value', 'api-operation-rejected'],
    ] as const) {
      const f = transport({
        reply: (_query, call) =>
          call === 4
            ? Response.json({
                data: { serviceInstanceDeployV2: newId },
                errors: [
                  {
                    message,
                    path: ['sensitive-path'],
                    extensions: { code: 'sensitive-extension', token: 'local-test-only' },
                  },
                ],
              })
            : undefined,
      })
      await f.ports.preflight()
      let caught: unknown
      try {
        await f.ports.deploy('members')
      } catch (error) {
        caught = error
      }
      expect(describeKidsJourneyRolloutFailure(caught)).toEqual({
        kind: 'kids-journey-rollout-failure',
        step: 'members-deploy-mutation',
        reason,
        httpStatus: 200,
        mutationOutcome: 'unknown',
      })
      expect(f.queries).toHaveLength(4)
      expect(f.logs).not.toContainEqual({
        stage: 'members-deploy-ack',
        deployment: newId,
        mutationOutcome: 'acknowledged',
      })
      expect(JSON.stringify([describeKidsJourneyRolloutFailure(caught), f.logs])).not.toMatch(
        /sensitive|local-test-only|paused|Bearer/,
      )
    }
  })
  test('network throws, including non-objects, preserve uncertain mutation without serializing errors', async () => {
    for (const thrown of [
      undefined,
      null,
      17,
      'sensitive-primitive',
      new Error('sensitive-network-error local-test-only'),
      { token: 'sensitive-token', query: 'sensitive-query' },
    ]) {
      const f = transport({
        reply: (_query, call) => {
          if (call === 4) throw thrown
        },
      })
      await f.ports.preflight()
      let caught: unknown
      try {
        await f.ports.deploy('members')
      } catch (error) {
        caught = error
      }
      expect(caught).toBeInstanceOf(Error)
      expect(describeKidsJourneyRolloutFailure(caught)).toEqual({
        kind: 'kids-journey-rollout-failure',
        step: 'members-deploy-mutation',
        reason: 'api-network-failed',
        mutationOutcome: 'unknown',
      })
      expect(f.queries.filter((query) => query.startsWith('mutation'))).toHaveLength(1)
      expect(f.queries).toHaveLength(4)
      expect(JSON.stringify([describeKidsJourneyRolloutFailure(caught), f.logs])).not.toMatch(
        /sensitive|local-test-only|query|token/,
      )
    }
  })
  test('malformed bodies and invalid ACKs do not acknowledge or poll a deployment', async () => {
    for (const [response, step, reason] of [
      [new Response('sensitive-not-json'), 'members-deploy-mutation', 'api-response-invalid'],
      [Response.json(null), 'members-deploy-mutation', 'api-response-invalid'],
      [Response.json({ data: null }), 'members-deploy-mutation', 'api-response-invalid'],
      [Response.json({ data: 'sensitive' }), 'members-deploy-mutation', 'api-response-invalid'],
      [Response.json({ data: {} }), 'members-deploy-ack', 'invalid-ack'],
      [
        Response.json({ data: { serviceInstanceDeployV2: { token: 'sensitive' } } }),
        'members-deploy-ack',
        'invalid-ack',
      ],
    ] as const) {
      const f = transport({ reply: (_query, call) => (call === 4 ? response : undefined) })
      await f.ports.preflight()
      let caught: unknown
      try {
        await f.ports.deploy('members')
      } catch (error) {
        caught = error
      }
      expect(describeKidsJourneyRolloutFailure(caught)).toEqual({
        kind: 'kids-journey-rollout-failure',
        step,
        reason,
        mutationOutcome: 'unknown',
        ...(reason === 'api-response-invalid' ? { httpStatus: 200 } : {}),
      })
      expect(f.queries).toHaveLength(4)
      expect(f.polls()).toBe(0)
      expect(JSON.stringify([describeKidsJourneyRolloutFailure(caught), f.logs])).not.toContain(
        'sensitive',
      )
    }
  })
  test('a valid ACK is logged before the first poll and a terminal status still blocks retirement', async () => {
    const f = transport({
      reply: (_query, call) =>
        call === 5
          ? Response.json({
              data: { deployment: { id: newId, status: 'FAILED', meta: { secret: 'sensitive' } } },
            })
          : undefined,
    })
    await f.ports.preflight()
    const id = await f.ports.deploy('members')
    let caught: unknown
    try {
      await f.ports.waitRetired('members', id)
    } catch (error) {
      caught = error
    }
    expect(f.logs).toEqual([
      { stage: 'members-active-refresh' },
      { stage: 'members-deploy-mutation', mutationOutcome: 'unknown' },
      { stage: 'members-deploy-ack', deployment: newId, mutationOutcome: 'acknowledged' },
      { stage: 'members-first-poll', deployment: newId },
    ])
    expect(describeKidsJourneyRolloutFailure(caught)).toEqual({
      kind: 'kids-journey-rollout-failure',
      step: 'members-first-poll',
      reason: 'deployment-failed',
      mutationOutcome: 'acknowledged',
      deployment: newId,
      deploymentStatus: 'FAILED',
    })
    expect(f.queries).toHaveLength(5)
    expect(f.polls()).toBe(0)
  })
  test('preflight reports the failed boundary without raw transport output or secrets', async () => {
    for (const [failAt, step, reason] of [
      ['cli', 'cli-version', 'operation-failed'],
      ['openssh', 'openssh-version', 'operation-failed'],
      ['inventory', 'members-inventory', 'api-authorization-rejected'],
      ['probe', 'members-probe', 'ssh-command-failed'],
    ] as const) {
      const f = transport({ failAt })
      let caught: unknown
      try {
        await f.ports.preflight()
      } catch (error) {
        caught = error
      }
      expect(caught).toBeInstanceOf(Error)
      expect(describeKidsJourneyRolloutFailure(caught)).toEqual({
        kind: 'kids-journey-rollout-failure',
        step,
        reason,
      })
      expect(JSON.stringify(describeKidsJourneyRolloutFailure(caught))).not.toContain('sensitive')
      expect(f.queries.some((query) => query.startsWith('mutation'))).toBe(false)
    }
    expect(describeKidsJourneyRolloutFailure(new Error('local-test-only'))).toEqual({
      kind: 'kids-journey-rollout-failure',
      step: 'unclassified',
      reason: 'operation-failed',
    })
  })
  test('preflight identifies remote metadata mismatches and SSH failures without printing values', async () => {
    for (const check of ['environment', 'service', 'deployment', 'commit', 'required'] as const) {
      const f = transport({ failedProbeCheck: check })
      let caught: unknown
      try {
        await f.ports.preflight()
      } catch (error) {
        caught = error
      }
      expect(describeKidsJourneyRolloutFailure(caught)).toEqual({
        kind: 'kids-journey-rollout-failure',
        step: 'members-probe',
        reason: `${check}-check-failed`,
      })
      expect(f.queries.some((query) => query.startsWith('mutation'))).toBe(false)
    }
    const rejected = transport({ failAt: 'probe', probeStderr: 'Permission denied (publickey)' })
    let caught: unknown
    try {
      await rejected.ports.preflight()
    } catch (error) {
      caught = error
    }
    expect(describeKidsJourneyRolloutFailure(caught)).toEqual({
      kind: 'kids-journey-rollout-failure',
      step: 'members-probe',
      reason: 'ssh-identity-rejected',
    })
    const unknown = transport({
      failAt: 'probe',
      probeStderr: 'Failed to resolve service private-value-123',
    })
    try {
      await unknown.ports.preflight()
    } catch (error) {
      caught = error
    }
    expect(describeKidsJourneyRolloutFailure(caught)).toEqual({
      kind: 'kids-journey-rollout-failure',
      step: 'members-probe',
      reason: 'ssh-command-failed',
      signals: ['failed', 'service'],
    })
  })
  test('missing CI SSH credentials fail before touching the filesystem or deploying', () => {
    expect(() => prepareSsh({ RAILWAY_TOKEN: 'test' })).toThrow('identidade SSH')
  })
  test('readonly preflight works in the old artifact without the new wrapper', async () => {
    const f = transport()
    await f.ports.preflight()
    const ssh = f.commands.filter((call) => call[1] === 'ssh')
    expect(ssh).toHaveLength(2)
    for (const command of ssh) {
      expect(command).toContain(stagingJourney.environment)
      expect(command).toContain('-i')
      expect(command.slice(-2)[0]).toBe('-e')
      expect(command.at(-1)).not.toContain('scripts/release')
      expect(command.at(-1)).not.toContain('local-test-only')
    }
    expect(f.queries.some((query) => query.startsWith('mutation'))).toBe(false)
  })
  test('a relay exit-zero body without the nonce is not a successful preflight', async () => {
    const f = transport({ relayOnly: true })
    await expect(f.ports.preflight()).rejects.toThrow('não executou')
    expect(f.queries.some((query) => query.startsWith('mutation'))).toBe(false)
  })
  test('new SUCCESS alone does not prove the old Auth deployment retired', async () => {
    const f = transport()
    await f.ports.preflight()
    const id = await f.ports.deploy('auth')
    await expect(f.ports.waitRetired('auth', id)).rejects.toThrow('não retirados')
    expect(f.elapsed()).toBe(30 * 60 * 1000)
  })
  test('a deployment taking 24 minutes 25 seconds still requires SHA, retirement and admission', async () => {
    const f = transport({ retire: true, pendingForMs: (24 * 60 + 25) * 1000 })
    await f.ports.preflight()
    const id = await f.ports.deploy('members')
    await f.ports.waitRetired('members', id)
    expect(f.elapsed()).toBeGreaterThanOrEqual((24 * 60 + 25) * 1000)
    expect(f.elapsed()).toBeLessThan(30 * 60 * 1000)
    expect(f.commands.filter((command) => command[1] === 'ssh')).toHaveLength(3)
  })

  test('a deployment still building at thirty minutes never reaches admission', async () => {
    const f = transport({ retire: true, pendingForMs: 31 * 60 * 1000 })
    await f.ports.preflight()
    const id = await f.ports.deploy('members')
    await expect(f.ports.waitRetired('members', id)).rejects.toThrow('não retirados')
    expect(f.elapsed()).toBe(30 * 60 * 1000)
    expect(f.commands.filter((command) => command[1] === 'ssh')).toHaveLength(2)
  })

  test('a shorter shared wave deadline caps deployment polling without resetting the budget', async () => {
    const f = transport({ retire: true, pendingForMs: 24 * 60 * 1000 })
    await f.ports.preflight()
    const id = await f.ports.deploy('auth')
    await expect(f.ports.waitRetired('auth', id, 12 * 60 * 1000)).rejects.toThrow('não retirados')
    expect(f.elapsed()).toBe(12 * 60 * 1000)
    expect(f.commands.filter((command) => command[1] === 'ssh')).toHaveLength(2)
  })

  test('a successful response arriving after the deadline cannot authorize admission', async () => {
    const f = transport({
      retire: true,
      reply(query) {
        if (query.includes('deployment(id:')) f.advance(31 * 60 * 1000)
        return undefined
      },
    })
    await f.ports.preflight()
    const id = await f.ports.deploy('auth')
    await expect(f.ports.waitRetired('auth', id)).rejects.toThrow('não retirados')
    expect(f.commands.filter((command) => command[1] === 'ssh')).toHaveLength(2)
  })
  test('waits for explicit old REMOVED even after activeDeployments stopped listing it', async () => {
    const f = transport({ retire: true })
    await f.ports.preflight()
    const id = await f.ports.deploy('auth')
    await f.ports.waitRetired('auth', id)
    expect(f.polls()).toBe(1)
    expect(f.queries.some((query) => query.includes('deployment(id:'))).toBe(true)
  })
  test('SUCCESS with a different SHA blocks the wave', async () => {
    const f = transport({ retire: true, wrongSha: true })
    await f.ports.preflight()
    const id = await f.ports.deploy('members')
    await expect(f.ports.waitRetired('members', id)).rejects.toThrow('SHA')
  })
  test('retains old deployments observed by preflight even when the refresh omits them', async () => {
    const f = transport({ hideOldAfterProbe: true })
    await f.ports.preflight()
    const id = await f.ports.deploy('auth')
    await expect(f.ports.waitRetired('auth', id)).rejects.toThrow('não retirados')
  })
  test('IaC cannot silently deploy Auth/Members/apps before the canonical wave', () => {
    const plan = {
      kind: 'railway.config.plan',
      environmentId: stagingJourney.environment,
      changeSet: { changes: [] as Array<{ address: string; field: string }> },
    }
    expect(() => validateBackendRolloutPlan(plan)).not.toThrow()
    expect(() => validateBackendRolloutPlan({ ...plan, environmentId: 'production' })).toThrow()
    for (const service of ['auth', 'members', 'admin', 'community', 'community-kids'])
      for (const field of ['build', 'deploy', 'source'])
        expect(() =>
          validateBackendRolloutPlan({
            ...plan,
            changeSet: { changes: [{ address: `service.${service}`, field }] },
          }),
        ).toThrow('onda operacional')
  })
  test('workflow puts preflight before apply and release barrier before all app dispatches', () => {
    const workflow = Bun.YAML.parse(
      readFileSync(new URL('../../.github/workflows/ci.yml', import.meta.url), 'utf8'),
    ) as { jobs: { 'deploy-staging': { steps: Array<{ name?: string; run?: string }> } } }
    const steps = workflow.jobs['deploy-staging'].steps
    const probe = steps.findIndex((step) =>
      step.run?.includes('kids-journey-rollout.mjs preflight'),
    )
    const apply = steps.findIndex((step) => step.run?.includes('railway-config.mjs apply'))
    expect(probe).toBeGreaterThanOrEqual(0)
    expect(probe).toBeLessThan(apply)
    expect(steps[apply]!.run!.indexOf('kids-journey-rollout.mjs check-plan')).toBeLessThan(
      steps[apply]!.run!.indexOf('railway-config.mjs apply'),
    )
    const release = steps.find((step) => step.run?.includes('kids-journey-rollout.mjs deploy'))!
      .run!
    expect(release.indexOf('kids-journey-rollout.mjs deploy')).toBeLessThan(
      release.indexOf(`for s in "\${!WANT[@]}"; do disparar`),
    )
    expect(release).toContain('kids-journey-rollout.mjs verify')
    expect(release).toContain("unset 'WANT[members]' 'WANT[auth]'")
  })
})
