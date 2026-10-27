import type { PublicoDosMembros } from './membros.port'

/**
 * A porta de moedas do Members (`POST /members/internal/arquipelago/coins`, token
 * `ARQUIPELAGO_COINS_TOKEN`). A chave é única por prêmio: repetir nunca paga duas vezes.
 * - `creditado`: pago agora ou já pago antes com a mesma chave.
 * - `teto`: o teto semanal de moedas do jogo já foi alcançado (tenta de novo numa semana seguinte).
 * - `recusado`: o Members recusou de vez (dono diferente, chave com outro valor): vai ao log.
 * Rede, tempo ou resposta estranha lançam `MoedasIndisponiveisError` e o prêmio fica pendente.
 */
export interface PortaDasMoedas {
  creditar(pedido: {
    userId: string
    accountId: string
    audience: PublicoDosMembros
    key: string
    amount: number
  }): Promise<{ situacao: 'creditado' | 'teto' } | { situacao: 'recusado'; codigo: string }>
}

export class MoedasIndisponiveisError extends Error {
  constructor(readonly status?: number) {
    super('A porta de moedas do Members não respondeu')
    this.name = 'MoedasIndisponiveisError'
  }
}
