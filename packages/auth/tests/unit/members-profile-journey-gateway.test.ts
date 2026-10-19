import { expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { createMembersProfileJourneyGateway } from '../../src/infrastructure/gateways/members-profile-journey.gateway'

const owner = { profileId: randomUUID(), accountUserId: randomUUID() }
function gateway(admissionToken: string | undefined, fetchImpl: typeof fetch) {
  return createMembersProfileJourneyGateway({
    baseUrl: 'http://members.test',
    admissionToken,
    timeoutMs: 1_000,
    fetchImpl,
  })
}

test('missing dedicated credential never falls back to an unauthenticated request', async () => {
  let called = false
  const client = gateway(
    undefined,
    Object.assign(
      async () => {
        called = true
        return new Response('{}')
      },
      { preconnect() {} },
    ),
  )
  await expect(client.initialize(owner)).rejects.toThrow('credential')
  expect(called).toBe(false)
})

test('admission sends ownership only and validates that the receipt belongs to that owner', async () => {
  const captured: unknown[] = []
  const client = gateway(
    'test-admission-token',
    Object.assign(
      async (url: string | URL | Request, init?: RequestInit) => {
        expect(String(url)).toBe('http://members.test/members/internal/kids-journey/admission')
        captured.push(JSON.parse(String(init?.body)))
        return Response.json({
          userId: owner.profileId,
          accountId: owner.accountUserId,
          policyVersion: 3,
        })
      },
      { preconnect() {} },
    ),
  )
  expect(await client.initialize(owner)).toBe('admitted')
  expect(captured).toEqual([{ userId: owner.profileId, accountId: owner.accountUserId }])
  const wrong = gateway(
    'test-admission-token',
    Object.assign(
      async () =>
        Response.json({
          userId: randomUUID(),
          accountId: owner.accountUserId,
          policyVersion: 3,
        }),
      { preconnect() {} },
    ),
  )
  await expect(wrong.initialize(owner)).rejects.toThrow('another owner')
})

test('an initializing response stays pending and invalid/error receipts are not ACKs', async () => {
  const pending = gateway(
    'test-admission-token',
    Object.assign(async () => Response.json({ status: 'not_ready' }, { status: 202 }), {
      preconnect() {},
    }),
  )
  expect(await pending.initialize(owner)).toBe('not_ready')
  const invalid = gateway(
    'test-admission-token',
    Object.assign(
      async () =>
        Response.json({
          userId: owner.profileId,
          accountId: owner.accountUserId,
          policyVersion: 0,
        }),
      { preconnect() {} },
    ),
  )
  await expect(invalid.initialize(owner)).rejects.toThrow()
})
