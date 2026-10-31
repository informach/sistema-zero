import type { PublicoDosMembros } from './membros.port'

/**
 * A porta das roupas do Members (`POST /members/internal/arquipelago/avatar/pecas`, o mesmo token
 * das moedas). Conceder é idempotente por peça: pedir de novo nunca duplica nem cobra.
 * - `concedido`: `concedidas` são as que chegaram agora (as já possuídas ficam de fora).
 * - `recusado`: o Members recusou de vez (dono diferente, peça desconhecida): vai ao log.
 * Rede, tempo ou resposta estranha lançam `AvatarIndisponivelError`: tenta-se na próxima vez.
 */
export interface PortaDoAvatar {
  conceder(pedido: {
    userId: string
    accountId: string
    audience: PublicoDosMembros
    pecas: string[]
  }): Promise<
    { situacao: 'concedido'; concedidas: string[] } | { situacao: 'recusado'; codigo: string }
  >
}

export class AvatarIndisponivelError extends Error {
  constructor(readonly status?: number) {
    super('As roupas do avatar não responderam agora.')
  }
}
