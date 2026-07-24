import { createHmac, timingSafeEqual } from 'node:crypto'

/** Token determinístico para que qualquer réplica valide o portão dos pais. */
export function createParentGateTokenCodec(secret: string) {
  const key = Buffer.from(secret, 'utf8')

  function signatureFor(accountId: string): string {
    return createHmac('sha256', key).update(accountId).digest('hex')
  }

  function issue(accountId: string): string {
    return `${accountId}.${signatureFor(accountId)}`
  }

  function verify(value: string, accountId: string): boolean {
    const dot = value.lastIndexOf('.')
    if (dot <= 0 || value.slice(0, dot) !== accountId) return false
    const signature = Buffer.from(value.slice(dot + 1), 'hex')
    const expected = Buffer.from(signatureFor(accountId), 'hex')
    return signature.length === expected.length && timingSafeEqual(signature, expected)
  }

  return { issue, verify }
}
