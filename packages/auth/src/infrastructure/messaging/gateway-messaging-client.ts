import type { Logger } from '@sistemazero/core/logging'
import { signHmac } from '@sistemazero/core/security'
import type { MessagingClient, SendEmailInput } from '../../domain/ports/messaging-client.port'

// Cliente do auth → api-gateway → @sistemazero/messaging. Assina por HMAC de
// borda exatamente como o funil (mensagem canônica "<idempotencyKey>.<corpo>" no
// POST com Idempotency-Key); o gateway injeta o `x-internal-token` do messaging.
// O auth NUNCA fala com o messaging direto (o token interno é segredo do gateway).

export interface GatewayMessagingClientOptions {
  gatewayUrl: string
  consumerId: string
  hmacSecret: string
  /** Injetável em testes; default = fetch global. */
  fetchImpl?: typeof fetch
}

export function createGatewayMessagingClient(opts: GatewayMessagingClientOptions): MessagingClient {
  const doFetch = opts.fetchImpl ?? fetch

  return {
    async sendEmail(input: SendEmailInput): Promise<void> {
      const rawBody = JSON.stringify({
        channel: 'email',
        templateKey: input.templateKey,
        recipient: input.recipient,
        variables: input.variables,
      })
      const ts = Math.floor(Date.now() / 1000)
      const signature = signHmac(opts.hmacSecret, `${input.idempotencyKey}.${rawBody}`, ts)
      const res = await doFetch(`${opts.gatewayUrl}/messaging/send`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-consumer-id': opts.consumerId,
          'x-signature': `t=${ts},v1=${signature}`,
          'idempotency-key': input.idempotencyKey,
        },
        body: rawBody,
      })
      if (!res.ok) {
        const body = await res.text().catch(() => '')
        throw new Error(`messaging/send falhou: ${res.status} ${body.slice(0, 300)}`)
      }
    },
  }
}

/** No-op para dev/teste sem gateway configurado (o envio é best-effort mesmo). */
export function createNullMessagingClient(logger?: Logger): MessagingClient {
  return {
    async sendEmail(input: SendEmailInput): Promise<void> {
      logger?.debug('messaging.noop', { templateKey: input.templateKey })
    },
  }
}
