import type { Salvamento } from '@sistemazero/arquipelago-contracts'

/** Apresentação proposta a partir da coruja dos fósseis e da lupa que aparece no modelo. */
export const APRESENTACAO_DA_JADE = [
  'Sou Jade. Estudo os fósseis do Vale dos Dinos.',
  'Minha lupa ajuda a olhar os detalhes dos fósseis.',
] as const

export const JADE_NO_VALE = {
  /** Mesmos parâmetros da Maré: conversa acessível do chão, sem uma regra nova. */
  olharDe: 7,
  alcance: 2.2,
  acenoACada: 45,
  rapidezDoGiro: 3,
  /** jade.glb, material penas: x ±0,405827 e topo y 1,5. Sem asas, lupa ou chapéu. */
  raio: 0.41,
  altura: 1.5,
  /** Centro dos olhos de material iris, entre y 1,045 e 1,255. */
  alturaDaCabeca: 1.15,
} as const

/** Só apresentação: preserva o salvamento e não compartilha uma lista mutável de falas. */
export function comecarConversaComAJade(salvamento: Salvamento) {
  return { salvamento, falas: [...APRESENTACAO_DA_JADE] }
}
