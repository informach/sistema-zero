import { expect, test } from 'bun:test'
import { DeliverStudioCleanupsService } from '../../src/application/showcase/deliver-studio-cleanups.service'
import type { StudioCleanupRepository } from '../../src/domain/ports/studio-cleanup-repository.port'
import { createStudioArtifactHttpGateway } from '../../src/infrastructure/gateways/studio-artifact-http.gateway'

test('failure never acknowledges cleanup; a replacement worker retries the immutable payload', async () => {
  let acknowledged = false
  const payload = {
    authorId: crypto.randomUUID(),
    audience: 'adult' as const,
    playId: crypto.randomUUID(),
    coverUrl: 'https://art.test/cover.webp',
  }
  const repository: StudioCleanupRepository = {
    claim: async (_now, audience) => {
      expect(audience).toBe('adult')
      return acknowledged ? null : { threadId: 'thread', payload }
    },
    acknowledge: async () => {
      acknowledged = true
    },
  }
  const clock = () => new Date('2026-10-19')
  await new DeliverStudioCleanupsService(
    repository,
    {
      cleanupShowcaseArtifacts: async () => false,
    },
    clock,
  ).execute('adult')
  expect(acknowledged).toBe(false)
  const restarted = new DeliverStudioCleanupsService(
    repository,
    {
      cleanupShowcaseArtifacts: async (received) => {
        expect(received).toEqual(payload)
        return true
      },
    },
    clock,
  )
  expect(await restarted.execute('adult')).toBe(true)
  expect(acknowledged).toBe(true)
  expect(await restarted.execute('adult')).toBe(false)
})

test('a drain is bounded even when every delivery fails', async () => {
  let attempted = 0
  const service = new DeliverStudioCleanupsService(
    {
      claim: async () => ({
        threadId: 'thread',
        payload: { authorId: crypto.randomUUID(), playId: crypto.randomUUID(), coverUrl: null },
      }),
      acknowledge: async () => {
        throw new Error('Must not acknowledge')
      },
    },
    {
      cleanupShowcaseArtifacts: async () => {
        attempted++
        return false
      },
    },
    () => new Date(),
  )
  expect(await service.drain('kids')).toEqual({ attempted: 4 })
  expect(attempted).toBe(4)
})

test('HTTP delivery confirms only successful durable acceptance and drains every response body', async () => {
  let cancelled = 0
  const fetchImpl = Object.assign(
    async () =>
      new Response(
        new ReadableStream({
          cancel() {
            cancelled++
          },
        }),
        { status: 400 },
      ),
    { preconnect: globalThis.fetch.preconnect },
  )
  const gateway = createStudioArtifactHttpGateway({
    baseUrl: 'https://kids.test',
    hmacSecret: 'test-secret',
    fetchImpl,
  })
  const payload = { authorId: crypto.randomUUID(), playId: crypto.randomUUID(), coverUrl: null }
  expect(await gateway.cleanupShowcaseArtifacts(payload)).toBe(false)
  // A 2xx with a body is sufficient; production BFF responds with an empty 204.
  const success = createStudioArtifactHttpGateway({
    baseUrl: 'https://kids.test',
    hmacSecret: 'test-secret',
    fetchImpl: Object.assign(
      async () =>
        new Response(
          new ReadableStream({
            cancel() {
              cancelled++
            },
          }),
          { status: 200 },
        ),
      { preconnect: globalThis.fetch.preconnect },
    ),
  })
  expect(await success.cleanupShowcaseArtifacts(payload)).toBe(true)
  expect(cancelled).toBe(2)
  expect(await createStudioArtifactHttpGateway({}).cleanupShowcaseArtifacts(payload)).toBe(false)
})
