export type ReinoZeroLevelKind = 'superficie' | 'subterraneo' | 'agua' | 'castelo'

/** Largura autoral das fases 1-1 … 8-4, em tiles. */
export const REINO_ZERO_LEVEL_WIDTHS = [
  72, 74, 76, 73, 74, 76, 78, 75, 76, 78, 74, 77, 73, 77, 75, 78, 75, 78, 76, 77, 76, 78, 75, 77,
  77, 76, 78, 74, 78, 77, 76, 78,
] as const

/** Tipo autoral da fase: o estágio 2 alterna caverna/água e o 4 fecha em castelo. */
export function reinoZeroLevelKind(world: number, stage: number): ReinoZeroLevelKind {
  if (stage === 4) return 'castelo'
  if (stage === 2) return world === 2 || world === 7 ? 'agua' : 'subterraneo'
  return 'superficie'
}
