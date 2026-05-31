import { createHash } from 'node:crypto'

/** SHA-256 em hexadecimal. Usado para fingerprint do corpo de requisições idempotentes. */
export function sha256Hex(input: string): string {
  return createHash('sha256').update(input).digest('hex')
}
