import { describe, expect, it } from 'bun:test'
import { ApplyDeliveryStatusService } from '../../src/application/apply-delivery-status/apply-delivery-status.service'
import { Message } from '../../src/domain/message/message.aggregate'
import {
  InMemoryMessageRepository,
  InMemorySuppressionRepository,
  InMemoryWebhookInbox,
  silentLogger,
} from '../fakes/in-memory'

const NOW = new Date('2026-06-03T12:00:00Z')

function seedSent(messages: InMemoryMessageRepository, providerMessageId: string): Message {
  const m = Message.create({
    id: `m-${providerMessageId}`,
    channel: 'email',
    templateKey: 'welcome',
    recipient: { name: 'Helena', email: 'helena@example.com' },
    renderedSubject: 'Oi',
    renderedBody: '<p>Oi</p>',
    now: NOW,
  })
  m.startSending()
  m.markSent({ providerMessageId, sentAt: NOW })
  m.pullEvents()
  messages.store.set(m.id, m)
  return m
}

function makeService(messages: InMemoryMessageRepository) {
  const suppressions = new InMemorySuppressionRepository()
  const inbox = new InMemoryWebhookInbox()
  const service = new ApplyDeliveryStatusService(messages, suppressions, inbox, silentLogger)
  return { service, suppressions, inbox }
}

function deliveredInput(providerMessageId: string, eventId: string) {
  return {
    provider: 'sendgrid' as const,
    providerEventId: eventId,
    eventType: 'delivered',
    providerMessageId,
    action: 'delivered' as const,
    occurredAt: NOW,
    payload: {},
  }
}

describe('ApplyDeliveryStatusService — ordem do dedupe (aplicar ANTES de marcar)', () => {
  it('conflito de versão com o worker → recarrega, re-aplica e marca (status não se perde)', async () => {
    const messages = new InMemoryMessageRepository()
    const m = seedSent(messages, 'sg-1')
    const { service, inbox } = makeService(messages)

    // O 1º update conflita (worker gravou no meio); o serviço deve re-tentar.
    messages.failNextUpdateFor.add(m.id)
    const result = await service.execute(deliveredInput('sg-1', 'evt-1'))

    expect(result).toEqual({ deduped: false, applied: true })
    expect(messages.store.get(m.id)?.status).toBe('DELIVERED')
    expect(await inbox.alreadyReceived('sendgrid', 'evt-1')).toBe(true)
  })

  it('falha DURA no processamento NÃO consome o evento — a reentrega reprocessa', async () => {
    const messages = new InMemoryMessageRepository()
    const m = seedSent(messages, 'sg-2')
    const { service, inbox } = makeService(messages)

    // Falha além das re-tentativas: três conflitos seguidos.
    messages.failNextUpdateFor.add(m.id)
    const original = messages.update.bind(messages)
    let failures = 3
    messages.update = async (msg) => {
      if (failures > 0 && msg.id === m.id) {
        failures -= 1
        messages.failNextUpdateFor.add(m.id)
      }
      return original(msg)
    }

    await expect(service.execute(deliveredInput('sg-2', 'evt-2'))).rejects.toThrow(
      /Conflito de concorrência/,
    )
    // O evento NÃO foi marcado → a reentrega do provedor processa de verdade.
    expect(await inbox.alreadyReceived('sendgrid', 'evt-2')).toBe(false)

    messages.update = original
    const retry = await service.execute(deliveredInput('sg-2', 'evt-2'))
    expect(retry.applied).toBe(true)
    expect(messages.store.get(m.id)?.status).toBe('DELIVERED')
  })

  it('reentrega de evento já processado cai no dedupe (sem reprocessar)', async () => {
    const messages = new InMemoryMessageRepository()
    seedSent(messages, 'sg-3')
    const { service } = makeService(messages)

    const first = await service.execute(deliveredInput('sg-3', 'evt-3'))
    expect(first.applied).toBe(true)
    const second = await service.execute(deliveredInput('sg-3', 'evt-3'))
    expect(second).toEqual({ deduped: true, applied: false })
  })

  it('bounce adiciona supressão e suprime a mensagem', async () => {
    const messages = new InMemoryMessageRepository()
    const m = seedSent(messages, 'sg-4')
    const { service, suppressions } = makeService(messages)

    const result = await service.execute({
      provider: 'sendgrid',
      providerEventId: 'evt-4',
      eventType: 'bounce',
      providerMessageId: 'sg-4',
      action: 'suppress_bounce',
      occurredAt: NOW,
      payload: {},
    })
    expect(result.applied).toBe(true)
    expect(messages.store.get(m.id)?.status).toBe('SUPPRESSED')
    expect(await suppressions.isSuppressed('email', 'helena@example.com')).toBe(true)
  })
})
