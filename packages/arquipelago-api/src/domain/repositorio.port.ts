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
    /**
     * A conta da criança do Kids (do login dela): guardada uma vez com a gravação aceita, para a
     * área dos pais ler só as crianças da própria conta. Adulto e equipe sem perfil: ausente.
     */
    contaId?: string | null
  }): Promise<ResultadoDaGravacao>
  /** Soma segundos ao dia (data de São Paulo, AAAA-MM-DD) e devolve o total do dia. */
  somarTempo(
    jogadorId: string,
    dia: string,
    segundos: number,
    agora: Date,
    eventoId?: string,
  ): Promise<number>
  lerTempo(jogadorId: string, dia: string): Promise<number>
  /**
   * O dia de jogo do adulto (lacunas, 01/11/2026): guarda o dia (São Paulo) com a primeira e a
   * última hora em que a pessoa abriu ou gravou o jogo. Opcional para os repositórios de teste.
   */
  marcarDiaDeJogo?(jogadorId: string, publico: PublicoJogo, dia: string, agora: Date): Promise<void>
  lerLimite(contaId: string): Promise<number | null>
  gravarLimite(contaId: string, minutos: number, agora: Date): Promise<number>
}
