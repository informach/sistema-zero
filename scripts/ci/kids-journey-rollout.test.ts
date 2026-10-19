import { describe, expect, test } from 'bun:test'
import { runKidsJourneyRollout } from './kids-journey-rollout.mjs'

const sha = 'a'.repeat(40)
const preparationId = '11111111-1111-4111-8111-111111111111'

function fixture(options: { published?: boolean; fail?: string; wrongId?: boolean } = {}) {
  const calls: string[] = []
  let advances = 0
  const ports = {
    async preflight() {
      calls.push('preflight')
      if (options.fail === 'preflight') throw new Error('SSH unavailable')
    },
    async deploy(service: string) {
      calls.push(`deploy:${service}`)
      return `${service}-deployment`
    },
    async waitRetired(service: string, id: string) {
      calls.push(`retired:${service}:${id}`)
      if (options.fail === service) throw new Error('Old deployment has not retired')
    },
    async remote(action: string, id: string, input?: { preparationId?: string }) {
      calls.push(`remote:${action}:${id}${input?.preparationId ? `:${input.preparationId}` : ''}`)
      if (options.fail === action) throw new Error(`${action} failed`)
      if (action === 'initialize')
        return options.published || advances > 1
          ? { status: 'already-published', version: 3 }
          : { status: 'initializing', version: 0, preparationId }
      if (action === 'advance')
        return {
          status: 'advanced',
          phase: ++advances > 1 ? 'ready' : 'preparing',
          preparationId: options.wrongId ? crypto.randomUUID() : preparationId,
          processed: advances,
          progress: String(advances).repeat(64),
        }
      if (action === 'publish') return { status: 'published', version: 1 }
      if (action === 'verify') return { status: 'published', version: 3 }
      return { status: 'migrated' }
    },
    now: () => 0,
    log: () => {},
  }
  return { calls, ports }
}

describe('staging canonical Kids deployment barrier', () => {
  test('orders migration/V0 before new Auth, retirement before capture, and V1 before release', async () => {
    const f = fixture()
    const result = await runKidsJourneyRollout({ sha, mode: 'deploy' }, f.ports)
    expect(f.calls).toEqual([
      'preflight',
      'deploy:members',
      'retired:members:members-deployment',
      'remote:migrate:members-deployment',
      'remote:initialize:members-deployment',
      'deploy:auth',
      'retired:auth:auth-deployment',
      'retired:auth:auth-deployment',
      `remote:advance:members-deployment:${preparationId}`,
      'retired:auth:auth-deployment',
      `remote:advance:members-deployment:${preparationId}`,
      'retired:auth:auth-deployment',
      `remote:publish:members-deployment:${preparationId}`,
      'remote:initialize:members-deployment',
      'retired:auth:auth-deployment',
    ])
    expect(result).toEqual({ status: 'published', version: 3 })
  })

  test('already-published never captures or replaces the configured policy', async () => {
    const f = fixture({ published: true })
    expect(await runKidsJourneyRollout({ sha, mode: 'deploy' }, f.ports)).toEqual({
      status: 'published',
      version: 3,
    })
    expect(f.calls.some((call) => /remote:(advance|publish):/.test(call))).toBe(false)
    expect(f.calls).toContain('retired:auth:auth-deployment')
    expect(f.calls.at(-1)).toBe('remote:verify:members-deployment')
  })

  test('published fast path uses the final revision after Auth rollout, and a failed verify blocks release', async () => {
    const f = fixture({ published: true })
    const original = f.ports.remote
    f.ports.remote = (action, id, input) =>
      action === 'verify'
        ? Promise.resolve({ status: 'published', version: 9 })
        : original(action, id, input)
    expect((await runKidsJourneyRollout({ sha, mode: 'deploy' }, f.ports)).version).toBe(9)
    const g = fixture({ published: true, fail: 'verify' })
    await expect(runKidsJourneyRollout({ sha, mode: 'deploy' }, g.ports)).rejects.toThrow(
      'verify failed',
    )
  })

  test.each([
    'preflight',
    'migrate',
    'initialize',
    'auth',
    'advance',
    'publish',
  ])('failure at %s never returns a release barrier', async (fail) => {
    const f = fixture({ fail })
    await expect(runKidsJourneyRollout({ sha, mode: 'deploy' }, f.ports)).rejects.toThrow()
    if (fail === 'preflight') expect(f.calls).toEqual(['preflight'])
    if (fail === 'auth')
      expect(f.calls.some((call) => call.startsWith('remote:advance'))).toBe(false)
  })

  test('rejects a changed preparation identity instead of switching the cursor', async () => {
    const f = fixture({ wrongId: true })
    await expect(runKidsJourneyRollout({ sha, mode: 'deploy' }, f.ports)).rejects.toThrow(
      'preparação',
    )
    expect(f.calls.some((call) => call.startsWith('remote:publish'))).toBe(false)
  })

  test('app-only mode is readonly and does not redeploy or initialize backend', async () => {
    const f = fixture()
    expect(await runKidsJourneyRollout({ sha, mode: 'verify' }, f.ports)).toEqual({
      status: 'published',
      version: 3,
    })
    expect(f.calls).toEqual(['preflight', 'remote:verify:active'])
  })
  test('an Auth deployment change during capture prevents the next batch and publication', async () => {
    const f = fixture()
    let checks = 0
    const previous = f.ports.waitRetired
    f.ports.waitRetired = async (service, id) => {
      if (service === 'auth' && ++checks === 3) throw new Error('Auth changed during capture')
      return previous(service, id)
    }
    await expect(runKidsJourneyRollout({ sha, mode: 'deploy' }, f.ports)).rejects.toThrow(
      'Auth changed',
    )
    expect(f.calls.filter((call) => call.startsWith('remote:advance'))).toHaveLength(1)
    expect(f.calls.some((call) => call.startsWith('remote:publish'))).toBe(false)
  })

  test('bounds successful but unending preparation without publishing', async () => {
    const f = fixture()
    f.ports.remote = async (action) =>
      action === 'initialize'
        ? { status: 'initializing', version: 0, preparationId }
        : {
            status: action === 'advance' ? 'advanced' : 'migrated',
            phase: 'preparing',
            preparationId,
            processed: 0,
            progress: crypto.randomUUID().replaceAll('-', '').repeat(2),
          }
    await expect(
      runKidsJourneyRollout({ sha, mode: 'deploy', maxAdvances: 2 }, f.ports),
    ).rejects.toThrow('limite')
  })

  test('repeated canonical cursors fail promptly but zero-count transitions are valid', async () => {
    const f = fixture()
    const original = f.ports.remote
    let advances = 0
    f.ports.remote = async (action, id, input) =>
      action === 'advance'
        ? {
            status: 'advanced',
            phase: 'capturing',
            preparationId,
            processed: 0,
            progress: 'c'.repeat(64),
          }
        : original(action, id, input)
    await expect(
      runKidsJourneyRollout({ sha, mode: 'deploy', maxAdvances: 3 }, f.ports),
    ).rejects.toThrow('sem progresso')
    const g = fixture()
    const previous = g.ports.remote
    g.ports.remote = async (action, id, input) =>
      action === 'advance'
        ? {
            status: 'advanced',
            phase: ++advances > 1 ? 'ready' : 'capturing',
            preparationId,
            processed: 0,
            progress: String(advances).repeat(64),
          }
        : action === 'initialize' && advances > 1
          ? { status: 'already-published', version: 1 }
          : previous(action, id, input)
    expect((await runKidsJourneyRollout({ sha, mode: 'deploy' }, g.ports)).status).toBe('published')
  })
})
