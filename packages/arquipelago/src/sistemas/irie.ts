import type { Salvamento } from '@sistemazero/arquipelago-contracts'

export const APRESENTACAO_DA_IRIE = [
  'Sou Iriê. Teço o arco-íris com estes fios.',
  'O tear fica aqui na Ilha das Nuvens.',
  // Fase4-08: a Iriê ensina o clima da sua ilha (a escolha fica no menu).
  'Com os fios eu também teço o tempo. No menu, escolha o clima da sua ilha: sol, nublado ou chuva.',
] as const

export const IRIE_NAS_NUVENS = {
  olharDe: 7,
  alcance: 2.2,
  acenoACada: 45,
  rapidezDoGiro: 3,
  /** Penas do tronco e cabeça principal: x ±0,3872, topo 1,49. Sem asas, cauda ou topete. */
  raio: 0.39,
  altura: 1.49,
  /** Centro do material olho: y 1,1879. */
  alturaDaCabeca: 1.19,
} as const

export function comecarConversaComAIrie(salvamento: Salvamento) {
  return { salvamento, falas: [...APRESENTACAO_DA_IRIE] }
}
