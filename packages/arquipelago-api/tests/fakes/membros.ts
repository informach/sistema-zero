import type { PortaDosMembros } from '../../src/domain/membros.port'

const nunca = (nome: string) => async () => {
  throw new Error(`${nome} não deveria ser chamado neste teste`)
}

/** Members de mentira: só o que o teste passar; o resto falha alto se for chamado. */
export function membrosDeMentira(parcial: Partial<PortaDosMembros> = {}): PortaDosMembros {
  return {
    lerJornada: nunca('lerJornada'),
    lerJogador: nunca('lerJogador'),
    lerCurriculo: nunca('lerCurriculo'),
    analisarObjetivos: nunca('analisarObjetivos'),
    verificarObjetivos: nunca('verificarObjetivos'),
    ...parcial,
  }
}
