import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import type {
  WebhookDelivery,
  WebhookDeliveryRepository,
} from '../../src/domain/ports/webhook-delivery.port'
import { WebhookDeliveryWorker } from '../../src/infrastructure/workers/webhook-delivery-worker'
import { InMemoryConsumerRepository, silentLogger } from '../fakes/in-memory'

/** Repo de entregas que devolve um lote uma vez e registra os desfechos. */
class StubDeliveryRepo implements WebhookDeliveryRepository {
  succeeded: { id: string; statusCode: number }[] = []
  rescheduled: { id: string; attempts: number; nextAttemptAt: Date; statusCode?: number }[] = []
  dead: string[] = []
  private queue: WebhookDelivery[]

  constructor(initial: WebhookDelivery[]) {
    this.queue = initial
  }
  async enqueue(): Promise<void> {}
  async claimDue(): Promise<WebhookDelivery[]> {
    const q = this.queue
    this.queue = []
    return q
  }
  async markSucceeded(id: string, statusCode: number): Promise<void> {
    this.succeeded.push({ id, statusCode })
  }
  async reschedule(
    id: string,
    attempts: number,
    nextAttemptAt: Date,
    _error: string,
    statusCode?: number,
  ): Promise<void> {
    this.rescheduled.push({ id, attempts, nextAttemptAt, statusCode })
  }
  async markDead(id: string): Promise<void> {
    this.dead.push(id)
  }
}

const consumers = new InMemoryConsumerRepository().add({
  id: 'sys-a',
  name: 'Sistema A',
  hmacSecret: 'segredo-do-consumidor',
  allowedCidrs: ['0.0.0.0/0'],
  webhookUrl: 'https://consumidor.test/webhooks/pagamentos',
  isActive: true,
})

const delivery = (over: Partial<WebhookDelivery> = {}): WebhookDelivery => ({
  id: 'd1',
  consumerId: 'sys-a',
  eventName: 'payment.paid',
  payload: { paymentId: 'p1', consumerId: 'sys-a' },
  attempts: 0,
  ...over,
})

const originalFetch = globalThis.fetch
let lastCall: { url: string; init: RequestInit } | null = null

function mockFetch(status: number): void {
  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    lastCall = { url: String(url), init: init ?? {} }
    return new Response(status === 200 ? 'ok' : 'erro', { status })
  }) as typeof fetch
}

beforeEach(() => {
  lastCall = null
})
afterEach(() => {
  globalThis.fetch = originalFetch
})

describe('WebhookDeliveryWorker', () => {
  test('entrega assinada com sucesso → markSucceeded', async () => {
    mockFetch(200)
    const repo = new StubDeliveryRepo([delivery()])
    const worker = new WebhookDeliveryWorker(repo, consumers, silentLogger, {
      intervalMs: 1000,
      batchSize: 10,
      maxAttempts: 5,
    })

    await worker.tick()

    expect(repo.succeeded).toEqual([{ id: 'd1', statusCode: 200 }])
    expect(lastCall?.url).toBe('https://consumidor.test/webhooks/pagamentos')
    const headers = lastCall?.init.headers as Record<string, string>
    expect(headers['x-signature']).toMatch(/^t=\d+,v1=[0-9a-f]+$/)
    expect(headers['x-delivery-id']).toBe('d1')
    expect(String(lastCall?.init.body)).toContain('p1')
  })

  test('falha (HTTP 500) com tentativas restantes → reschedule com backoff e statusCode', async () => {
    mockFetch(500)
    const repo = new StubDeliveryRepo([delivery({ attempts: 0 })])
    const worker = new WebhookDeliveryWorker(repo, consumers, silentLogger, {
      intervalMs: 1000,
      batchSize: 10,
      maxAttempts: 5,
    })

    const before = Date.now()
    await worker.tick()

    expect(repo.succeeded).toHaveLength(0)
    expect(repo.rescheduled).toHaveLength(1)
    const r = repo.rescheduled[0]!
    expect(r.id).toBe('d1')
    expect(r.attempts).toBe(1)
    expect(r.statusCode).toBe(500)
    // backoff: próximo envio no futuro (30 * 2^0 = 30s).
    expect(r.nextAttemptAt.getTime()).toBeGreaterThan(before)
  })

  test('backoff cresce com o nº de tentativas', async () => {
    mockFetch(500)
    const repo = new StubDeliveryRepo([delivery({ attempts: 3 })]) // já com 3 falhas
    const worker = new WebhookDeliveryWorker(repo, consumers, silentLogger, {
      intervalMs: 1000,
      batchSize: 10,
      maxAttempts: 8,
    })

    const before = Date.now()
    await worker.tick()

    const r = repo.rescheduled[0]!
    expect(r.attempts).toBe(4)
    // 30 * 2^(4-1) = 240s → bem além de 30s.
    expect(r.nextAttemptAt.getTime() - before).toBeGreaterThan(100_000)
  })

  test('falha na última tentativa → markDead', async () => {
    mockFetch(500)
    const repo = new StubDeliveryRepo([delivery({ attempts: 4 })])
    const worker = new WebhookDeliveryWorker(repo, consumers, silentLogger, {
      intervalMs: 1000,
      batchSize: 10,
      maxAttempts: 5,
    })

    await worker.tick()

    expect(repo.dead).toEqual(['d1'])
  })

  test('consumidor sem webhook_url → markDead (não chama fetch)', async () => {
    mockFetch(200)
    const noUrlConsumers = new InMemoryConsumerRepository().add({
      id: 'sys-b',
      name: 'Sem URL',
      hmacSecret: 's',
      allowedCidrs: [],
      isActive: true,
    })
    const repo = new StubDeliveryRepo([delivery({ id: 'd2', consumerId: 'sys-b' })])
    const worker = new WebhookDeliveryWorker(repo, noUrlConsumers, silentLogger, {
      intervalMs: 1000,
      batchSize: 10,
      maxAttempts: 5,
    })

    await worker.tick()

    expect(repo.dead).toEqual(['d2'])
    expect(lastCall).toBeNull()
  })
})
