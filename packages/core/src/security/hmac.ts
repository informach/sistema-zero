import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * Assina `"<timestamp>.<body>"` com HMAC-SHA256 e retorna o hex. O timestamp
 * dentro da mensagem assinada impede ataques de replay (a verificação rejeita
 * timestamps fora da tolerância).
 */
export function signHmac(secret: string, body: string, timestampSeconds: number): string {
  return createHmac('sha256', secret).update(`${timestampSeconds}.${body}`).digest('hex')
}

export interface HmacVerifyResult {
  valid: boolean
  reason?: 'malformed_header' | 'expired' | 'mismatch'
}

/**
 * Verifica um header no formato `t=<unix_ts>,v1=<hmac_hex>`.
 * - Rejeita timestamps fora de `toleranceSeconds` (anti-replay).
 * - Compara em tempo constante (`timingSafeEqual`) para evitar timing attacks.
 */
export function verifyHmacSignature(input: {
  secret: string
  body: string
  signatureHeader: string | undefined
  nowSeconds: number
  toleranceSeconds: number
}): HmacVerifyResult {
  if (!input.signatureHeader) return { valid: false, reason: 'malformed_header' }

  // Divide cada par só no PRIMEIRO `=` (preserva `=` dentro do valor — `split`
  // simples truncaria silenciosamente, ex.: um futuro v2 em base64 com padding).
  const parts = Object.fromEntries(
    input.signatureHeader.split(',').map((p) => {
      const item = p.trim()
      const eq = item.indexOf('=')
      if (eq === -1) return [item, '']
      return [item.slice(0, eq), item.slice(eq + 1)]
    }),
  ) as { t?: string; v1?: string }

  if (!parts.t || !parts.v1) return { valid: false, reason: 'malformed_header' }

  const ts = Number(parts.t)
  if (!Number.isFinite(ts)) return { valid: false, reason: 'malformed_header' }
  if (Math.abs(input.nowSeconds - ts) > input.toleranceSeconds) {
    return { valid: false, reason: 'expired' }
  }

  // `Buffer.from(x, 'hex')` não lança em hex inválido (ignora/truncа) — valide
  // o formato explicitamente para rejeitar cedo em vez de comparar lixo.
  if (parts.v1.length % 2 !== 0 || !/^[0-9a-f]+$/i.test(parts.v1)) {
    return { valid: false, reason: 'malformed_header' }
  }

  const expected = Buffer.from(signHmac(input.secret, input.body, ts), 'hex')
  const received = Buffer.from(parts.v1, 'hex')

  if (received.length !== expected.length || !timingSafeEqual(received, expected)) {
    return { valid: false, reason: 'mismatch' }
  }

  return { valid: true }
}
