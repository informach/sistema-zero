import { randomInt, timingSafeEqual } from 'node:crypto'
import { sha256Hex } from '@sistemazero/core/security'

/** Código OTP de 6 dígitos (000000–999999), aleatório criptográfico. */
export function generateOtpCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, '0')
}

/** Compara o código informado com o hash guardado em tempo constante. */
export function codeMatchesHash(code: string, codeHash: string): boolean {
  const a = Buffer.from(sha256Hex(code), 'hex')
  const b = Buffer.from(codeHash, 'hex')
  return a.length === b.length && timingSafeEqual(a, b)
}
