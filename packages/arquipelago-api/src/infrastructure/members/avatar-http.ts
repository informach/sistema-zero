import { RespostaDasRoupasSchema } from '@sistemazero/arquipelago-contracts'
import { AvatarIndisponivelError, type PortaDoAvatar } from '../../domain/avatar.port'
import { TEMPO_DAS_MOEDAS_MS } from './moedas-http'

/** Adaptador HTTP da porta das roupas do Members (rota interna, nunca pelo gateway). */
export class AvatarHttp implements PortaDoAvatar {
  constructor(private readonly config: { url: string; token: string; fetch?: typeof fetch }) {}

  async conceder(pedido: Parameters<PortaDoAvatar['conceder']>[0]) {
    let resposta: Response
    try {
      resposta = await (this.config.fetch ?? fetch)(
        new URL('/members/internal/arquipelago/avatar/pecas', this.config.url),
        {
          method: 'POST',
          headers: {
            'x-arquipelago-token': this.config.token,
            accept: 'application/json',
            'content-type': 'application/json',
          },
          body: JSON.stringify(pedido),
          signal: AbortSignal.timeout(TEMPO_DAS_MOEDAS_MS),
        },
      )
    } catch {
      throw new AvatarIndisponivelError()
    }
    // 200 = feito; 403/409 = recusa com código. Qualquer outra coisa conta como fora do ar.
    if (![200, 403, 409].includes(resposta.status))
      throw new AvatarIndisponivelError(resposta.status)
    let json: unknown
    try {
      json = await resposta.json()
    } catch {
      throw new AvatarIndisponivelError(resposta.status)
    }
    const lido = RespostaDasRoupasSchema.safeParse(json)
    if (!lido.success) throw new AvatarIndisponivelError(resposta.status)
    return lido.data.ok
      ? { situacao: 'concedido' as const, concedidas: lido.data.concedidas }
      : { situacao: 'recusado' as const, codigo: lido.data.code }
  }
}
