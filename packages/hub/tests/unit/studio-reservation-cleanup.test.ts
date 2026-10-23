import { expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { canonicalHmacMessage, verifyHmacSignature } from '@sistemazero/core/security'
import type { StudioReservationRetirement } from '@sistemazero/core/studio/publication-reservation'
import { DeliverStudioReservationCleanupsService } from '../../src/application/showcase/deliver-studio-reservation-cleanups.service'
import { createStudioReservationCleanupHttpGateway } from '../../src/infrastructure/gateways/studio-reservation-cleanup-http.gateway'

function payload(audience: 'kids' | 'adult' = 'kids'): StudioReservationRetirement {
  const reservationId = randomUUID(),
    authorId = randomUUID()
  return {
    version: 1,
    deliveryId: `studio-reservation-cleanup:${reservationId}`,
    reservationId,
    playId: randomUUID(),
    authorId,
    accountId: audience === 'adult' ? authorId : randomUUID(),
    audience,
    snapshotHash: 'a'.repeat(64),
    context: { kind: 'free', audience },
  }
}

test('retirement failure survives worker replacement; acknowledgement requires successful durable acceptance', async () => {
  const value = payload()
  let acked = false
  const repository = {
    claim: async () => (acked ? null : value),
    acknowledge: async (id: string) => {
      expect(id).toBe(value.reservationId)
      acked = true
    },
  }
  const clock = () => new Date()
  expect(
    await new DeliverStudioReservationCleanupsService(
      repository,
      { cleanupReservation: async () => false },
      clock,
    ).execute(),
  ).toBe(true)
  expect(acked).toBe(false)
  expect(
    await new DeliverStudioReservationCleanupsService(
      repository,
      {
        cleanupReservation: async (received) => {
          expect(received).toEqual(value)
          return true
        },
      },
      clock,
    ).execute(),
  ).toBe(true)
  expect(acked).toBe(true)
})

test('retirement transport binds delivery ID/body/path, keeps audience and captures data before retries', async () => {
  const value = payload('adult'),
    expected = structuredClone(value),
    secret = 'qa-reservation-cleanup-secret'
  const now = new Date(),
    path = '/api/studio/reservation-cleanup'
  let calls = 0,
    cancelled = 0
  const received: { url: string; body: unknown; deliveryId: string | null; valid: boolean }[] = []
  const gateway = createStudioReservationCleanupHttpGateway({
    baseUrl: 'https://kids.test',
    adultBaseUrl: 'https://adult.test',
    hmacSecret: secret,
    now: () => now,
    fetchImpl: Object.assign(
      async (url: string | URL | Request, init?: RequestInit) => {
        calls++
        const headers = new Headers(init?.headers),
          body = String(init?.body)
        const result = verifyHmacSignature({
          secret,
          signatureHeader: headers.get('x-signature') ?? undefined,
          body: canonicalHmacMessage({
            method: 'POST',
            path,
            deliveryId: expected.deliveryId,
            body,
          }),
          nowSeconds: Math.floor(now.getTime() / 1000),
          toleranceSeconds: 10,
        })
        received.push({
          url: String(url),
          body: JSON.parse(body),
          deliveryId: headers.get('x-delivery-id'),
          valid: result.valid,
        })
        value.playId = randomUUID()
        return new Response(
          new ReadableStream({
            cancel() {
              cancelled++
            },
          }),
          { status: calls === 1 ? 502 : 200 },
        )
      },
      { preconnect: fetch.preconnect },
    ),
  })
  expect(await gateway.cleanupReservation(value)).toBe(true)
  expect(calls).toBe(2)
  expect(received).toEqual(
    Array.from({ length: 2 }, () => ({
      url: `https://adult.test${path}`,
      body: expected,
      deliveryId: expected.deliveryId,
      valid: true,
    })),
  )
  expect(cancelled).toBe(2)
  expect(
    await createStudioReservationCleanupHttpGateway({
      baseUrl: 'https://kids.test',
      hmacSecret: secret,
    }).cleanupReservation(payload('adult')),
  ).toBe(false)
})

test('each retirement drain is bounded even when a gateway refuses every delivery', async () => {
  let calls = 0
  const service = new DeliverStudioReservationCleanupsService(
    {
      claim: async () => payload(),
      acknowledge: async () => {
        throw new Error('Unexpected ACK')
      },
    },
    {
      cleanupReservation: async () => {
        calls++
        return false
      },
    },
    () => new Date(),
  )
  expect(await service.drain()).toEqual({ attempted: 4 })
  expect(calls).toBe(4)
})
