import { canonicalHmacMessage, signHmac } from '@sistemazero/core/security'
import type { MessagingGateway, SendEmailInput } from '../../../domain/ports/messaging-gateway.port'

export interface GatewayMessagingClientOptions {
  gatewayUrl: string
  hmacSecret: string
  timeoutMs: number
  fetchImpl?: typeof fetch
}

/**
 * Cliente helpdesk → api-gateway → @sistemazero/messaging (`POST /messaging/send`).
 * HMAC de borda como consumer `helpdesk` (mensagem canônica
 * "<MÉTODO>.<path>.<idem>.<corpo>", padrão do fiscal/referrals); o gateway
 * re-injeta `x-consumer-id` e o `x-internal-token` do messaging.
 */
export function createGatewayMessagingClient(
  opts: GatewayMessagingClientOptions,
): MessagingGateway {
  const doFetch = opts.fetchImpl ?? fetch
  const baseUrl = opts.gatewayUrl.replace(/\/$/, '')

  return {
    async sendEmail(input: SendEmailInput): Promise<void> {
      const rawBody = JSON.stringify({
        channel: 'email',
        templateKey: input.templateKey,
        recipient: input.recipient,
        variables: input.variables,
      })
      const ts = Math.floor(Date.now() / 1000)
      const path = '/messaging/send'
      const message = canonicalHmacMessage({
        method: 'POST',
        path,
        idempotencyKey: input.idempotencyKey,
        body: rawBody,
      })
      const signature = signHmac(opts.hmacSecret, message, ts)

      // AbortController + clearTimeout, e não AbortSignal.timeout: o sinal da
      // fábrica não é cancelável e o timer pendente pendura o `bun test`.
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), opts.timeoutMs)
      try {
        const res = await doFetch(`${baseUrl}${path}`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-consumer-id': 'helpdesk',
            'x-signature': `t=${ts},v1=${signature}`,
            'idempotency-key': input.idempotencyKey,
          },
          body: rawBody,
          signal: controller.signal,
        })
        if (!res.ok) {
          // A resposta pode ecoar destinatário/variáveis; o código HTTP basta e
          // não vira PII em logs/Sentry.
          throw new Error(`messaging/send falhou: ${res.status}`)
        }
      } finally {
        clearTimeout(timer)
      }
    },
  }
}
