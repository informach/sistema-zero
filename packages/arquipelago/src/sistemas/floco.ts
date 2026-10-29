import type { Salvamento } from '@sistemazero/arquipelago-contracts'

/**
 * Apresentação proposta a partir do que o jogo já diz do Floco: o pinguim músico do Pico Gelado,
 * de cachecol e cavaquinho (`arte/personagens`), com o palco na ilha e a banda e o festival de
 * inverno da fase3-08.
 */
export const APRESENTACAO_DO_FLOCO = [
  'Sou Floco. Toco cavaquinho no palco do Pico Gelado.',
  'Ainda falta gente para a banda tocar no festival de inverno.',
] as const

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

/** A apresentação não cria amizade, pedidos nem alterações no salvamento. */
export function comecarConversaComOFloco(salvamento: Salvamento) {
  return { salvamento, falas: [...APRESENTACAO_DO_FLOCO] }
}
