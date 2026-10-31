import type {
  PagamentoDaProfissao,
  PostoDaVila,
  PublicoJogo,
} from '@sistemazero/arquipelago-contracts'

export interface TurnoGuardado {
  id: string
  jogadorId: string
  contaId: string
  publico: PublicoJogo
  posto: PostoDaVila
  dia: string
  versao: number
  moedas: number
  concluidoEm: Date | null
  pagamento: PagamentoDaProfissao
  tetoSemana: string | null
}

export interface RepositorioDasProfissoes {
  reservar(
    entrada: Omit<TurnoGuardado, 'concluidoEm' | 'pagamento' | 'tetoSemana'>,
    agora: Date,
  ): Promise<TurnoGuardado>
  ler(id: string, jogadorId: string, publico: PublicoJogo): Promise<TurnoGuardado | null>
  concluir(id: string, jogadorId: string, publico: PublicoJogo, agora: Date): Promise<TurnoGuardado>
  /** Nunca rebaixar creditado para teto se duas confirmações chegarem fora de ordem. */
  marcarPagamento(id: string, situacao: 'creditado' | 'teto', semana: string): Promise<void>
  pendentes(
    jogadorId: string,
    publico: PublicoJogo,
    semana: string,
    limite: number,
  ): Promise<TurnoGuardado[]>
}
