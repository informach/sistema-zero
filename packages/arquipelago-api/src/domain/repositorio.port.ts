import type { PublicoJogo, Salvamento } from '@sistemazero/arquipelago-contracts'

export interface SalvamentoNoBanco {
  revisao: number
  dados: unknown
  atualizadoEm: Date
}

export type ResultadoDaGravacao =
  | { ok: true; guardado: SalvamentoNoBanco }
  | { ok: false; atual: SalvamentoNoBanco | null }

/** Porta de persistência do serviço do jogo (schema `arquipelago`). */
export interface RepositorioDoJogo {
  lerSalvamento(jogadorId: string): Promise<SalvamentoNoBanco | null>
  /**
   * Grava se a revisão guardada ainda for `revisaoBase` (0 = nada guardado). Atômico: dois
   * aparelhos gravando juntos, só um vence; o outro recebe o que está guardado.
   */
  gravarSalvamento(entrada: {
    jogadorId: string
    publico: PublicoJogo
    revisaoBase: number
    salvamento: Salvamento
    agora: Date
  }): Promise<ResultadoDaGravacao>
  /** Soma segundos ao dia (data de São Paulo, AAAA-MM-DD) e devolve o total do dia. */
  somarTempo(jogadorId: string, dia: string, segundos: number, agora: Date): Promise<number>
  lerTempo(jogadorId: string, dia: string): Promise<number>
  lerLimite(contaId: string): Promise<number | null>
  gravarLimite(contaId: string, minutos: number, agora: Date): Promise<number>
}
