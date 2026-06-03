/**
 * Fonte de aleatoriedade injetável. O cálculo de ritmo (delay com jitter entre
 * mensagens de WhatsApp) NÃO usa `Math.random()` direto — recebe o RNG por aqui
 * para que os testes possam fixá-lo (jitter determinístico).
 */
export interface Rng {
  /** Float em [0, 1). */
  float(): number
  /** Inteiro uniformemente distribuído em [minInclusive, maxInclusive]. */
  intBetween(minInclusive: number, maxInclusive: number): number
}

/** RNG real (produção) baseado em `Math.random`. */
export const systemRng: Rng = {
  float: () => Math.random(),
  intBetween: (min, max) => {
    const lo = Math.ceil(min)
    const hi = Math.floor(max)
    if (hi <= lo) return lo
    return lo + Math.floor(Math.random() * (hi - lo + 1))
  },
}
