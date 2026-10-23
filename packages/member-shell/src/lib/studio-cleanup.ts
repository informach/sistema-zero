import { createHmac, timingSafeEqual } from 'node:crypto'
import { canonicalHmacMessage, verifyHmacSignature } from '@sistemazero/core/security'

// Helpers PUROS da rota S2S `POST /api/studio/cleanup` (limpeza de R2 na moderação).
// Vivem fora do route.ts (server-only) p/ serem testáveis em `bun test`.

/** Path EXATO que o hub assina e que verificamos (canônico `<MÉTODO>.<path>.<corpo>`). */
export const CLEANUP_PATH = '/api/studio/cleanup'
export const RESERVATION_CLEANUP_PATH = '/api/studio/reservation-cleanup'
export const CLEANUP_HMAC_TOLERANCE_SECONDS = 300

/**
 * Verifica o HMAC da chamada S2S do hub (header `t=<ts>,v1=<hex>`, mesmo canônico
 * `<MÉTODO>.<path>.<corpo>` que o hub assina com o `GATEWAY_HMAC_SECRET`).
 * Reimplementado com `node:crypto` porque o member-shell NÃO depende do
 * `@sistemazero/core` — manter em sincronia com `core/security/hmac.ts`.
 */
export function verifyCleanupSignature(
  secret: string,
  rawBody: string,
  header: string | null | undefined,
  nowSeconds: number = Math.floor(Date.now() / 1000),
): boolean {
  return verifySignatureAt(CLEANUP_PATH, secret, rawBody, header, nowSeconds)
}

export function verifyReservationCleanupSignature(
  secret: string,
  rawBody: string,
  header: string | null | undefined,
  deliveryId: string | null | undefined,
  nowSeconds: number = Math.floor(Date.now() / 1000),
): boolean {
  if (!deliveryId || !/^studio-reservation-cleanup:[a-f0-9-]{36}$/.test(deliveryId)) return false
  return verifyHmacSignature({
    secret,
    body: canonicalHmacMessage({
      method: 'POST',
      path: RESERVATION_CLEANUP_PATH,
      deliveryId,
      body: rawBody,
    }),
    signatureHeader: header ?? undefined,
    nowSeconds,
    toleranceSeconds: CLEANUP_HMAC_TOLERANCE_SECONDS,
  }).valid
}

function verifySignatureAt(
  path: typeof CLEANUP_PATH | typeof RESERVATION_CLEANUP_PATH,
  secret: string,
  rawBody: string,
  header: string | null | undefined,
  nowSeconds: number,
): boolean {
  if (!header) return false
  const parts = Object.fromEntries(
    header.split(',').map((p) => {
      const item = p.trim()
      const eq = item.indexOf('=')
      return eq === -1 ? [item, ''] : [item.slice(0, eq), item.slice(eq + 1)]
    }),
  ) as { t?: string; v1?: string }
  if (!parts.t || !parts.v1) return false
  const ts = Number(parts.t)
  if (!Number.isFinite(ts)) return false
  if (Math.abs(nowSeconds - ts) > CLEANUP_HMAC_TOLERANCE_SECONDS) return false
  // `Buffer.from(x,'hex')` não lança em hex inválido — valide o formato antes.
  if (parts.v1.length % 2 !== 0 || !/^[0-9a-f]+$/i.test(parts.v1)) return false
  const canonical = `POST.${path}.${rawBody}`
  const expected = Buffer.from(
    createHmac('sha256', secret).update(`${ts}.${canonical}`).digest('hex'),
    'hex',
  )
  const received = Buffer.from(parts.v1, 'hex')
  return received.length === expected.length && timingSafeEqual(received, expected)
}
