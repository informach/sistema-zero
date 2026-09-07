import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'
import type {
  RankingCursorCodec,
  RankingCursorPayload,
} from '../../domain/ports/ranking-cursor.port'

const IV_BYTES = 12
const TAG_BYTES = 16
const AAD = Buffer.from('members:ranking-cursor:v2')

interface EncodedRankingCursor {
  v: 2
  a: 'adult' | 'kids'
  p: string
  s: string
  x: number
  u: string
}

function validPayload(value: unknown): value is EncodedRankingCursor {
  if (!value || typeof value !== 'object') return false
  const payload = value as Partial<EncodedRankingCursor>
  return (
    payload.v === 2 &&
    (payload.a === 'adult' || payload.a === 'kids') &&
    typeof payload.p === 'string' &&
    payload.p.length > 0 &&
    typeof payload.u === 'string' &&
    payload.u.length > 0 &&
    typeof payload.s === 'string' &&
    /^\d+:\d+:(?:\d+(?:,\d+)*)?$/.test(payload.s) &&
    Number.isSafeInteger(payload.x) &&
    (payload.x ?? 0) > 0
  )
}

/** AES-GCM autenticado e stateless; SHA-256 separa a chave do segredo compartilhado. */
export class EncryptedRankingCursorCodec implements RankingCursorCodec {
  private readonly key: Buffer

  constructor(secret: string) {
    this.key = createHash('sha256').update('ranking-cursor\0').update(secret).digest()
  }

  encode(payload: RankingCursorPayload): string {
    const compact: EncodedRankingCursor = {
      v: 2,
      a: payload.audience,
      p: payload.viewerUserId,
      s: payload.snapshot,
      x: payload.xp,
      u: payload.userId,
    }
    const iv = randomBytes(IV_BYTES)
    const cipher = createCipheriv('aes-256-gcm', this.key, iv)
    cipher.setAAD(AAD)
    const ciphertext = Buffer.concat([
      cipher.update(JSON.stringify(compact), 'utf8'),
      cipher.final(),
    ])
    return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString('base64url')
  }

  decode(token: string): RankingCursorPayload | null {
    try {
      const packed = Buffer.from(token, 'base64url')
      if (packed.length <= IV_BYTES + TAG_BYTES) return null
      const iv = packed.subarray(0, IV_BYTES)
      const tag = packed.subarray(IV_BYTES, IV_BYTES + TAG_BYTES)
      const ciphertext = packed.subarray(IV_BYTES + TAG_BYTES)
      const decipher = createDecipheriv('aes-256-gcm', this.key, iv)
      decipher.setAAD(AAD)
      decipher.setAuthTag(tag)
      const decoded = JSON.parse(
        Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8'),
      ) as unknown
      if (!validPayload(decoded)) return null
      return {
        audience: decoded.a,
        viewerUserId: decoded.p,
        snapshot: decoded.s,
        xp: decoded.x,
        userId: decoded.u,
      }
    } catch {
      return null
    }
  }
}
