import { expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { initialKidsJourneyPolicy, pauseKidsJourneyPolicy } from '@sistemazero/core/journey'
import { KidsJourneyConfigurationService } from '../../src/application/kids-journey/kids-journey-configuration.service'
import { KidsJourneyConflictError } from '../../src/domain/kids-journey/kids-journey.errors'
import type { KidsJourneyPreparation, KidsJourneySnapshot } from '../../src/domain/ports/kids-journey-repository.port'

type Port = ConstructorParameters<typeof KidsJourneyConfigurationService>[0]
const owner = { userId: randomUUID(), accountId: randomUUID() }
const actorId = randomUUID()
const policy = initialKidsJourneyPolicy()
function snapshot(): KidsJourneySnapshot {
  return {
    policy: { phase: 'published', version: 1, policy, updatedAt: new Date(0) }, catalog: [],
    profiles: new Map([[owner.userId, { ...owner, registered: true, milestones: [],
      earned: { level: 'coder', capabilities: ['studio', 'pinta'], courseAccess: { entry: [], expanded: [], reward: [] } },
    }]]),
  }
}
function preparation(): KidsJourneyPreparation {
  return {
    id: randomUUID(), expectedVersion: 1, sourcePolicy: policy, candidatePolicy: policy,
    draftHash: 'a'.repeat(64), catalogHash: 'b'.repeat(64), cohortHash: 'c'.repeat(64),
    origin: 'configuration', captureStage: 'done', captureCursor: null, authCapture: null,
    catalog: [], cursor: null, upperBound: null, processed: 0, status: 'ready',
    actorKind: 'user', actorId, reason: 'Revisão pedagógica', createdAt: new Date(0), updatedAt: new Date(0),
  }
}
function port(overrides: Partial<Port> = {}): Port {
  const forbidden = async (): Promise<never> => { throw new Error('Unexpected persistence mutation') }
  return {
    async readSnapshot() { return snapshot() }, createPreparation: forbidden,
    getPreparation: forbidden, advanceCapture: forbidden, advancePreparation: forbidden,
    publishPrepared: forbidden, listHistory: forbidden, ...overrides,
  }
}

test('preview is read-only, labels its selected sample, and exposes mode changes even with no requirement diff', async () => {
  let reads = 0
  const service = new KidsJourneyConfigurationService(port({ async readSnapshot(owners) {
    reads++
    expect(owners).toEqual([owner])
    return snapshot()
  } }))
  const result = await service.preview({ expectedVersion: 1, policy: pauseKidsJourneyPolicy(policy) }, [owner])
  expect(reads).toBe(1)
  expect(result.scope).toBe('selected-profiles')
  expect(result.sample).toHaveLength(1)
  expect(result.newLearner.changes).toEqual([])
  expect(result.newLearner.before.mode).toBe('active')
  expect(result.newLearner.after.mode).toBe('paused')
  expect(result.sample[0]!.impact.after.earned.capabilities).toEqual(['studio', 'pinta'])
})

test('malformed/zero-version input is rejected before reading or persisting a policy', async () => {
  const service = new KidsJourneyConfigurationService(port({ readSnapshot: async () => { throw new Error('must not read') } }))
  await expect(service.prepare({ expectedVersion: 0, policy, actorId, reason: 'Ajuste' })).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  await expect(service.preview({ expectedVersion: 1, policy: {} })).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
})

test('a stale preview version cannot create a preparation', async () => {
  const service = new KidsJourneyConfigurationService(port())
  await expect(service.prepare({ expectedVersion: 2, policy, actorId, reason: 'Ajuste' })).rejects.toBeInstanceOf(KidsJourneyConflictError)
})

test('configuration input is captured before the preparation read and can never select a system actor', async () => {
  const current = preparation()
  let release!: () => void
  const barrier = new Promise<void>((resolve) => { release = resolve })
  const published: unknown[] = []
  const service = new KidsJourneyConfigurationService(port({
    async getPreparation() { await barrier; return current },
    async publishPrepared(input) {
      published.push(input)
      return { phase: 'published', version: 2, policy, updatedAt: new Date(0) }
    },
  }))
  const input = {
    preparationId: current.id, expectedVersion: 1, draftHash: current.draftHash,
    catalogHash: current.catalogHash, cohortHash: current.cohortHash!, actorId,
  }
  const publication = service.publish(input)
  input.actorId = randomUUID()
  input.expectedVersion = 9
  input.catalogHash = 'f'.repeat(64)
  release()
  expect((await publication).version).toBe(2)
  expect(published).toEqual([{
    preparationId: current.id, expectedVersion: 1, draftHash: current.draftHash,
    catalogHash: current.catalogHash, cohortHash: current.cohortHash,
    actor: { kind: 'user', id: actorId },
  }])
  await expect(service.publish({ ...input, actor: { kind: 'system' } })).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
})

test('Admin publication never publishes a bootstrap preparation', async () => {
  const current = preparation()
  current.origin = 'seed'
  current.actorKind = 'system'
  current.actorId = null
  const service = new KidsJourneyConfigurationService(port({ async getPreparation() { return current } }))
  await expect(service.publish({
    preparationId: current.id, expectedVersion: 1, draftHash: current.draftHash,
    catalogHash: current.catalogHash, cohortHash: current.cohortHash!, actorId,
  })).rejects.toMatchObject({ code: 'KIDS_JOURNEY_PREPARATION_MISSING' })
})
