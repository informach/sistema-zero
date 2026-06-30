import { describe, expect, it } from 'bun:test'
import crypto from 'node:crypto'
import { WhatsAppInstance } from '../../src/domain/lane/whatsapp-instance.aggregate'
import { Message } from '../../src/domain/message/message.aggregate'
import type { Channel } from '../../src/domain/shared/channel'
import {
  SENDGRID_SIGNATURE_HEADER,
  SENDGRID_TIMESTAMP_HEADER,
} from '../../src/infrastructure/gateways/sendgrid/sendgrid.webhook'
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

  it('evento acionável sem mensagem conhecida retorna 503 para provocar retry', async () => {
    const ctx = buildApp()
    const res = await ctx.app.handle(
      postJson('/messaging/webhooks/sendgrid', [
        {
          sg_message_id: 'sg-ainda-nao-persistido.x',
          sg_event_id: 'evt-pendente',
          event: 'delivered',
          timestamp: 1717689097,
        },
      ]),
    )

    expect(res.status).toBe(503)
    expect(await ctx.webhookInbox.alreadyReceived('sendgrid', 'evt-pendente')).toBe(false)
  })

  it('bounce HARD (type bounce) → SUPPRESSED + adiciona à lista de supressão', async () => {
    const ctx = buildApp()
    const msg = seedSent(ctx, 'email', 'sg-2', { email: 'bounce@b.com' })
    await ctx.app.handle(
      postJson('/messaging/webhooks/sendgrid', [
        {
          sg_message_id: 'sg-2.x',
          sg_event_id: 'evt-2',
          event: 'bounce',
          type: 'bounce',
          timestamp: 1717689097,
        },
      ]),
    )
    expect(ctx.messages.store.get(msg.id)?.status).toBe('SUPPRESSED')
    expect(await ctx.suppressions.isSuppressed('email', 'bounce@b.com')).toBe(true)
  })

  it('bounce SOFT (type blocked) NÃO suprime — destinatário pode voltar a receber', async () => {
    const ctx = buildApp()
    const msg = seedSent(ctx, 'email', 'sg-soft', { email: 'cheia@b.com' })
    await ctx.app.handle(
      postJson('/messaging/webhooks/sendgrid', [
        {
          sg_message_id: 'sg-soft.x',
          sg_event_id: 'evt-soft',
          event: 'bounce',
          type: 'blocked',
          timestamp: 1717689097,
        },
      ]),
    )
    expect(ctx.messages.store.get(msg.id)?.status).toBe('SENT')
    expect(await ctx.suppressions.isSuppressed('email', 'cheia@b.com')).toBe(false)
  })
})

describe('POST /messaging/webhooks/sendgrid — assinatura + anti-replay', () => {
  function makeSigner() {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
      namedCurve: 'prime256v1',
    })
    const publicKeyBase64 = publicKey.export({ type: 'spki', format: 'der' }).toString('base64')
    const sign = (payload: string, timestamp: string) => {
      const signer = crypto.createSign('sha256')
      signer.update(timestamp + payload)
      signer.end()
      return signer.sign(privateKey).toString('base64')
    }
    return { publicKeyBase64, sign }
  }

  function signedRequest(payload: string, timestamp: string, signature: string): Request {
    return new Request('http://localhost/messaging/webhooks/sendgrid', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        [SENDGRID_SIGNATURE_HEADER]: signature,
        [SENDGRID_TIMESTAMP_HEADER]: timestamp,
      },
      body: payload,
    })
  }

  it('timestamp DENTRO da janela → 200; FORA (replay de payload antigo) → 401', async () => {
    const { publicKeyBase64, sign } = makeSigner()
    const ctx = buildApp({ sendgridPublicKey: publicKeyBase64 })
    const payload = JSON.stringify([{ event: 'processed', sg_event_id: 'e1' }])

    const fresh = String(Math.floor(NOW.getTime() / 1000))
    const ok = await ctx.app.handle(signedRequest(payload, fresh, sign(payload, fresh)))
    expect(ok.status).toBe(200)

    // Assinatura VÁLIDA, mas de uma hora atrás (capturada e reapresentada).
    const stale = String(Math.floor(NOW.getTime() / 1000) - 3600)
    const replayed = await ctx.app.handle(signedRequest(payload, stale, sign(payload, stale)))
    expect(replayed.status).toBe(401)
  })

  it('assinatura inválida → 401', async () => {
    const { publicKeyBase64 } = makeSigner()
    const ctx = buildApp({ sendgridPublicKey: publicKeyBase64 })
    const payload = JSON.stringify([{ event: 'processed' }])
    const fresh = String(Math.floor(NOW.getTime() / 1000))
    const res = await ctx.app.handle(signedRequest(payload, fresh, 'assinatura-lixo'))
    expect(res.status).toBe(401)
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

  it('token errado → 401; token certo → 200 (comparação em tempo constante)', async () => {
    const ctx = buildApp({ webhookToken: 'segredo' })
    const denied = await ctx.app.handle(
      postJson('/messaging/webhooks/evolution?token=errado', { event: 'qualquer' }),
    )
    expect(denied.status).toBe(401)
    const ok = await ctx.app.handle(
      postJson('/messaging/webhooks/evolution?token=segredo', { event: 'qualquer' }),
    )
    expect(ok.status).toBe(200)
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

  it('connection.update NÃO sobrescreve PAUSED/BANNED (decisão do admin prevalece)', async () => {
    const ctx = buildApp()
    for (const status of ['PAUSED', 'BANNED'] as const) {
      const lane = WhatsAppInstance.create({
        id: `lane-${status}`,
        instanceName: `inst-${status}`,
        phoneNumber: '5500',
        now: NOW,
      })
      lane.setStatus(status, NOW)
      await ctx.instances.create(lane)

      await ctx.app.handle(
        postJson('/messaging/webhooks/evolution', {
          event: 'connection.update',
          instance: `inst-${status}`,
          data: { state: 'open' },
        }),
      )
      expect((await ctx.instances.findById(`lane-${status}`))?.status).toBe(status)
    }
  })
})
