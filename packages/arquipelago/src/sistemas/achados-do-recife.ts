import type { Salvamento } from '@sistemazero/arquipelago-contracts'

export const ACHADOS_DO_RECIFE = {
  bau: { nome: 'Baú do navio', dica: 'No porão do navio afundado.', diversao: 15 },
  pagina: { nome: 'Página do Recife', dica: 'No cesto sob a vela caída do navio.', diversao: 0 },
  tesouro: { nome: 'Pérolas do labirinto', dica: 'Na gruta do labirinto de corais.', diversao: 15 },
} as const
export type AchadoDoRecife = keyof typeof ACHADOS_DO_RECIFE

export function guardarAchadoDoRecife(s: Salvamento, achado: AchadoDoRecife): Salvamento {
  if (s.recife[achado]) return s
  return {
    ...s,
    recife: { ...s.recife, [achado]: true },
    necessidades: {
      ...s.necessidades,
      diversao: Math.min(100, s.necessidades.diversao + ACHADOS_DO_RECIFE[achado].diversao),
    },
  }
}
