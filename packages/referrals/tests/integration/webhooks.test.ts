import { describe, expect, test } from 'bun:test'
import { signHmac } from '@sistemazero/core/security'
import type { HandleResult } from '../../src/application/conversions/record-conversion.service'
import type {
  ProcessedWebhookStore,
  WebhookClaim,
} from '../../src/domain/ports/processed-webhook.port'
import { webhooksRoutes } from '../../src/interfaces/http/webhooks.routes'
import { silentLogger } from '../fakes/in-memory'

const SECRET = 's'.repeat(32)

/** Espelho single-thread do store real (claim/lease/token). */
class InMemoryProcessedWebhookStore implements ProcessedWebhookStore {
  rows = new Map<
    string,
    { processedAt: Date | null; processingAt: Date | null; token: string | null }
  >()

  async claimDelivery(deliveryId: string, staleMs: number): Promise<WebhookClaim> {
    const now = new Date()
    const existing = this.rows.get(deliveryId)
    if (!existing) {
      const token = crypto.randomUUID()
      this.rows.set(deliveryId, { processedAt: null, processingAt: now, token })
      return { kind: 'claimed', token }
    }
    if (existing.processedAt) return { kind: 'processed' }
    if (existing.processingAt && existing.processingAt.getTime() > now.getTime() - staleMs) {
      return { kind: 'in_progress' }
    }
    const token = crypto.randomUUID()
    existing.processingAt = now
    existing.token = token
    return { kind: 'claimed', token }
  }

  async markProcessed(deliveryId: string, claimToken: string): Promise<boolean> {
    const row = this.rows.get(deliveryId)
    if (!row || row.token !== claimToken || row.processedAt) return false
    row.processedAt = new Date()
    row.processingAt = null
    row.token = null
    return true
  }

  async releaseClaim(deliveryId: string, claimToken: string): Promise<void> {
    const row = this.rows.get(deliveryId)
    if (row && row.token === claimToken && !row.processedAt) this.rows.delete(deliveryId)
  }

  async pruneProcessedBefore(cutoff: Date): Promise<number> {
    let pruned = 0
    for (const [id, row] of this.rows) {
      if (row.processedAt && row.processedAt <= cutoff) {
        this.rows.delete(id)
        pruned++
      }
    }
    return pruned
  }
}

function buildApp(opts: {
  result?: HandleResult
  secret?: string
  requireSignature?: boolean
  store?: InMemoryProcessedWebhookStore
}) {
  const calls: { deliveryId: string; eventName: string }[] = []
  const store = opts.store ?? new InMemoryProcessedWebhookStore()
  const app = webhooksRoutes({
    logger: silentLogger,
    handle: {
      execute: async (d) => {
        calls.push({ deliveryId: d.deliveryId, eventName: d.eventName })
        return opts.result ?? { kind: 'ok' }
      },
    },
    processedWebhooks: store,
    webhookHmacSecret: opts.secret,
    requireSignature: opts.requireSignature ?? true,
    webhookToleranceSeconds: 300,
    webhookProcessingStaleMs: 60_000,
  })
  return { app, calls, store }
}

/** Reproduz a entrega do payments: corpo {id,event,data} + x-signature (HMAC do corpo cru). */
function deliver(
  app: ReturnType<typeof buildApp>['app'],
  opts: { id: string; event?: string; paymentId?: string; secret?: string; rawOverride?: string },
) {
  const raw =
    opts.rawOverride ??
    JSON.stringify({
      id: opts.id,
      event: opts.event ?? 'payment.paid',
      data: { paymentId: opts.paymentId ?? 'pay-1' },
    })
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (opts.secret) {
    const ts = Math.floor(Date.now() / 1000)
    headers['x-signature'] = `t=${ts},v1=${signHmac(opts.secret, raw, ts)}`
  }
  return app.handle(
    new Request('http://localhost/webhooks/payments', { method: 'POST', headers, body: raw }),
  )
}

describe('POST /webhooks/payments (consumer do fan-out)', () => {
  test('entrega assinada processa e marca; a MESMA entrega deduplica', async () => {
    const { app, calls } = buildApp({ secret: SECRET })
    const first = await deliver(app, { id: 'd-1', secret: SECRET })
    expect(first.status).toBe(200)
    expect(calls).toHaveLength(1)

    const again = await deliver(app, { id: 'd-1', secret: SECRET })
    expect(again.status).toBe(200)
    expect(((await again.json()) as { deduped?: boolean }).deduped).toBe(true)
    expect(calls).toHaveLength(1)
  })

  test('assinatura inválida/ausente → 401 sem processar', async () => {
    const { app, calls } = buildApp({ secret: SECRET })
    const wrong = await deliver(app, { id: 'd-2', secret: 'x'.repeat(32) })
    expect(wrong.status).toBe(401)
    const missing = await deliver(app, { id: 'd-3' })
    expect(missing.status).toBe(401)
    expect(calls).toHaveLength(0)
  })

  test('produção SEM secret configurado falha FECHADA (401)', async () => {
    const { app, calls } = buildApp({ requireSignature: true })
    const res = await deliver(app, { id: 'd-4' })
    expect(res.status).toBe(401)
    expect(calls).toHaveLength(0)
  })

  test('retryable → 502 SEM marcar (a re-entrega processa de novo)', async () => {
    const { app, calls, store } = buildApp({
      secret: SECRET,
      result: { kind: 'retryable', reason: 'payments fora' },
    })
    const first = await deliver(app, { id: 'd-5', secret: SECRET })
    expect(first.status).toBe(502)
    const retry = await deliver(app, { id: 'd-5', secret: SECRET })
    expect(retry.status).toBe(502)
    expect(calls).toHaveLength(2)
    expect(store.rows.get('d-5')).toBeUndefined() // claim liberado
  })

  test('corpo que não é JSON → 400; sem id de entrega → 400', async () => {
    const { app } = buildApp({ secret: SECRET })
    const notJson = await deliver(app, { id: '-', secret: SECRET, rawOverride: 'lixo' })
    expect(notJson.status).toBe(400)
    const noId = await deliver(app, {
      id: '-',
      secret: SECRET,
      rawOverride: JSON.stringify({ event: 'payment.paid', data: {} }),
    })
    expect(noId.status).toBe(400)
  })
})
