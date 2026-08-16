import { createHmac, timingSafeEqual } from 'node:crypto'

const TOKEN_VERSION = 'v1'
export const PARENT_GATE_TTL_SECONDS = 15 * 60
const DEFAULT_CLOCK_SKEW_MS = 5_000

type ParentGatePayload = {
  accountId: string
  issuedAt: number
  expiresAt: number
}

type ParentGateTokenOptions = {
  now?: () => number
  ttlMs?: number
  clockSkewMs?: number
}

function isPayload(value: unknown): value is ParentGatePayload {
  if (!value || typeof value !== 'object') return false
  const payload = value as Partial<ParentGatePayload>
  return (
    typeof payload.accountId === 'string' &&
    Number.isSafeInteger(payload.issuedAt) &&
    Number.isSafeInteger(payload.expiresAt)
  )
}

/** Token versionado, assinado e com expiração verificável por qualquer réplica. */
export function createParentGateTokenCodec(secret: string, options: ParentGateTokenOptions = {}) {
  const key = Buffer.from(secret, 'utf8')
  const now = options.now ?? Date.now
  const ttlMs = options.ttlMs ?? PARENT_GATE_TTL_SECONDS * 1_000
  const clockSkewMs = options.clockSkewMs ?? DEFAULT_CLOCK_SKEW_MS

  function signatureFor(data: string): Buffer {
    return createHmac('sha256', key).update(data).digest()
  }

  function issue(accountId: string): string {
    const issuedAt = Math.trunc(now())
    const payload: ParentGatePayload = { accountId, issuedAt, expiresAt: issuedAt + ttlMs }
    const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')
    const data = `${TOKEN_VERSION}.${encoded}`
    return `${data}.${signatureFor(data).toString('hex')}`
  }

  function verify(value: string, accountId: string): boolean {
    const [version, encoded, signatureHex, extra] = value.split('.')
    if (
      version !== TOKEN_VERSION ||
      !encoded ||
      !signatureHex ||
      extra !== undefined ||
      !/^[0-9a-f]{64}$/i.test(signatureHex)
    ) {
      return false
    }

    const data = `${version}.${encoded}`
    const signature = Buffer.from(signatureHex, 'hex')
    const expected = signatureFor(data)
    if (signature.length !== expected.length || !timingSafeEqual(signature, expected)) return false

    try {
      const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as unknown
      if (!isPayload(payload) || payload.accountId !== accountId) return false

      const currentTime = Math.trunc(now())
      const lifetime = payload.expiresAt - payload.issuedAt
      return (
        lifetime > 0 &&
        lifetime <= ttlMs &&
        payload.issuedAt <= currentTime + clockSkewMs &&
        payload.expiresAt > currentTime
      )
    } catch {
      return false
    }
  }

  return { issue, verify }
}
