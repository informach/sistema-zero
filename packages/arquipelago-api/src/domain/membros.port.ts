import type {
  CurriculoDeBlocos,
  JogadorDosMembros,
  JornadaDosMembros,
} from '@sistemazero/arquipelago-contracts'

/** O público como o Members o chama. */
export type PublicoDosMembros = 'kids' | 'adult'

export interface PerguntaDoJogador {
  userId: string
  accountId: string
  audience: PublicoDosMembros
}

/** Leituras do serviço do jogo no Members (rotas internas, token próprio). */
export interface PortaDosMembros {
  lerJornada(signal?: AbortSignal): Promise<JornadaDosMembros>
  lerJogador(pergunta: PerguntaDoJogador, signal?: AbortSignal): Promise<JogadorDosMembros>
  lerCurriculo(audience: PublicoDosMembros, signal?: AbortSignal): Promise<CurriculoDeBlocos>
}

/** O Members não respondeu, respondeu erro ou mandou um formato que o contrato não aceita. */
export class MembrosIndisponiveisError extends Error {
  constructor(
    readonly motivo: 'rede' | 'status' | 'formato',
    readonly status?: number,
  ) {
    super('Members indisponível para o jogo')
    this.name = 'MembrosIndisponiveisError'
  }
}
