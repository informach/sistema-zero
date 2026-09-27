import { describe, expect, test } from 'bun:test'
import { FunnelChallengeAnalyticsGateway } from '../../src/infrastructure/gateways/funnel-challenge-analytics.gateway'

describe('FunnelChallengeAnalyticsGateway', () => {
  test('envia somente IDs/marcos e divide cargas acima de 500', async () => {
    const calls: Array<{ url: string; init: RequestInit }> = []
    const fetchFn = (async (url: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: String(url), init: init ?? {} })
      return new Response('{}', { status: 202 })
    }) as typeof fetch
    const gateway = new FunnelChallengeAnalyticsGateway(
      'https://funil.example/',
      'token-com-mais-de-16-caracteres',
      1_000,
      fetchFn,
    )
    await gateway.publish(
      Array.from({ length: 501 }, (_, index) => ({
        buyerUserId: `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
        eventName: 'challenge_started' as const,
        occurredAt: new Date('2026-09-16T12:00:00Z'),
      })),
    )

    expect(calls).toHaveLength(2)
    expect(calls[0]?.url).toBe('https://funil.example/api/internal/challenge-events')
    expect(new Headers(calls[0]?.init.headers).get('x-internal-token')).toBe(
      'token-com-mais-de-16-caracteres',
    )
    const first = JSON.parse(String(calls[0]?.init.body)) as { events: unknown[] }
    const second = JSON.parse(String(calls[1]?.init.body)) as { events: unknown[] }
    expect(first.events).toHaveLength(500)
    expect(second.events).toHaveLength(1)
    expect(JSON.stringify(first)).not.toContain('@')
  })

  test('status não-2xx é retryável para o chamador', async () => {
    const fetchFn = (async () => new Response('{}', { status: 503 })) as unknown as typeof fetch
    const gateway = new FunnelChallengeAnalyticsGateway(
      'https://funil.example',
      'token-com-mais-de-16-caracteres',
      1_000,
      fetchFn,
    )
    expect(
      gateway.publish([
        {
          buyerUserId: '00000000-0000-4000-8000-000000000001',
          eventName: 'account_activated',
          occurredAt: new Date(),
        },
      ]),
    ).rejects.toThrow('HTTP 503')
  })
})
