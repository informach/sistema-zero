import { describe, expect, it } from 'bun:test'
import { Message } from '../../src/domain/message/message.aggregate'

const now = new Date('2026-06-03T12:00:00Z')

function emailMessage() {
  return Message.create({
    id: 'm1',
    channel: 'email',
    templateKey: 'welcome',
    recipient: { name: 'Helena', email: 'helena@example.com' },
    renderedSubject: 'Bem-vindo',
    renderedBody: '<p>Oi</p>',
    now,
  })
}

function whatsappMessage() {
  return Message.create({
    id: 'm2',
    channel: 'whatsapp',
    templateKey: 'welcome',
    recipient: { name: 'Zé', phone: '5511999999999' },
    renderedBody: 'Oi',
    now,
  })
}

describe('Message.create — validação', () => {
  it('e-mail exige e-mail válido e assunto', () => {
    expect(() =>
      Message.create({
        id: 'x',
        channel: 'email',
        templateKey: 't',
        recipient: { name: 'A', email: 'invalido' },
        renderedSubject: 'S',
        renderedBody: 'B',
        now,
      }),
    ).toThrow()
    expect(() =>
      Message.create({
        id: 'x',
        channel: 'email',
        templateKey: 't',
        recipient: { name: 'A', email: 'a@b.com' },
        renderedSubject: '',
        renderedBody: 'B',
        now,
      }),
    ).toThrow()
  })

  it('whatsapp exige telefone válido', () => {
    expect(() =>
      Message.create({
        id: 'x',
        channel: 'whatsapp',
        templateKey: 't',
        recipient: { name: 'A', phone: '123' },
        renderedBody: 'B',
        now,
      }),
    ).toThrow()
  })

  it('emite message.queued e nasce QUEUED quando não agendada', () => {
    const m = emailMessage()
    expect(m.status).toBe('QUEUED')
    const events = m.pullEvents()
    expect(events).toHaveLength(1)
    expect(events[0]?.eventName).toBe('message.queued')
  })

  it('nasce SCHEDULED quando scheduledAt é no futuro', () => {
    const m = Message.create({
      id: 'm3',
      channel: 'whatsapp',
      templateKey: 't',
      recipient: { name: 'A', phone: '5511999999999' },
      renderedBody: 'B',
      scheduledAt: new Date(now.getTime() + 60_000),
      now,
    })
    expect(m.status).toBe('SCHEDULED')
  })
})

describe('Message — máquina de estados', () => {
  it('QUEUED → SENDING → SENT emite message.sent', () => {
    const m = whatsappMessage()
    m.pullEvents()
    m.startSending()
    expect(m.status).toBe('SENDING')
    m.markSent({ providerMessageId: 'wamid.1', sentAt: now, laneId: 'lane-1' })
    expect(m.status).toBe('SENT')
    expect(m.pullEvents().map((e) => e.eventName)).toEqual(['message.sent'])
  })

  it('startSending inválido a partir de SENT lança', () => {
    const m = whatsappMessage()
    m.startSending()
    m.markSent({ providerMessageId: 'x', sentAt: now })
    expect(() => m.startSending()).toThrow()
  })

  it('recordSendFailure re-enfileira até o teto e então vira FAILED', () => {
    const m = Message.create({
      id: 'm4',
      channel: 'whatsapp',
      templateKey: 't',
      recipient: { name: 'A', phone: '5511999999999' },
      renderedBody: 'B',
      maxAttempts: 2,
      now,
    })
    m.pullEvents()

    m.startSending()
    const terminal1 = m.recordSendFailure({ reason: 'timeout', now, nextAttemptAt: now })
    expect(terminal1).toBe(false)
    expect(m.status).toBe('QUEUED')

    m.startSending()
    const terminal2 = m.recordSendFailure({ reason: 'timeout', now, nextAttemptAt: now })
    expect(terminal2).toBe(true)
    expect(m.status).toBe('FAILED')
    expect(m.pullEvents().map((e) => e.eventName)).toEqual(['message.failed'])
  })

  it('markDelivered é idempotente (no-op se já entregue)', () => {
    const m = whatsappMessage()
    m.startSending()
    m.markSent({ providerMessageId: 'x', sentAt: now })
    m.pullEvents()
    expect(m.markDelivered(now)).toBe(true)
    expect(m.status).toBe('DELIVERED')
    expect(m.pullEvents().map((e) => e.eventName)).toEqual(['message.delivered'])
    // segunda entrega → no-op
    expect(m.markDelivered(now)).toBe(false)
    expect(m.pullEvents()).toHaveLength(0)
  })

  it('markRead a partir de DELIVERED', () => {
    const m = whatsappMessage()
    m.startSending()
    m.markSent({ providerMessageId: 'x', sentAt: now })
    m.markDelivered(now)
    expect(m.markRead(now)).toBe(true)
    expect(m.status).toBe('READ')
  })

  it('suppress encerra a mensagem', () => {
    const m = emailMessage()
    m.suppress({ reason: 'hard_bounce', now })
    expect(m.status).toBe('SUPPRESSED')
  })
})
