import { timingSafeEqual } from 'node:crypto'

/**
 * Comparação em tempo constante de strings (evita timing oracle em tokens de
 * webhook/métricas). A checagem de tamanho antes do `timingSafeEqual` é
 * inevitável (a API exige buffers do mesmo tamanho) e não vaza além do tamanho.
 */
export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ab.length !== bb.length) return false
  return timingSafeEqual(ab, bb)
}
