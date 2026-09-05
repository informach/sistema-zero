import { describe, expect, it } from 'bun:test'
import { PortalNotificationWorker } from '../../src/infrastructure/workers/portal-notification-worker'
import { InMemoryPortalNotificationOutboxRepository } from '../fakes/in-memory'
import { FakeMessagingGateway } from '../fakes/messaging'

const silentLogger = { debug() {}, info() {}, warn() {}, error() {} }
const START = new Date('2026-09-05T12:00:00Z')

describe('PortalNotificationWorker', () => {
  it('recupera falha transitória com backoff e entrega usando a mesma idempotency key', async () => {
    let now = START
    const outbox = new InMemoryPortalNotificationOutboxRepository()
    const messaging = new FakeMessagingGateway()
    outbox.rows.set('job-1', {
      id: 'job-1',
      ticketId: 'ticket-1',
      messageId: 'message-1',
      payload: {
        templateKey: 'helpdesk-reply',
        recipient: { name: 'Maria', email: 'maria@example.com' },
        variables: { saudacao: 'Olá, Maria!', assunto: 'Ajuda', link: 'https://app.test/ajuda' },
        idempotencyKey: 'helpdesk-reply:message-1',
      },
      status: 'pending',
      attempts: 0,
      nextAttemptAt: START,
      leaseExpiresAt: null,
      lastError: null,
      sentAt: null,
      createdAt: START,
      updatedAt: START,
    })
    const worker = new PortalNotificationWorker({
      outbox,
      messaging,
      now: () => now,
      logger: silentLogger,
      config: { intervalMs: 1_000, leaseMs: 30_000, retryBaseMs: 5_000, retryMaxMs: 60_000 },
    })

    messaging.failNext = new Error('gateway indisponível')
    await worker.tick()
    expect(outbox.rows.get('job-1')).toMatchObject({
      status: 'pending',
      attempts: 1,
      lastError: 'gateway indisponível',
    })
    expect(messaging.sent).toHaveLength(0)

    now = new Date(START.getTime() + 5_000)
    await worker.tick()
    expect(messaging.sent.map((message) => message.idempotencyKey)).toEqual([
      'helpdesk-reply:message-1',
    ])
    expect(outbox.rows.get('job-1')).toMatchObject({ status: 'sent', attempts: 2, sentAt: now })
  })

  it('reclama um job processing cujo lease venceu após crash', async () => {
    const now = START
    const outbox = new InMemoryPortalNotificationOutboxRepository()
    const messaging = new FakeMessagingGateway()
    outbox.rows.set('job-crash', {
      id: 'job-crash',
      ticketId: 'ticket-crash',
      messageId: 'message-crash',
      payload: {
        templateKey: 'helpdesk-reply',
        recipient: { name: 'Cliente', email: 'cliente@example.com' },
        variables: { saudacao: 'Olá!', assunto: 'Ajuda', link: 'https://app.test/ajuda' },
        idempotencyKey: 'helpdesk-reply:message-crash',
      },
      status: 'processing',
      attempts: 1,
      nextAttemptAt: START,
      leaseExpiresAt: new Date(START.getTime() - 1),
      lastError: null,
      sentAt: null,
      createdAt: START,
      updatedAt: START,
    })
    const worker = new PortalNotificationWorker({
      outbox,
      messaging,
      now: () => now,
      logger: silentLogger,
      config: { intervalMs: 1_000, leaseMs: 30_000, retryBaseMs: 5_000, retryMaxMs: 60_000 },
    })

    await worker.tick()

    expect(messaging.sent).toHaveLength(1)
    expect(outbox.rows.get('job-crash')).toMatchObject({ status: 'sent', attempts: 2 })
  })

  it('stop aguarda a entrega em voo mesmo quando outros intervalos vencem', async () => {
    const outbox = new InMemoryPortalNotificationOutboxRepository()
    outbox.rows.set('job-stop', {
      id: 'job-stop',
      ticketId: 'ticket-stop',
      messageId: 'message-stop',
      payload: {
        templateKey: 'helpdesk-reply',
        recipient: { name: 'Cliente', email: 'cliente@example.com' },
        variables: { saudacao: 'Olá!', assunto: 'Ajuda', link: 'https://app.test/ajuda' },
        idempotencyKey: 'helpdesk-reply:message-stop',
      },
      status: 'pending',
      attempts: 0,
      nextAttemptAt: START,
      leaseExpiresAt: null,
      lastError: null,
      sentAt: null,
      createdAt: START,
      updatedAt: START,
    })

    let releaseDelivery!: () => void
    let signalStarted!: () => void
    const deliveryStarted = new Promise<void>((resolve) => {
      signalStarted = resolve
    })
    const holdDelivery = new Promise<void>((resolve) => {
      releaseDelivery = resolve
    })
    const worker = new PortalNotificationWorker({
      outbox,
      messaging: {
        async sendEmail() {
          signalStarted()
          await holdDelivery
        },
      },
      now: () => START,
      logger: silentLogger,
      config: { intervalMs: 1, leaseMs: 30_000, retryBaseMs: 5_000, retryMaxMs: 60_000 },
    })

    worker.start()
    await deliveryStarted
    await Bun.sleep(5)
    let stopped = false
    const stopping = worker.stop().then(() => {
      stopped = true
    })
    await Bun.sleep(1)
    expect(stopped).toBe(false)
    releaseDelivery()
    await stopping
    expect(stopped).toBe(true)
  })
})
