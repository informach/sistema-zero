import type { Salvamento } from '@sistemazero/arquipelago-contracts'
import { falasDoFloco } from './banda'

export const FLOCO_NO_PICO = {
  /** As distâncias e os tempos do Bento e da Maré, com o alcance um pouco maior: ele fica no tablado. */
  olharDe: 7,
  alcance: 2.6,
  acenoACada: 45,
  rapidezDoGiro: 3,
  /** O corpo medido em floco.glb (o cavaquinho, que sai para o lado, fica fora do cilindro). */
  raio: 0.43,
  altura: 1.49,
  /** O meio dos olhos no modelo. */
  alturaDaCabeca: 1.19,
} as const

/**
 * A conversa não cria amizade, pedidos nem alterações no salvamento. Desde a fase3-08 ela diz onde
 * ficou cada instrumento que falta e, com a banda completa, fala do festival (`falasDoFloco`).
 */
export function comecarConversaComOFloco(salvamento: Salvamento) {
  return { salvamento, falas: falasDoFloco(salvamento) }
}
