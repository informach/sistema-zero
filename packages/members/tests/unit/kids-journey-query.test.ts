import { expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { initialKidsJourneyPolicy } from '@sistemazero/core/journey'
import { KidsJourneyQueryService } from '../../src/application/kids-journey/kids-journey-query.service'
import {
  KidsJourneyInitializingError,
  KidsJourneyUnavailableError,
} from '../../src/domain/kids-journey/kids-journey.errors'
import type {
  KidsJourneyOwner,
  KidsJourneySnapshot,
} from '../../src/domain/ports/kids-journey-repository.port'

const first = { userId: randomUUID(), accountId: randomUUID() }
const second = { userId: randomUUID(), accountId: first.accountId }
function snapshot(owners: readonly KidsJourneyOwner[] = [first]): KidsJourneySnapshot {
  return {
    policy: {
      phase: 'published',
      version: 1,
      policy: initialKidsJourneyPolicy(),
      updatedAt: new Date(0),
    },
    catalog: [],
    profiles: new Map(
      owners.map((owner) => [
        owner.userId,
        {
          ...owner,
          registered: true,
          milestones: [],
          earned: {
            level: 'coder',
            capabilities: ['studio', 'pinta'],
            courseAccess: { entry: [], expanded: [], reward: [] },
          },
        },
      ]),
    ),
  }
}

test('initializing and invalid publication states never look like a Noob child', async () => {
  for (const state of [
    { phase: 'initializing' as const, version: 0, error: KidsJourneyInitializingError },
    { phase: 'initializing' as const, version: 1, error: KidsJourneyUnavailableError },
    { phase: 'published' as const, version: 0, error: KidsJourneyUnavailableError },
  ]) {
    const current = snapshot()
    current.policy = { ...current.policy, phase: state.phase, version: state.version }
    const service = new KidsJourneyQueryService({
      async readSnapshot() {
        return current
      },
    })
    await expect(service.get(first)).rejects.toBeInstanceOf(state.error)
  }
})

test('missing registration or mismatched owner is unavailable even when a simulation has zero earned', async () => {
  for (const change of ['unregistered', 'missing', 'wrong-account'] as const) {
    const current = snapshot()
    const profile = current.profiles.get(first.userId)!
    current.profiles = new Map(
      change === 'missing'
        ? []
        : [
            [
              first.userId,
              {
                ...profile,
                registered: change !== 'unregistered',
                accountId: change === 'wrong-account' ? randomUUID() : first.accountId,
              },
            ],
          ],
    )
    const service = new KidsJourneyQueryService({
      async readSnapshot() {
        return current
      },
    })
    await expect(service.get(first)).rejects.toBeInstanceOf(KidsJourneyUnavailableError)
  }
})

test('a batch uses one consistent snapshot and preserves ranks/capabilities instead of the hardcoded ladder', async () => {
  const current = snapshot([first, second])
  const policy = current.policy.policy
  current.policy.policy = {
    ...policy,
    steps: policy.steps.map((step) => ({ ...step, capabilities: [] })),
  }
  const calls: KidsJourneyOwner[][] = []
  const service = new KidsJourneyQueryService({
    async readSnapshot(owners) {
      calls.push(owners.map((owner) => ({ ...owner })))
      return current
    },
  })
  const views = await service.getMany([first, second])
  expect(calls).toEqual([[first, second]])
  expect(views.size).toBe(2)
  for (const owner of [first, second]) {
    expect(views.get(owner.userId)!.earned.level).toBe('coder')
    expect(views.get(owner.userId)!.earned.capabilities).toEqual(['studio', 'pinta'])
  }
})

test('ownership is captured before an awaited repository read and caller mutation cannot redirect the result', async () => {
  const owner = { ...first }
  let release!: () => void
  const barrier = new Promise<void>((resolve) => {
    release = resolve
  })
  const calls: KidsJourneyOwner[][] = []
  const service = new KidsJourneyQueryService({
    async readSnapshot(owners) {
      calls.push(owners.map((value) => ({ ...value })))
      await barrier
      return snapshot()
    },
  })
  const result = service.get(owner)
  owner.userId = second.userId
  owner.accountId = randomUUID()
  release()
  expect((await result).earned.level).toBe('coder')
  expect(calls).toEqual([[first]])
})

test('a failed snapshot read propagates failure and an unknown course never becomes an unlocked course', async () => {
  const failure = new Error('Storage unavailable')
  const failing = new KidsJourneyQueryService({
    async readSnapshot() {
      throw failure
    },
  })
  await expect(failing.get(first)).rejects.toBe(failure)
  const service = new KidsJourneyQueryService({
    async readSnapshot() {
      return snapshot()
    },
  })
  await expect(service.courseLocks(first, [randomUUID()])).rejects.toBeInstanceOf(
    KidsJourneyUnavailableError,
  )
})
