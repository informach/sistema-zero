import { canonicalHmacMessage, signHmac } from '@sistemazero/core/security'
import {
  type PublicationReminder,
  type ReminderNotifier,
  ReminderSendError,
} from '../../../domain/ports/reminder-notifier.port'

/**
 * Lembrete WhatsApp via `POST /messaging/send` ATRAVÉS do gateway, assinado com
 * HMAC de borda (consumer `marketing` — molde do funnel). O gateway re-injeta o
 * `x-consumer-id` a partir do principal autenticado e injeta o token interno do
 * messaging. Idempotência: `Idempotency-Key` determinística por publicação+fone
 * — o messaging deduplica por consumer+chave (retry pós-crash nunca duplica).
 */
export interface GatewayMessagingClientOptions {
  gatewayUrl: string
  consumerId: string
  hmacSecret: string
  templateKey: string
  /** Injetável em testes; default = fetch global. */
  fetchImpl?: typeof fetch
  timeoutMs?: number
}

const DEFAULT_TIMEOUT_MS = 10_000

export class GatewayMessagingClient implements ReminderNotifier {
  constructor(private readonly opts: GatewayMessagingClientOptions) {}

  async send(input: PublicationReminder): Promise<void> {
    const path = '/messaging/send'
    const rawBody = JSON.stringify({
      channel: 'whatsapp',
      templateKey: this.opts.templateKey,
      recipient: { name: input.recipientName, phone: input.phone },
      variables: input.variables,
    })
    const idempotencyKey = `marketing-reminder-${input.publicationId}-${input.phone}`
    const ts = Math.floor(Date.now() / 1000)
    // path assinado = pathname SEM query, o MESMO da URL (o gateway confere).
    const message = canonicalHmacMessage({ method: 'POST', path, idempotencyKey, body: rawBody })
    const signature = signHmac(this.opts.hmacSecret, message, ts)

    // ⚠️ AbortController + clearTimeout (NÃO AbortSignal.timeout — timer não
    // cancelável acumula e pendura o bun test; gotcha documentado do funnel).
    const controller = new AbortController()
    const timer = setTimeout(
      () => controller.abort(new DOMException('gateway timeout', 'TimeoutError')),
      this.opts.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    )
    let res: Response
    try {
      const doFetch = this.opts.fetchImpl ?? fetch
      res = await doFetch(`${this.opts.gatewayUrl}${path}`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-consumer-id': this.opts.consumerId,
          'x-signature': `t=${ts},v1=${signature}`,
          'idempotency-key': idempotencyKey,
        },
        body: rawBody,
        signal: controller.signal,
      })
    } catch (error) {
      throw new ReminderSendError('Gateway inalcançável ao enviar o lembrete', false, {
        cause: error,
      })
    } finally {
      clearTimeout(timer)
    }
    if (res.status === 202) return
    // 4xx (fora 408/429) = payload/template quebrado — retry não conserta.
    const permanent =
      res.status >= 400 && res.status < 500 && res.status !== 408 && res.status !== 429
    const body = await res.text().catch(() => '')
    throw new ReminderSendError(
      `messaging respondeu ${res.status}${body ? `: ${body.slice(0, 200)}` : ''}`,
      permanent,
    )
  }
}
