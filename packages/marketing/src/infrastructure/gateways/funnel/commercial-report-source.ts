import { canonicalHmacMessage, signHmac } from '@sistemazero/core/security'
import { type CommercialQuery, commercialReportSchema } from '@sistemazero/marketing-contracts'
import type { CommercialReportSource } from '../../../domain/ports/commercial-report.port'
export class GatewayCommercialReportSource implements CommercialReportSource {
  constructor(
    private readonly url: string,
    private readonly secret: string | undefined,
  ) {}
  async report(input: CommercialQuery) {
    if (!this.secret) throw new Error('Conexão com a medição do funil não configurada')
    const path = '/funnel/internal/marketing-attribution',
      body = JSON.stringify(input),
      ts = Math.floor(Date.now() / 1000),
      idempotencyKey = crypto.randomUUID()
    const signature = signHmac(
      this.secret,
      canonicalHmacMessage({ method: 'POST', path, body, idempotencyKey }),
      ts,
    )
    const response = await fetch(`${this.url.replace(/\/$/, '')}${path}`, {
      method: 'POST',
      body,
      redirect: 'error',
      signal: AbortSignal.timeout(10000),
      headers: {
        'content-type': 'application/json',
        'x-consumer-id': 'marketing',
        'x-signature': `t=${ts},v1=${signature}`,
        'idempotency-key': idempotencyKey,
      },
    })
    if (!response.ok) throw new Error('Medição do funil indisponível')
    const report = commercialReportSchema.parse(await response.json())
    if (
      report.from !== input.from ||
      report.to !== input.to ||
      report.campaign !== input.campaign ||
      report.content !== input.content
    )
      throw new Error('Resposta analítica pertence a outro contexto')
    return report
  }
}
