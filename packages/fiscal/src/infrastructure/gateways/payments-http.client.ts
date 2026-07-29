import type { PaymentSnapshot, PaymentsClient } from '../../domain/ports/clients.port'

/**
 * Cliente da rota interna S2S do payments (`GET /payments/internal/payments/:id`,
 * auth = x-internal-token). Parse defensivo: campo faltando → erro alto (drift de
 * contrato não vira nota errada). Espelha o catalog-http.gateway do members.
 */
export class PaymentsHttpClient implements PaymentsClient {
  constructor(
    private readonly opts: { baseUrl: string; internalToken?: string; timeoutMs: number },
  ) {}

  async getPayment(paymentId: string): Promise<PaymentSnapshot | null> {
    const res = await fetch(
      `${this.opts.baseUrl}/payments/internal/payments/${encodeURIComponent(paymentId)}`,
      {
        headers: this.opts.internalToken ? { 'x-internal-token': this.opts.internalToken } : {},
        signal: AbortSignal.timeout(this.opts.timeoutMs),
      },
    )
    if (res.status === 404) return null
    if (!res.ok) throw new Error(`payments respondeu ${res.status}`)

    const body = (await res.json()) as Record<string, unknown>
    const id = expectString(body, 'id')
    const status = expectString(body, 'status')
    // bigint não é JSON: aceitar number aqui arredondaria valores acima de
    // Number.MAX_SAFE_INTEGER antes de chegarem ao fiscal.
    const amountInCents = parseCents(body.amountInCents)

    const customer = (body.customer ?? null) as PaymentSnapshot['customer']
    const metadata = (body.metadata ?? {}) as Record<string, unknown>
    const paidAt = typeof body.paidAt === 'string' ? new Date(body.paidAt) : null
    const refundedRaw = body.refundedAt ?? metadata.refundedAt
    const refundedAt = typeof refundedRaw === 'string' ? new Date(refundedRaw) : null

    return { id, status, amountInCents, paidAt, customer, metadata, refundedAt }
  }
}

function expectString(body: Record<string, unknown>, field: string): string {
  const value = body[field]
  if (typeof value !== 'string')
    throw new Error(`payments: campo ${field} ausente/inválido na view`)
  return value
}

function parseCents(value: unknown): bigint {
  if (typeof value !== 'string' || !/^\d+$/.test(value)) {
    throw new Error('payments: amountInCents deve ser uma string inteira na view')
  }
  return BigInt(value)
}
