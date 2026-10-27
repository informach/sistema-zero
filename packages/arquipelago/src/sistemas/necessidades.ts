import type { Salvamento } from '@sistemazero/arquipelago-contracts'
import type { Item } from './itens'

export type Necessidades = Salvamento['necessidades']

/**
 * Fome, energia e diversão (100 = tudo bem). Caem devagar com o tempo de jogo; bem cuidadas,
 * dão humor bom (anda um pouco mais rápido). Nada castiga: energia no zero faz o avatar cochilar
 * e acordar em casa, sem perder nada.
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

export function comer(n: Necessidades, item: Item): Necessidades {
  if (!item.comida) return n
  return {
    fome: limitar(n.fome + item.comida.fome),
    energia: limitar(n.energia + (item.comida.energia ?? 0)),
    diversao: limitar(n.diversao + (item.comida.diversao ?? 0)),
  }
}

/** Dormir (na cama ou no cochilo) recupera a energia toda. */
export function dormir(n: Necessidades): Necessidades {
  return { ...n, energia: 100 }
}

export type Humor = 'otimo' | 'bem' | 'cansado'

export function humor(n: Necessidades): Humor {
  if (n.energia < 15 || n.fome < 15) return 'cansado'
  if (n.fome > 60 && n.energia > 60 && n.diversao > 60) return 'otimo'
  return 'bem'
}

/** Multiplicador da velocidade pelo humor. */
export function ritmo(n: Necessidades): number {
  const h = humor(n)
  return h === 'otimo' ? 1.1 : h === 'cansado' ? 0.8 : 1
}
