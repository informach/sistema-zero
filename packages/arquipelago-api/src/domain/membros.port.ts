import type {
  AnaliseDosMembros,
  AulasConcluidasDosMembros,
  CurriculoDeBlocos,
  JogadorDosMembros,
  JornadaDosMembros,
  ObjetivoDoDesafio,
  QuartoDosMembros,
  SaldoDosMembros,
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
  /** As moedas Zappy de quem joga (o cartão da galeria mostra antes de comprar). */
  lerSaldo(pergunta: PerguntaDoJogador, signal?: AbortSignal): Promise<SaldoDosMembros>
  /** O quarto de UM perfil, como o Meu quarto dele mostra (a visita de um irmão, fase3-12). */
  lerQuarto(
    pergunta: { userId: string; audience: PublicoDosMembros },
    signal?: AbortSignal,
  ): Promise<QuartoDosMembros>
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
  /**
   * O ambiente Python do Estúdio de desafio (C02b): a decisão do Members para o pedido do Estúdio,
   * conferido contra o projeto inicial. Recusa do Members vira `AmbienteRecusadoError`.
   */
  autorizarAmbiente(pedido: {
    requester: string
    accountId: string
    audience: PublicoDosMembros
    projetoInicial: unknown
    pedido: unknown
  }): Promise<unknown>
}

/** O Members recusou o ambiente (outro projeto, outro ambiente, release revogada): a frase dele. */
export class AmbienteRecusadoError extends Error {
  constructor(mensagem?: string) {
    super(mensagem ?? 'Este ambiente não está disponível para o desafio.')
    this.name = 'AmbienteRecusadoError'
  }
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
