export type AcaoDeSessaoDeTempo = 'iniciar' | 'pulsar' | 'pausar'
export type SituacaoDeSessaoDeTempo = 'ativa' | 'encerrada' | 'expirada' | 'substituida' | 'limite'

export interface PedidoDeSessaoDeTempo {
  jogadorId: string
  contaId: string
  sessaoId: string
  sequencia: number
  acao: AcaoDeSessaoDeTempo
  /** Sempre fornecido pelo serviço; o navegador não escolhe o horário. */
  agora: Date
}

export interface ResultadoDeSessaoDeTempo {
  situacao: SituacaoDeSessaoDeTempo
  usadoHojeSegundos: number
  limiteDiarioMinutos: number
  vencimento: Date | null
}

export interface RepositorioSessoesTempo {
  executar(pedido: PedidoDeSessaoDeTempo): Promise<ResultadoDeSessaoDeTempo>
}
