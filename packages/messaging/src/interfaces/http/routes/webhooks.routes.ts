import { UnauthorizedError } from '@sistemazero/core/http'
import { Elysia } from 'elysia'
import type {
  ApplyDeliveryStatusService,
  StatusAction,
} from '../../../application/apply-delivery-status/apply-delivery-status.service'
import type { SetInstanceConnectionService } from '../../../application/instances/instance-admin.service'
import {
  SENDGRID_SIGNATURE_HEADER,
  SENDGRID_TIMESTAMP_HEADER,
  verifySendGridSignature,
} from '../../../infrastructure/gateways/sendgrid/sendgrid.webhook'
import type { Logger } from '../../../infrastructure/logging/logger'
import { getRawBody } from '../raw-body'

export interface WebhooksRoutesDeps {
  applyStatus: ApplyDeliveryStatusService
  setConnection: SetInstanceConnectionService
  logger: Logger
  /** Chave pública (base64) do Signed Event Webhook do SendGrid. Ausente → não verifica (dev). */
  sendgridPublicKey: string | undefined
  /** Segredo `?token=` exigido no webhook da Evolution. Ausente → não exige (dev). */
  webhookToken: string | undefined
}

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' ? (v as Record<string, unknown>) : {}
}
function str(v: unknown): string | null {
  return typeof v === 'string' && v.length > 0 ? v : null
}

/** Evento do SendGrid → ação normalizada. */
function sendgridAction(eventType: string): StatusAction {
  switch (eventType) {
    case 'delivered':
      return 'delivered'
    case 'bounce':
    case 'dropped':
      return 'suppress_bounce'
    case 'spamreport':
      return 'suppress_spam'
    case 'unsubscribe':
    case 'group_unsubscribe':
      return 'suppress_unsub'
    default:
      return 'ignore' // processed, deferred, open, click, etc.
  }
}

/** Status do WhatsApp (Baileys via Evolution) → ação. Aceita número ou string. */
function evolutionAction(status: unknown): StatusAction {
  const s = typeof status === 'number' ? status : String(status ?? '').toUpperCase()
  if (s === 3 || s === 'DELIVERY_ACK') return 'delivered'
  if (s === 4 || s === 5 || s === 'READ' || s === 'PLAYED') return 'read'
  return 'ignore'
}

export function webhooksRoutes(deps: WebhooksRoutesDeps) {
  return new Elysia()
    .post('/messaging/webhooks/sendgrid', async ({ request, body, set }) => {
      if (deps.sendgridPublicKey) {
        const ok = verifySendGridSignature({
          publicKeyBase64: deps.sendgridPublicKey,
          payload: getRawBody(request),
          signature: request.headers.get(SENDGRID_SIGNATURE_HEADER) ?? '',
          timestamp: request.headers.get(SENDGRID_TIMESTAMP_HEADER) ?? '',
        })
        if (!ok) throw new UnauthorizedError('Assinatura do webhook inválida')
      }

      const events = Array.isArray(body) ? body : []
      let processed = 0
      for (const raw of events) {
        const ev = asRecord(raw)
        const eventType = str(ev.event) ?? 'unknown'
        // sg_message_id no webhook = <X-Message-Id>.<sufixo>; casamos pela base.
        const base = str(ev.sg_message_id)?.split('.')[0] ?? null
        const ts = typeof ev.timestamp === 'number' ? ev.timestamp : null
        await deps.applyStatus.execute({
          provider: 'sendgrid',
          providerEventId: str(ev.sg_event_id) ?? `${base}:${eventType}:${ts ?? ''}`,
          eventType,
          providerMessageId: base,
          action: sendgridAction(eventType),
          occurredAt: ts ? new Date(ts * 1000) : new Date(),
          payload: ev,
        })
        processed += 1
      }
      set.status = 200
      return { ok: true, processed }
    })
    .post('/messaging/webhooks/evolution', async ({ body, query, set }) => {
      if (deps.webhookToken && query.token !== deps.webhookToken) {
        throw new UnauthorizedError('Token de webhook inválido')
      }
      const payload = asRecord(body)
      const event = String(payload.event ?? '')
        .toLowerCase()
        .replace(/_/g, '.')

      if (event.includes('connection.update')) {
        const data = asRecord(payload.data)
        const instanceName = str(payload.instance) ?? str(data.instance)
        const state = str(data.state) ?? str(asRecord(data.connection).state)
        if (instanceName) await deps.setConnection.execute(instanceName, state === 'open')
        set.status = 200
        return { ok: true }
      }

      if (event.includes('messages.update')) {
        const rawData = payload.data
        const items = Array.isArray(rawData) ? rawData : [rawData]
        let processed = 0
        for (const item of items) {
          const d = asRecord(item)
          const keyId = str(asRecord(d.key).id) ?? str(d.keyId)
          const status = d.status ?? asRecord(d.update).status
          if (!keyId) continue
          await deps.applyStatus.execute({
            provider: 'evolution',
            providerEventId: `${keyId}:${String(status)}`,
            eventType: `messages.update:${String(status)}`,
            providerMessageId: keyId,
            action: evolutionAction(status),
            occurredAt: new Date(),
            payload: d,
          })
          processed += 1
        }
        set.status = 200
        return { ok: true, processed }
      }

      set.status = 200
      return { ok: true, ignored: event }
    })
}
