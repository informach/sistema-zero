import { expect, test } from 'bun:test'
import { initialKidsJourneyPolicy } from '@sistemazero/core/journey'
import { KidsSeedCaptureService } from '../../src/application/kids-journey/kids-seed-capture.service'
import type {
  KidsJourneyAuthCapture,
  KidsJourneyPreparation,
} from '../../src/domain/ports/kids-journey-repository.port'
import type { KidsProfileCohortQuery } from '../../src/domain/ports/kids-profile-cohort-gateway.port'

const first = {
  userId: '10000000-0000-4000-8000-000000000000',
  accountId: '30000000-0000-4000-8000-000000000000',
}
const second = { userId: '20000000-0000-4000-8000-000000000000', accountId: first.accountId }
function preparation(authCapture: KidsJourneyAuthCapture | null = null): KidsJourneyPreparation {
  return {
    id: '40000000-0000-4000-8000-000000000000',
    expectedVersion: 0,
    sourcePolicy: initialKidsJourneyPolicy(),
    candidatePolicy: initialKidsJourneyPolicy(),
    draftHash: 'a'.repeat(64),
    catalogHash: 'b'.repeat(64),
    cohortHash: null,
    origin: 'seed',
    captureStage: 'auth',
    captureCursor: null,
    authCapture,
    catalog: [],
    cursor: null,
    upperBound: null,
    processed: 0,
    status: 'capturing',
    actorKind: 'system',
    actorId: null,
    reason: 'Unit fixture for the capture protocol',
    createdAt: new Date(0),
    updatedAt: new Date(0),
  }
}
type Port = ConstructorParameters<typeof KidsSeedCaptureService>[0]

test('a fresh orchestrator resumes the persisted owner cursor after an interrupted page', async () => {
  const current = preparation()
  let interrupt = true
  let sealed = 0
  const saved: string[] = []
  const queries: KidsProfileCohortQuery[] = []
  const port: Port = {
    async getPreparation() {
      return structuredClone(current)
    },
    async startSeedOwnerCapture(_id, upperBound) {
      current.authCapture = { upperBound, cursor: null }
      return structuredClone(current)
    },
    async appendSeedOwner(input) {
      if (input.owner.userId === second.userId && interrupt) {
        interrupt = false
        throw new Error('Interrupted remote page processing')
      }
      expect(input.expectedCursor).toBe(current.authCapture!.cursor)
      saved.push(input.owner.userId)
      current.authCapture!.cursor = input.owner.userId
      return structuredClone(current)
    },
    async sealSeedOwners(_id, cursor) {
      expect(cursor).toBe(second.userId)
      sealed++
      current.captureStage = 'members'
      return structuredClone(current)
    },
  }
  const auth = {
    async readPage(query: KidsProfileCohortQuery) {
      queries.push(structuredClone(query))
      return {
        upperBound: second.userId,
        cursor: second.userId,
        done: true,
        owners: query.kind === 'start' ? [first, second] : [second],
      }
    },
  }
  await expect(new KidsSeedCaptureService(port, auth).advance(current.id)).rejects.toThrow(
    'Interrupted',
  )
  expect(saved).toEqual([first.userId])
  expect(sealed).toBe(0)
  expect((await new KidsSeedCaptureService(port, auth).advance(current.id))!.captureStage).toBe(
    'members',
  )
  expect(saved).toEqual([first.userId, second.userId])
  expect(queries).toEqual([
    { kind: 'start', limit: 20 },
    { kind: 'continue', upperBound: second.userId, cursor: first.userId, limit: 20 },
  ])
  expect(sealed).toBe(1)
})

test('a concurrent start cannot replace the durable bound or append its mismatched page', async () => {
  const initial = preparation()
  const port: Port = {
    async getPreparation() {
      return initial
    },
    async startSeedOwnerCapture() {
      return preparation({ upperBound: first.userId, cursor: null })
    },
    async appendSeedOwner() {
      throw new Error('Must not append a page for another bound')
    },
    async sealSeedOwners() {
      throw new Error('Must not seal a page for another bound')
    },
  }
  const service = new KidsSeedCaptureService(port, {
    async readPage() {
      return { upperBound: second.userId, cursor: second.userId, done: true, owners: [second] }
    },
  })
  expect(await service.advance(initial.id)).toBeNull()
})

test('an Auth failure leaves an unknown cohort unsealed; a confirmed empty bound may finish', async () => {
  let current = preparation()
  let seals = 0
  let starts = 0
  const port: Port = {
    async getPreparation() {
      return current
    },
    async startSeedOwnerCapture() {
      starts++
      throw new Error('Must not start after failed Auth')
    },
    async appendSeedOwner() {
      throw new Error('No owners returned')
    },
    async sealSeedOwners(_id, cursor) {
      expect(cursor).toBeNull()
      seals++
      return current
    },
  }
  const service = new KidsSeedCaptureService(port, {
    async readPage() {
      throw new Error('Auth unavailable')
    },
  })
  await expect(service.advance(current.id)).rejects.toThrow('Auth unavailable')
  expect(starts).toBe(0)
  expect(seals).toBe(0)
  current = preparation({ upperBound: null, cursor: null })
  expect(await service.advance(current.id)).not.toBeNull()
  expect(seals).toBe(1)
})
