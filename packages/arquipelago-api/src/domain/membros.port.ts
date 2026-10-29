import type {
  AnaliseDosMembros,
  AulasConcluidasDosMembros,
  CurriculoDeBlocos,
  JogadorDosMembros,
  JornadaDosMembros,
  ObjetivoDoDesafio,
  VerificacaoDosMembros,
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
  /** A hora das aulas concluídas destas pessoas entre `de` e `ate` (a volta ao curso dos pais). */
  lerAulasConcluidas(
    pergunta: { usuarios: string[]; de: Date; ate: Date },
    signal?: AbortSignal,
  ): Promise<AulasConcluidasDosMembros>
  /** Confere um desafio com o verificador das aulas (pode rodar o jogo: demora). */
  analisarObjetivos(pedido: {
    audience: PublicoDosMembros
    projetoInicial: unknown
    gabarito: unknown
    objetivos: ObjetivoDoDesafio[]
  }): Promise<AnaliseDosMembros>
  /** Confere o projeto de quem joga. 424/429 do executor viram `ConferenciaIndisponivelError`. */
  verificarObjetivos(pedido: {
    requester: string
    audience: PublicoDosMembros
    objetivos: ObjetivoDoDesafio[]
    projetoInicial: unknown
    projeto: unknown
  }): Promise<VerificacaoDosMembros>
}

/** O executor não respondeu (424) ou está cheio (429): nada é guardado, a pessoa tenta de novo. */
export class ConferenciaIndisponivelError extends Error {
  constructor(readonly motivo: 'indisponivel' | 'ocupado' | 'recusado' | 'sincronizando') {
    super('Não foi possível conferir agora')
    this.name = 'ConferenciaIndisponivelError'
  }
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
