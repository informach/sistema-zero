import type { Salvamento } from '@sistemazero/arquipelago-contracts'
import { adicionar, quantidade } from './itens'

/**
 * O cristal raro da caverna do Pico Gelado (fase3-07): no alto da saliência do fundo, "Pegar o
 * cristal" põe o cristal rosa na mochila, uma vez por jogo. Com ele na mochila, o cristal some do
 * pedestal. O inventário já aceita itens novos, então não há versão nova do salvamento.
 */
export const CRISTAL_RARO = {
  item: 'cristal-rosa',
  /** De quão perto, no plano, o "Pegar o cristal" aparece. */
  alcance: 1.3,
  /** Os pés até isto acima ou abaixo do alto da saliência (de baixo dela não se alcança). */
  altura: 0.8,
} as const

export const FALA_DO_CRISTAL_RARO =
  'O cristal rosa está na mochila. Ele brilha como o gelo da caverna.'

export function temOCristalRaro(s: Salvamento): boolean {
  return quantidade(s.inventario, CRISTAL_RARO.item) > 0
}

/** Põe o cristal na mochila (uma vez só: com ele lá, nada muda). */
export function pegarOCristalRaro(s: Salvamento): Salvamento {
  if (temOCristalRaro(s)) return s
  return { ...s, inventario: adicionar(s.inventario, CRISTAL_RARO.item) }
}

/** Dá para pegar daqui: perto no plano e de pé no alto da saliência. */
export function alcancaOCristalRaro(
  cristal: { x: number; y: number; z: number },
  pes: { x: number; y: number; z: number },
): boolean {
  return (
    Math.hypot(pes.x - cristal.x, pes.z - cristal.z) <= CRISTAL_RARO.alcance &&
    Math.abs(pes.y - cristal.y) <= CRISTAL_RARO.altura
  )
}
