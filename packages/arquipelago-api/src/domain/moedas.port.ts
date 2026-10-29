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

/**
 * Gastar moedas pela mesma porta (operação `debit`, 29/10/2026, a galeria): a mesma carteira, a
 * mesma trava e o mesmo livro de moedas da loja do quarto, no Members. A chave é única por compra:
 * repetir nunca cobra duas vezes (o Members devolve o débito já feito).
 * - `debitado`: pago agora ou já pago antes com a mesma chave; `saldo` é o de depois.
 * - `saldo-insuficiente`: nada foi cobrado.
 * - `recusado`: o Members recusou de vez (dono diferente, chave com outro valor): vai ao log.
 * Rede, tempo ou resposta estranha lançam `MoedasIndisponiveisError` (não se sabe se cobrou: a
 * compra fica pendente e o próximo pedido repete a mesma chave).
 */
export interface PortaDoDebito {
  debitar(pedido: {
    userId: string
    accountId: string
    audience: PublicoDosMembros
    key: string
    amount: number
  }): Promise<
    | { situacao: 'debitado'; saldo: number }
    | { situacao: 'saldo-insuficiente' }
    | { situacao: 'recusado'; codigo: string }
  >
}

export class MoedasIndisponiveisError extends Error {
  constructor(readonly status?: number) {
    super('A porta de moedas do Members não respondeu')
    this.name = 'MoedasIndisponiveisError'
  }
}
