import { timingSafeEqual } from 'node:crypto'

/** Comparação de strings em tempo constante (evita timing attacks). */
export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ab.length !== bb.length) return false
  return timingSafeEqual(ab, bb)
}
