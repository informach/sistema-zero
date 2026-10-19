import { expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { initialKidsJourneyPolicy } from '@sistemazero/core/journey'
import { KidsJourneyProfilesService } from '../../src/application/kids-journey/kids-journey-profiles.service'
import { KidsJourneyQueryService } from '../../src/application/kids-journey/kids-journey-query.service'
import type { KidsJourneyOwner } from '../../src/domain/ports/kids-journey-repository.port'

const first = { userId: randomUUID(), accountId: randomUUID() }
const second = { userId: randomUUID(), accountId: randomUUID() }
function setup() {
  const reads: KidsJourneyOwner[][] = [],
    lookups: string[][] = []
  const query = new KidsJourneyQueryService({
    async readSnapshot(owners) {
      reads.push(owners.map((owner) => ({ ...owner })))
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
                level: 'noob',
                capabilities: [],
                courseAccess: { entry: [], expanded: [], reward: [] },
              },
            },
          ]),
        ),
      }
    },
  })
  const service = new KidsJourneyProfilesService(
    {
      async listOwners(ids) {
        lookups.push([...ids])
        return [first, second].filter((owner) => ids.includes(owner.userId))
      },
    },
    query,
  )
  return { service, reads, lookups }
}

test('batch inspection uses canonical owners, includes a registered zero-XP profile and omits missing identities', async () => {
  const fixture = setup(),
    missing = randomUUID()
  const result = await fixture.service.getMany([first.userId, second.userId, first.userId, missing])
  expect([...result.keys()]).toEqual([first.userId, second.userId])
  expect(result.get(first.userId)?.earned.level).toBe('noob')
  expect(result.has(missing)).toBe(false)
  expect(fixture.lookups).toEqual([[first.userId, second.userId, missing]])
  expect(fixture.reads).toEqual([[first, second]])
})

test('account reports filter foreign owners before the snapshot instead of treating requested IDs as authority', async () => {
  const fixture = setup()
  const result = await fixture.service.getOwned(first.accountId, [first.userId, second.userId])
  expect([...result.keys()]).toEqual([first.userId])
  expect(fixture.reads).toEqual([[first]])
})

test('empty registered membership still reads policy and registry failure cannot become an empty or Noob response', async () => {
  const fixture = setup()
  expect((await fixture.service.getMany([randomUUID()])).size).toBe(0)
  expect(fixture.reads).toEqual([[]])
  const failure = new Error('Registry unavailable')
  const service = new KidsJourneyProfilesService(
    {
      async listOwners() {
        throw failure
      },
    },
    {
      async getMany() {
        throw new Error('No snapshot after registry failure')
      },
      async getManyStates() {
        throw new Error('No snapshot after registry failure')
      },
    },
  )
  await expect(service.getMany([first.userId])).rejects.toBe(failure)
  await expect(
    fixture.service.getMany(Array.from({ length: 201 }, () => randomUUID())),
  ).rejects.toThrow()
})

test('existing hex-format identities accepted by Auth/HTTP are retained and normalized without an RFC-version restriction', async () => {
  const userId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    accountId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
  const calls: unknown[] = []
  const query = new KidsJourneyQueryService({
    async readSnapshot(owners) {
      calls.push(owners)
      return {
        policy: {
          phase: 'published',
          version: 1,
          policy: initialKidsJourneyPolicy(),
          updatedAt: new Date(0),
        },
        catalog: [],
        profiles: new Map([
          [
            userId,
            {
              userId,
              accountId,
              registered: true,
              milestones: [],
              earned: {
                level: 'coder',
                capabilities: [],
                courseAccess: { entry: [], expanded: [], reward: [] },
              },
            },
          ],
        ]),
      }
    },
  })
  const service = new KidsJourneyProfilesService(
    {
      async listOwners(ids) {
        calls.push(ids)
        return ids.includes(userId) ? [{ userId, accountId }] : []
      },
    },
    query,
  )
  const result = await service.getOwned(accountId.toUpperCase(), [userId.toUpperCase()])
  expect(result.get(userId)?.earned.level).toBe('coder')
  expect(calls).toEqual([[userId], [{ userId, accountId }]])
  await expect(service.getMany(['not-an-id'])).rejects.toThrow()
})
