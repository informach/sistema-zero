import { describe, expect, it } from 'bun:test'
import { WhatsAppInstance } from '../../src/domain/lane/whatsapp-instance.aggregate'
import { Message } from '../../src/domain/message/message.aggregate'
import type { Channel } from '../../src/domain/shared/channel'
import { buildApp, postJson } from '../helpers'

const NOW = new Date('2026-06-03T12:00:00Z')

/** Cria uma mensagem já SENT (com providerMessageId) e a injeta no repo. */
function seedSent(
  ctx: ReturnType<typeof buildApp>,
  channel: Channel,
  providerMessageId: string,
  contact: { email?: string; phone?: string },
): Message {
  const message = Message.create({
    id: `seed-${providerMessageId}`,
    channel,
    templateKey: 'welcome',
    recipient: { name: 'Quem', email: contact.email ?? null, phone: contact.phone ?? null },
    renderedSubject: channel === 'email' ? 'Oi' : null,
    renderedBody: 'Oi',
    now: NOW,
  })
  message.startSending()
  message.markSent({ providerMessageId, sentAt: NOW })
  message.pullEvents()
  ctx.messages.store.set(message.id, message)
  return message
}

describe('POST /messaging/webhooks/sendgrid', () => {
  it('delivered → DELIVERED e o evento é deduplicado na reentrega', async () => {
    const ctx = buildApp()
    const msg = seedSent(ctx, 'email', 'sg-1', { email: 'a@b.com' })
    const event = [
      {
        sg_message_id: 'sg-1.filter0001',
        sg_event_id: 'evt-1',
        event: 'delivered',
        timestamp: 1717689097,
      },
    ]

    const r1 = await ctx.app.handle(postJson('/messaging/webhooks/sendgrid', event))
    expect(r1.status).toBe(200)
    expect(ctx.messages.store.get(msg.id)?.status).toBe('DELIVERED')

    // Reentrega do mesmo sg_event_id → deduplicado (sem reprocessar).
    const r2 = await ctx.app.handle(postJson('/messaging/webhooks/sendgrid', event))
    const body = (await r2.json()) as { processed: number }
    expect(body.processed).toBe(1)
    expect(ctx.messages.store.get(msg.id)?.status).toBe('DELIVERED')
  })

  it('bounce → SUPPRESSED + adiciona à lista de supressão', async () => {
    const ctx = buildApp()
    const msg = seedSent(ctx, 'email', 'sg-2', { email: 'bounce@b.com' })
    await ctx.app.handle(
      postJson('/messaging/webhooks/sendgrid', [
        { sg_message_id: 'sg-2.x', sg_event_id: 'evt-2', event: 'bounce', timestamp: 1717689097 },
      ]),
    )
    expect(ctx.messages.store.get(msg.id)?.status).toBe('SUPPRESSED')
    expect(await ctx.suppressions.isSuppressed('email', 'bounce@b.com')).toBe(true)
  })
})

describe('POST /messaging/webhooks/evolution', () => {
  it('messages.update DELIVERY_ACK → DELIVERED; depois READ → READ', async () => {
    const ctx = buildApp()
    const msg = seedSent(ctx, 'whatsapp', 'wamid-1', { phone: '5511999999999' })

    await ctx.app.handle(
      postJson('/messaging/webhooks/evolution', {
        event: 'messages.update',
        data: { key: { id: 'wamid-1' }, status: 'DELIVERY_ACK' },
      }),
    )
    expect(ctx.messages.store.get(msg.id)?.status).toBe('DELIVERED')

    await ctx.app.handle(
      postJson('/messaging/webhooks/evolution', {
        event: 'messages.update',
        data: { key: { id: 'wamid-1' }, status: 'READ' },
      }),
    )
    expect(ctx.messages.store.get(msg.id)?.status).toBe('READ')
  })

  it('connection.update close → instância DISCONNECTED', async () => {
    const ctx = buildApp()
    const lane = WhatsAppInstance.create({
      id: 'lane-a',
      instanceName: 'a',
      phoneNumber: '5500',
      now: NOW,
    })
    lane.setStatus('CONNECTED', NOW)
    await ctx.instances.create(lane)

    await ctx.app.handle(
      postJson('/messaging/webhooks/evolution', {
        event: 'connection.update',
        instance: 'a',
        data: { state: 'close' },
      }),
    )
    expect((await ctx.instances.findById('lane-a'))?.status).toBe('DISCONNECTED')
  })
})
