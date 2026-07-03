import { createHmac, timingSafeEqual } from 'node:crypto'

// Helpers PUROS da rota S2S `POST /api/studio/cleanup` (limpeza de R2 na moderação).
// Vivem fora do route.ts (server-only) p/ serem testáveis em `bun test`.

/** Path EXATO que o hub assina e que verificamos (canônico `<MÉTODO>.<path>.<corpo>`). */
export const CLEANUP_PATH = '/api/studio/cleanup'
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
  const canonical = `POST.${CLEANUP_PATH}.${rawBody}`
  const expected = Buffer.from(
    createHmac('sha256', secret).update(`${ts}.${canonical}`).digest('hex'),
    'hex',
  )
  const received = Buffer.from(parts.v1, 'hex')
  return received.length === expected.length && timingSafeEqual(received, expected)
}

/**
 * Deriva a key R2 da capa a partir da URL pública. Só devolve keys sob `studio/cover/`
 * (defesa em profundidade — mesmo com HMAC válido, NUNCA apaga key arbitrária).
 */
export function coverKeyFromPublicUrl(
  publicBaseUrl: string | undefined,
  url: string,
): string | null {
  const base = publicBaseUrl?.replace(/\/+$/, '')
  if (!base) return null
  const prefix = `${base}/`
  if (!url.startsWith(prefix)) return null
  const key = url.slice(prefix.length)
  return key.startsWith('studio/cover/') ? key : null
}
