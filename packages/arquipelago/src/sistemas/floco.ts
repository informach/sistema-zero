import type { Salvamento } from '@sistemazero/arquipelago-contracts'
import { falasDoFloco, festivalDeInverno } from './banda'
import { FALA_DA_CORRENTE, FALA_DO_PLANADOR, pegarPlanador, temPlanador } from './planador'

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
 * A conversa não cria amizade nem pedidos. Desde a fase3-08 ela diz onde ficou cada instrumento que
 * falta e, com a banda completa, fala do festival (`falasDoFloco`). No festival, a primeira conversa
 * dá o planador (fase3-09, o único jeito de mudar o salvamento aqui); as seguintes lembram do vento
 * da parede de gelo.
 */
export function comecarConversaComOFloco(salvamento: Salvamento) {
  const falas = falasDoFloco(salvamento)
  if (!festivalDeInverno(salvamento)) return { salvamento, falas }
  if (temPlanador(salvamento)) return { salvamento, falas: [...falas, FALA_DA_CORRENTE] }
  return {
    salvamento: pegarPlanador(salvamento),
    falas: [...falas, FALA_DO_PLANADOR, FALA_DA_CORRENTE],
  }
}
