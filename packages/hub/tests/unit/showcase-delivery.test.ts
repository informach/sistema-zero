import { expect, test } from 'bun:test'
import { DeliverShowcaseService } from '../../src/application/showcase/deliver-showcase.service'
import type { ShowcaseDeliveryRepository } from '../../src/domain/ports/showcase-delivery-repository.port'

test('failed delivery survives worker replacement and retries with a stable id', async () => {
  let acknowledged = false
  const payload = {
    userId: 'student',
    accountId: 'parent',
    courseId: 'course',
    audience: 'kids' as const,
  }
  const store: ShowcaseDeliveryRepository = {
    findStatus: async () => (acknowledged ? 'delivered' : 'pending'),
    claim: async () => (acknowledged ? null : { threadId: 'thread', payload }),
    acknowledge: async () => {
      acknowledged = true
    },
  }
  const sentIds: (string | undefined)[] = []
  const clock = () => new Date('2026-09-07')
  const failed = new DeliverShowcaseService(
    store,
    {
      notifyShowcasePublished: async (_payload, id) => {
        sentIds.push(id)
        return false
      },
    },
    clock,
  )
  await failed.execute()
  expect(acknowledged).toBe(false)
  const restarted = new DeliverShowcaseService(
    store,
    {
      notifyShowcasePublished: async (received, id) => {
        expect(received).toEqual(payload)
        sentIds.push(id)
        return true
      },
    },
    clock,
  )
  expect(await restarted.execute()).toBe(true)
  expect(acknowledged).toBe(true)
  expect(await restarted.execute()).toBe(false)
  expect(sentIds).toEqual(['showcase:thread', 'showcase:thread'])
})
