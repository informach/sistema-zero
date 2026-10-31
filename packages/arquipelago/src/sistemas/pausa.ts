/** A mesma interrupção bloqueia os comandos do personagem e o tempo competitivo do percurso. */
export interface SinaisDePausa {
  menuAberto: boolean
  painelAberto: string | null
  ferramentaAberta: boolean
  tempoAcabou: boolean
  tempoPausado: boolean
  tempoSincronizando: boolean
  resultado: object | null
  salvamentoSituacao?: string
  /** Cochilando no lugar (a energia no zero): os comandos esperam ela acordar em casa. */
  cochilando?: boolean
}

export function salvamentoPausado(situacao?: string): boolean {
  return (
    situacao === 'conflito' ||
    situacao === 'erro-local' ||
    situacao === 'recusado' ||
    situacao === 'confirmando'
  )
}

export function jogoPausado(s: SinaisDePausa): boolean {
  return (
    s.menuAberto ||
    s.painelAberto !== null ||
    s.ferramentaAberta ||
    s.tempoAcabou ||
    s.tempoPausado ||
    s.tempoSincronizando ||
    salvamentoPausado(s.salvamentoSituacao) ||
    s.resultado !== null ||
    s.cochilando === true
  )
}
