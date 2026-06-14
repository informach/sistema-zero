import type { Logger } from '@sistemazero/core/logging'
import { canonicalHmacMessage, signHmac } from '@sistemazero/core/security'
import type {
  MessagingClient,
  SendInvoiceEmailInput,
} from '../../domain/ports/messaging-client.port'

/**
 * Cliente fiscal → api-gateway → @sistemazero/messaging (template `nfse-emitida`
 * + anexo por URL). HMAC de borda como consumer `fiscal` (mensagem canônica
 * "<MÉTODO>.<path>.<idem>.<corpo>", padrão do funil/auth); o gateway injeta o
 * x-internal-token do messaging. O fiscal NUNCA fala com o messaging direto.
 */
export function createGatewayMessagingClient(opts: {
  gatewayUrl: string
  hmacSecret: string
  timeoutMs: number
  fetchImpl?: typeof fetch
}): MessagingClient {
  const doFetch = opts.fetchImpl ?? fetch

  return {
    async sendInvoiceEmail(input: SendInvoiceEmailInput): Promise<boolean> {
      const rawBody = JSON.stringify({
        channel: 'email',
        templateKey: 'nfse-emitida',
        recipient: input.recipient,
        variables: input.variables,
        attachments: input.attachments,
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
      const res = await doFetch(`${opts.gatewayUrl}${path}`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-consumer-id': 'fiscal',
          'x-signature': `t=${ts},v1=${signature}`,
          'idempotency-key': input.idempotencyKey,
        },
        body: rawBody,
        signal: AbortSignal.timeout(opts.timeoutMs),
      })
      if (!res.ok) {
        const body = await res.text().catch(() => '')
        throw new Error(`messaging/send falhou: ${res.status} ${body.slice(0, 300)}`)
      }
      return true
    },
  }
}

/** No-op p/ dev/teste sem gateway: retorna `false` (NÃO marca emailSentAt). */
export function createNullMessagingClient(logger?: Logger): MessagingClient {
  return {
    async sendInvoiceEmail(input: SendInvoiceEmailInput): Promise<boolean> {
      logger?.debug('fiscal.messaging_noop', { idempotencyKey: input.idempotencyKey })
      return false
    },
  }
}
