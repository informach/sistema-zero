import { describe, expect, test } from 'bun:test'
import type { Consumer, ConsumerRepository } from '../../src/domain/ports/consumer-repository.port'
import { CachingConsumerRepository } from '../../src/infrastructure/persistence/caching-consumer-repository'

function consumer(id: string, isActive = true): Consumer {
  return { id, name: id, hmacSecret: 's'.repeat(32), allowedCidrs: ['0.0.0.0/0'], isActive }
}

/** Inner instrumentado: conta queries e permite trocar a resposta. */
class CountingRepo implements ConsumerRepository {
  calls = 0
  subscriberCalls = 0
  byId = new Map<string, Consumer>()
  async findById(id: string): Promise<Consumer | null> {
    this.calls++
    return this.byId.get(id) ?? null
  }
  async findSubscribers(eventName: string): Promise<Consumer[]> {
    this.subscriberCalls++
    return [...this.byId.values()].filter(
      (c) => c.isActive && Boolean(c.webhookUrl) && (c.subscribedEvents ?? []).includes(eventName),
    )
  }
}

describe('CachingConsumerRepository (TTL curto sobre o lookup do hot path)', () => {
  test('acertos são cacheados dentro do TTL (1 query, não N)', async () => {
    const inner = new CountingRepo()
    inner.byId.set('sys-a', consumer('sys-a'))
    const repo = new CachingConsumerRepository(inner, 60_000)

    expect(await repo.findById('sys-a')).not.toBeNull()
    expect(await repo.findById('sys-a')).not.toBeNull()
    expect(await repo.findById('sys-a')).not.toBeNull()
    expect(inner.calls).toBe(1)
  })

  test('expirado → reconsulta (staleness limitada ao TTL)', async () => {
    const inner = new CountingRepo()
    inner.byId.set('sys-a', consumer('sys-a'))
    const repo = new CachingConsumerRepository(inner, 1) // TTL ~0
    await repo.findById('sys-a')
    await Bun.sleep(5)
    // Desativação do consumer aparece após o TTL.
    inner.byId.set('sys-a', consumer('sys-a', false))
    const fresh = await repo.findById('sys-a')
    expect(inner.calls).toBe(2)
    expect(fresh?.isActive).toBe(false)
  })

  test('misses NÃO são cacheados (X-Consumer-Id é controlado pelo cliente)', async () => {
    const inner = new CountingRepo()
    const repo = new CachingConsumerRepository(inner, 60_000)
    expect(await repo.findById('desconhecido')).toBeNull()
    expect(await repo.findById('desconhecido')).toBeNull()
    expect(inner.calls).toBe(2) // sem cache negativo → sem inflar o Map
  })

  test('findSubscribers é cacheado por evento (incl. lista vazia — eventName é nosso)', async () => {
    const inner = new CountingRepo()
    inner.byId.set('fiscal', {
      ...consumer('fiscal'),
      webhookUrl: 'http://fiscal.internal/webhooks/payments',
      subscribedEvents: ['payment.paid'],
    })
    const repo = new CachingConsumerRepository(inner, 60_000)

    expect(await repo.findSubscribers('payment.paid')).toHaveLength(1)
    expect(await repo.findSubscribers('payment.paid')).toHaveLength(1)
    expect(await repo.findSubscribers('payment.refunded')).toHaveLength(0)
    expect(await repo.findSubscribers('payment.refunded')).toHaveLength(0)
    expect(inner.subscriberCalls).toBe(2) // 1 por evento, segunda chamada veio do cache
  })
})
