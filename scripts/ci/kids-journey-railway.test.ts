import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { stagingJourney } from '../release/kids-journey-bootstrap.mjs'
import {
  createRailwayPorts,
  describeKidsJourneyRolloutFailure,
  prepareSsh,
  validateBackendRolloutPlan,
} from './kids-journey-rollout.mjs'

const sha = 'a'.repeat(40),
  oldSha = 'b'.repeat(40)
const oldId = '44444444-4444-4444-8444-444444444444'
const newId = '55555555-5555-4555-8555-555555555555'

function transport(
  options: {
    relayOnly?: boolean
    retire?: boolean
    wrongSha?: boolean
    hideOldAfterProbe?: boolean
    failedProbeCheck?: 'environment' | 'service' | 'deployment' | 'commit' | 'required'
    probeStderr?: string
    failAt?: 'cli' | 'openssh' | 'inventory' | 'probe'
  } = {},
) {
  const commands: string[][] = [],
    queries: string[] = []
  let deployed = false,
    polls = 0
  let activeReads = 0
  const ports = createRailwayPorts(
    sha,
    { RAILWAY_TOKEN: 'local-test-only' },
    '/isolated/identity',
    {
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
        if (options.failAt === 'inventory')
          return {
            ok: true,
            json: async () => ({ errors: [{ message: 'Not Authorized' }] }),
          }
        const { query, variables } = JSON.parse(request.body)
        queries.push(query)
        let data: unknown
        if (query.startsWith('mutation')) {
          deployed = true
          data = { serviceInstanceDeployV2: newId }
        } else if (query.includes('activeDeployments'))
          data = {
            serviceInstance: {
              activeDeployments:
                !deployed && options.hideOldAfterProbe && activeReads++ >= 2
                  ? []
                  : [
                      {
                        id: deployed ? newId : oldId,
                        status: 'SUCCESS',
                        meta: { commitHash: deployed ? sha : oldSha },
                      },
                    ],
            },
          }
        else
          data = {
            deployment: {
              id: variables.id,
              status:
                variables.id === oldId
                  ? options.retire && polls > 0
                    ? 'REMOVED'
                    : 'SUCCESS'
                  : 'SUCCESS',
              meta: { commitHash: options.wrongSha ? oldSha : sha },
            },
          }
        return { ok: true, json: async () => ({ data }) }
      },
      sleep: async () => {
        polls++
      },
    },
  )
  return { ports, commands, queries, polls: () => polls }
}

describe('actual Railway boundary without remote I/O', () => {
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
    expect(f.polls()).toBe(60)
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
