/** Contratos do diagnóstico compartilhado pelos funis. */
export interface ResultSecao {
  rotulo: string
  texto: string
}

export interface ResultProfile {
  titulo: string
  /** Corpo corrido (narrativa). Use ISTO **ou** `secoes`. Marcadores resolvidos pelo renderCorpo. */
  corpo?: string
  cta: string
  /**
   * Diagnóstico QUEBRADO em blocos rotulados (alternativa ao `corpo` corrido). Capacidade
   * compartilhada: quando presente, a tela de resultado renderiza os blocos; senão cai no `corpo`.
   */
  secoes?: ResultSecao[]
}
