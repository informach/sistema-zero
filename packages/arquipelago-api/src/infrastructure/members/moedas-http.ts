import { z } from 'zod'
import { MoedasIndisponiveisError, type PortaDasMoedas } from '../../domain/moedas.port'

/** Pagar moedas nunca segura a resposta do jogo: passou disso, o prêmio fica pendente. */
export const TEMPO_DAS_MOEDAS_MS = 5_000

const Resposta = z.union([
  z.object({ ok: z.literal(true) }),
  z.object({ ok: z.literal(false), code: z.string().min(1).max(60) }),
])

/** Adaptador HTTP da porta de moedas do Members (rota interna, nunca pelo gateway). */
export class MoedasHttp implements PortaDasMoedas {
  constructor(private readonly config: { url: string; token: string; fetch?: typeof fetch }) {}

  async creditar(pedido: Parameters<PortaDasMoedas['creditar']>[0]) {
    let resposta: Response
    try {
      resposta = await (this.config.fetch ?? fetch)(
        new URL('/members/internal/arquipelago/coins', this.config.url),
        {
          method: 'POST',
          headers: {
            'x-arquipelago-token': this.config.token,
            accept: 'application/json',
            'content-type': 'application/json',
          },
          body: JSON.stringify({ ...pedido, operation: 'credit' }),
          signal: AbortSignal.timeout(TEMPO_DAS_MOEDAS_MS),
        },
      )
    } catch {
      throw new MoedasIndisponiveisError()
    }
    // 200 = pago; 403/409 = recusa com código. Qualquer outra coisa conta como fora do ar.
    if (![200, 403, 409].includes(resposta.status))
      throw new MoedasIndisponiveisError(resposta.status)
    let corpo: unknown
    try {
      corpo = await resposta.json()
    } catch {
      throw new MoedasIndisponiveisError(resposta.status)
    }
    const lido = Resposta.safeParse(corpo)
    if (!lido.success) throw new MoedasIndisponiveisError(resposta.status)
    if (lido.data.ok) return { situacao: 'creditado' as const }
    if (lido.data.code === 'WEEKLY_LIMIT') return { situacao: 'teto' as const }
    return { situacao: 'recusado' as const, codigo: lido.data.code }
  }
}
