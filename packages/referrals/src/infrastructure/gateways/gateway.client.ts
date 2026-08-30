import { canonicalHmacMessage, signHmac } from '@sistemazero/core/security'
import type {
  EnsureBuyerInput,
  GatewayResult,
  GrantManualOfferInput,
  ReferralsGateway,
  SendEmailInput,
} from '../../domain/ports/gateway.port'

/**
 * Cliente referrals → api-gateway (HMAC de borda, consumer `referrals`) — porte
 * fiel do gateway-client do funil: mensagem canônica
 * "<ts>.<MÉTODO>.<path>.<idempotencyKey|deliveryId>.<corpo>", header
 * `x-signature: t=,v1=`; o gateway injeta o token interno do destino (auth/
 * messaging) ou RE-ASSINA como consumer `gateway` (members, upstreamAuth resign).
 * Timeout/rede NUNCA lançam: viram 504 GATEWAY_TIMEOUT / 502 GATEWAY_UNREACHABLE
 * (os serviços tratam por status).
 */
export interface GatewayClientOptions {
  baseUrl: string
  hmacSecret: string
  timeoutMs: number
  fetchImpl?: typeof fetch
}

async function readBody(res: Response): Promise<unknown> {
  try {
    return await res.json()
  } catch {
    return null
  }
}

export function createReferralsGatewayClient(opts: GatewayClientOptions): ReferralsGateway {
  const doFetch = opts.fetchImpl ?? fetch

  async function requestJson(url: string, init: RequestInit): Promise<GatewayResult> {
    const controller = new AbortController()
    // AbortController + clearTimeout (NÃO AbortSignal.timeout): o signal de
    // fábrica não é cancelável — timers pendentes acumulam e penduram o bun test.
    const timer = setTimeout(
      () => controller.abort(new DOMException('gateway timeout', 'TimeoutError')),
      opts.timeoutMs,
    )
    try {
      const res = await doFetch(url, { ...init, signal: controller.signal })
      return { status: res.status, body: await readBody(res) }
    } catch (err) {
      const timedOut = err instanceof DOMException && err.name === 'TimeoutError'
      return {
        status: timedOut ? 504 : 502,
        body: {
          error: {
            code: timedOut ? 'GATEWAY_TIMEOUT' : 'GATEWAY_UNREACHABLE',
            message: err instanceof Error ? err.message : String(err),
          },
        },
      }
    } finally {
      clearTimeout(timer)
    }
  }

  function buildHeaders(
    method: string,
    path: string,
    rawBody: string,
    idempotencyKey?: string,
    deliveryId?: string,
  ): Record<string, string> {
    const ts = Math.floor(Date.now() / 1000)
    // O path assinado é o MESMO usado na URL (pathname, sem query).
    const message = canonicalHmacMessage({
      method,
      path,
      idempotencyKey,
      deliveryId,
      body: rawBody,
    })
    const signature = signHmac(opts.hmacSecret, message, ts)
    const headers: Record<string, string> = {
      'content-type': 'application/json',
      'x-consumer-id': 'referrals',
      'x-signature': `t=${ts},v1=${signature}`,
    }
    if (idempotencyKey) headers['idempotency-key'] = idempotencyKey
    if (deliveryId) headers['x-delivery-id'] = deliveryId
    return headers
  }

  return {
    async ensureBuyer(input: EnsureBuyerInput): Promise<GatewayResult> {
      const rawBody = JSON.stringify(input)
      const path = '/auth/internal/ensure-buyer'
      return requestJson(`${opts.baseUrl}${path}`, {
        method: 'POST',
        headers: buildHeaders('POST', path, rawBody),
        body: rawBody,
      })
    },

    async createPasswordToken(email: string): Promise<GatewayResult> {
      const rawBody = JSON.stringify({ email })
      const path = '/auth/internal/password-tokens'
      return requestJson(`${opts.baseUrl}${path}`, {
        method: 'POST',
        headers: buildHeaders('POST', path, rawBody),
        body: rawBody,
      })
    },

    async grantManualOffer(input: GrantManualOfferInput): Promise<GatewayResult> {
      const { deliveryId, ...body } = input
      const rawBody = JSON.stringify(body)
      const path = '/members/webhooks/grant-manual'
      return requestJson(`${opts.baseUrl}${path}`, {
        method: 'POST',
        headers: buildHeaders('POST', path, rawBody, undefined, deliveryId),
        body: rawBody,
      })
    },

    async sendEmail(input: SendEmailInput, idempotencyKey: string): Promise<GatewayResult> {
      const rawBody = JSON.stringify({
        channel: 'email',
        templateKey: input.templateKey,
        recipient: input.recipient,
        variables: input.variables,
      })
      const path = '/messaging/send'
      return requestJson(`${opts.baseUrl}${path}`, {
        method: 'POST',
        headers: buildHeaders('POST', path, rawBody, idempotencyKey),
        body: rawBody,
      })
    },
  }
}

/** No-op p/ dev/teste sem gateway: leituras 502, envios "não saíram". */
export function createNullReferralsGateway(): ReferralsGateway {
  const unavailable: GatewayResult = {
    status: 502,
    body: { error: { code: 'GATEWAY_UNCONFIGURED', message: 'GATEWAY_URL ausente' } },
  }
  return {
    ensureBuyer: async () => unavailable,
    createPasswordToken: async () => unavailable,
    grantManualOffer: async () => unavailable,
    sendEmail: async () => unavailable,
  }
}
