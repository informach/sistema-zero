import type { Salvamento } from '@sistemazero/arquipelago-contracts'
import {
  FALA_DA_JADE_COM_O_FILHOTE,
  FALA_DA_JADE_COM_O_OVO,
  FALA_DO_OVO,
  nasceu,
  OVO_NOVO,
} from './filhote-do-vale'
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

export const FALA_DOS_TRES_NINHOS = 'Você cuidou dos três ninhos.'

/**
 * Antes dos três ninhos, a apresentação. Com eles, a Jade entrega o ovo do filhote (fase4-03, a
 * única mudança no salvamento, uma vez só) e depois fala do ovo ou do filhote.
 */
export function comecarConversaComAJade(salvamento: Salvamento) {
  if (!todosOsNinhosCuidados(salvamento)) return { salvamento, falas: [...APRESENTACAO_DA_JADE] }
  const filhote = salvamento.vale.filhote
  if (filhote === null)
    return {
      salvamento: { ...salvamento, vale: { ...salvamento.vale, filhote: { ...OVO_NOVO } } },
      falas: [FALA_DOS_TRES_NINHOS, ...FALA_DO_OVO],
    }
  return {
    salvamento,
    falas: [nasceu(filhote) ? FALA_DA_JADE_COM_O_FILHOTE : FALA_DA_JADE_COM_O_OVO],
  }
}
