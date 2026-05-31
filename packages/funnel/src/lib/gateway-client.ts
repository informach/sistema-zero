import { signHmac } from '@sistemazero/core/security'

// Cliente do funil → api-gateway (BFF). Assina por HMAC de borda exatamente como
// o gateway espera (mensagem canônica "<ts>.<idempotencyKey>.<corpo>" no POST com
// Idempotency-Key, ou "<ts>.<corpo>" sem ela). O gateway re-assina p/ o payments.
// O funil NUNCA fala com o payments direto.

export interface GatewayClientOptions {
  baseUrl: string
  consumerId: string
  hmacSecret: string
  /** Injetável em testes; default = fetch global. */
  fetchImpl?: typeof fetch
}

export interface GatewayResult<T = unknown> {
  status: number
  body: T
}

async function readBody(res: Response): Promise<unknown> {
  try {
    return await res.json()
  } catch {
    return null
  }
}

export function createGatewayClient(opts: GatewayClientOptions) {
  const doFetch = opts.fetchImpl ?? fetch

  function buildHeaders(rawBody: string, idempotencyKey?: string): Record<string, string> {
    const ts = Math.floor(Date.now() / 1000)
    const message = idempotencyKey ? `${idempotencyKey}.${rawBody}` : rawBody
    const signature = signHmac(opts.hmacSecret, message, ts)
    const headers: Record<string, string> = {
      'content-type': 'application/json',
      'x-consumer-id': opts.consumerId,
      'x-signature': `t=${ts},v1=${signature}`,
    }
    if (idempotencyKey) headers['idempotency-key'] = idempotencyKey
    return headers
  }

  return {
    /** POST /payments (via gateway → payments). idempotencyKey determinístico por lead. */
    async createPayment(input: unknown, idempotencyKey: string): Promise<GatewayResult> {
      const rawBody = JSON.stringify(input)
      const res = await doFetch(`${opts.baseUrl}/payments`, {
        method: 'POST',
        headers: buildHeaders(rawBody, idempotencyKey),
        body: rawBody,
      })
      return { status: res.status, body: await readBody(res) }
    },

    /** GET /payments/:id (corpo vazio → assina "<ts>."). */
    async getPayment(paymentId: string): Promise<GatewayResult> {
      const res = await doFetch(`${opts.baseUrl}/payments/${encodeURIComponent(paymentId)}`, {
        method: 'GET',
        headers: buildHeaders(''),
      })
      return { status: res.status, body: await readBody(res) }
    },
  }
}

export type GatewayClient = ReturnType<typeof createGatewayClient>
