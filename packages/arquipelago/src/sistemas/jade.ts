import type { Salvamento } from '@sistemazero/arquipelago-contracts'
import { todosOsNinhosCuidados } from './vale'

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

/** Apresentação ou reconhecimento dos ninhos, sem mudar o salvamento ou compartilhar a lista. */
export function comecarConversaComAJade(salvamento: Salvamento) {
  return {
    salvamento,
    falas: todosOsNinhosCuidados(salvamento)
      ? ['Você cuidou dos três ninhos.', 'Observar sem tocar e dar espaço ajuda a cuidar dos ovos.']
      : [...APRESENTACAO_DA_JADE],
  }
}
