import { expect, test } from 'bun:test'
import { DeliverStudioEventsService } from '../../src/application/showcase/deliver-studio-events.service'
import type {
  StudioEventRepository,
  StudioPublicationEvent,
} from '../../src/domain/ports/studio-event-repository.port'
import { createMembersHttpGateway } from '../../src/infrastructure/gateways/members-http.gateway'

for (const kind of ['standalone', 'challenge'] as const)
  test(`${kind} outbox retries the same immutable delivery and only acknowledges success`, async () => {
    const payload = {
      userId: crypto.randomUUID(),
      accountId: crypto.randomUUID(),
      audience: 'kids' as const,
    }
    const event: StudioPublicationEvent =
      kind === 'standalone'
        ? { kind, payload: { ...payload, playId: crypto.randomUUID() } }
        : { kind, payload: { ...payload, challengeKey: 'm:2026-10' } }
    const eventId = `studio:${crypto.randomUUID()}:${kind}`
    let acked = false,
      calls = 0
    const repository: StudioEventRepository = {
      claim: async () => (acked ? null : { eventId, event }),
      acknowledge: async (id) => {
        expect(id).toBe(eventId)
        acked = true
      },
    }
    const gateway = createMembersHttpGateway({
      baseUrl: 'http://members.test',
      hmacSecret: 'qa-persistent-notifications',
      fetchImpl: Object.assign(
        async (_url: string | URL | Request, init?: RequestInit) => {
          calls++
          expect(new Headers(init?.headers).get('x-delivery-id')).toBe(eventId)
          expect(JSON.parse(String(init?.body))).toEqual(event.payload)
          return new Response(null, { status: calls === 1 ? 400 : 204 })
        },
        { preconnect: fetch.preconnect },
      ),
    })
    const service = new DeliverStudioEventsService(repository, gateway, () => new Date())
    expect(await service.execute()).toBe(true)
    expect(acked).toBe(false)
    expect(await service.execute()).toBe(true)
    expect(acked).toBe(true)
    expect(await service.execute()).toBe(false)
    expect(calls).toBe(2)
  })
