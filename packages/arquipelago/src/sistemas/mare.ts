import type { Salvamento } from '@sistemazero/arquipelago-contracts'

/** Apresentação proposta a partir da tartaruga cartógrafa do documento do jogo. */
export const APRESENTACAO_DA_MARE = [
  'Sou Maré. Faço mapas do mar.',
  'Sem meus mapas, o mar perdeu as rotas.',
] as const

export const MARE_NO_RECIFE = {
  /** Mesmas distâncias e tempos do Bento, para manter o jeito das conversas. */
  olharDe: 7,
  alcance: 2.2,
  acenoACada: 45,
  rapidezDoGiro: 3,
  /** Cilindro simples do corpo medido em mare.glb, sem prender a câmera no mapa carregado. */
  raio: 0.46,
  altura: 1.45,
  /** Centro dos olhos no modelo. */
  alturaDaCabeca: 1.2,
} as const

/** A apresentação não cria amizade, pedidos nem alterações no salvamento. */
export function comecarConversaComAMare(salvamento: Salvamento) {
  return { salvamento, falas: [...APRESENTACAO_DA_MARE] }
}
