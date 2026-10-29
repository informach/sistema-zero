import type { Canteiro, Semente } from './salvamento'

/**
 * A horta cresce no tempo de verdade, e só depois de regada. Nesta fase os tempos são curtos
 * para dar para ver crescer numa sessão; os tempos definitivos entram com o equilíbrio do jogo.
 */
export const CRESCIMENTO_MS: Record<Semente, number> = {
  alface: 3 * 60 * 1000,
  tomate: 5 * 60 * 1000,
  milho: 8 * 60 * 1000,
}

export const COLHEITA: Record<Semente, number> = { alface: 2, tomate: 3, milho: 2 }

export type Estagio = 'vazio' | 'semente' | 'brotando' | 'crescendo' | 'maduro'

export function progresso(c: Canteiro, agoraMs: number): number {
  if (!c.semente || !c.regadoEm) return 0
  const decorrido = agoraMs - Date.parse(c.regadoEm)
  return Math.max(0, Math.min(1, decorrido / CRESCIMENTO_MS[c.semente]))
}

export function estagio(c: Canteiro, agoraMs: number): Estagio {
  if (!c.semente) return 'vazio'
  const p = progresso(c, agoraMs)
  if (p >= 1) return 'maduro'
  if (!c.regadoEm) return 'semente'
  return p < 0.4 ? 'brotando' : 'crescendo'
}

export function plantar(c: Canteiro, semente: Semente, agora: Date): Canteiro | null {
  if (c.semente) return null
  return { ...c, semente, plantadoEm: agora.toISOString(), regadoEm: null }
}

export function regar(c: Canteiro, agora: Date): Canteiro | null {
  if (!c.semente || c.regadoEm) return null
  return { ...c, regadoEm: agora.toISOString() }
}

export function colher(
  c: Canteiro,
  agoraMs: number,
): { canteiro: Canteiro; item: Semente; qtd: number } | null {
  if (!c.semente || estagio(c, agoraMs) !== 'maduro') return null
  return {
    canteiro: { ...c, semente: null, plantadoEm: null, regadoEm: null },
    item: c.semente,
    qtd: COLHEITA[c.semente],
  }
}
