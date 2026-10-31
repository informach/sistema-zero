import { type Humor, humor, type Salvamento } from '@sistemazero/arquipelago-contracts'

export { type Humor, humor } from '@sistemazero/arquipelago-contracts'

import type { Item } from './itens'

export type Necessidades = Salvamento['necessidades']

/**
 * Fome, energia e diversão (100 = tudo bem). Caem devagar com o tempo de jogo; bem cuidadas,
 * dão humor bom (anda um pouco mais rápido). Nada castiga: energia no zero faz o avatar cochilar
 * e acordar em casa, sem perder nada. Descansar no banco e na cama: `sistemas/descanso.ts`.
 */
const QUEDA_POR_MINUTO = { fome: 2, energia: 1.2, diversao: 1 }

function limitar(v: number): number {
  return Math.max(0, Math.min(100, v))
}

export function passarTempo(n: Necessidades, segundos: number, correndo: boolean): Necessidades {
  const min = segundos / 60
  return {
    fome: limitar(n.fome - QUEDA_POR_MINUTO.fome * min),
    energia: limitar(n.energia - QUEDA_POR_MINUTO.energia * min * (correndo ? 2 : 1)),
    diversao: limitar(n.diversao - QUEDA_POR_MINUTO.diversao * min),
  }
}

/** Comer um item; `ilha` é onde a criança está (o chocolate quente rende mais no Pico). */
export function comer(n: Necessidades, item: Item, ilha?: string): Necessidades {
  if (!item.comida) return n
  const extra = item.naIlha && item.naIlha.ilha === ilha ? item.naIlha : null
  return {
    fome: limitar(n.fome + item.comida.fome),
    energia: limitar(n.energia + (item.comida.energia ?? 0) + (extra?.energia ?? 0)),
    diversao: limitar(n.diversao + (item.comida.diversao ?? 0) + (extra?.diversao ?? 0)),
  }
}

/** O que o Zappy diz ao comer (a fala da ilha quando o item rende mais nela). */
export function falaDeComer(item: Item, ilha?: string): string {
  if (item.naIlha && item.naIlha.ilha === ilha) return item.naIlha.fala
  return `Hum. ${item.nome} deu energia para continuar.`
}

/** Cuidar dá 10% de bônus. Necessidade baixa conserva o ritmo básico, sem tornar trajetos mais difíceis. */
export const RITMO = { otimo: 1.1, bem: 1, cansado: 1 } as const satisfies Record<Humor, number>

export function ritmo(n: Necessidades): number {
  return RITMO[humor(n)]
}

/** O humor ótimo na tela (A20): o selo da HUD, a explicação e a fala quando ele chega. */
export const HUMOR_OTIMO = {
  selo: 'Humor ótimo',
  explicacao:
    'Com fome, energia e diversão bem cuidadas, você anda um pouco mais rápido e a colheita pode vir com um a mais.',
  fala: 'Humor ótimo. Com fome, energia e diversão bem cuidadas, você anda um pouco mais rápido e a colheita pode vir com um a mais.',
  /** A fala não se repete antes disto (o humor pode oscilar na beira dos 60). */
  falaACadaMs: 10 * 60 * 1000,
} as const

/** O humor acabou de ficar ótimo e dá para falar de novo? (`antes` nulo: a primeira olhada.) */
export function deveFalarDoHumor(
  antes: boolean | null,
  agora: boolean,
  ultimaFalaMs: number | null,
  agoraMs: number,
): boolean {
  if (antes !== false || !agora) return false
  return ultimaFalaMs === null || agoraMs - ultimaFalaMs >= HUMOR_OTIMO.falaACadaMs
}
