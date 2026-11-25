import { isCampaignRedirectPath } from '@sistemazero/core/referrals'
import type { GatewayClient } from '../lib/gateway-client'

/**
 * Endereço antigo de campanha (25/11/2026): a campanha do Admin pode pedir que um caminho do
 * funil (ex.: `/kids/vilao-em-aliado`, o link antigo do guia dos pais) leve ao link dela até
 * uma data. O middleware consulta o referrals com cache curto; fora do prazo, sem campanha ou
 * com o referrals fora, a página abre normalmente.
 */

/** Parâmetros que dizem que a pessoa já veio de um link (presente, indicação, cupom): sem laço. */
const LINK_PARAMS = ['presente', 'indicacao', 'cupom', 'coupon'] as const
const CACHE_MS = 60_000
const MAX_ENTRIES = 2_000
/** A página não espera o referrals mais que isto. */
const TIMEOUT_MS = 1_500

const cache = new Map<string, { url: string | null; until: number }>()

/** O caminho candidato (sem a barra final), ou `null` se nunca pode ser endereço antigo. */
export function redirectCandidate(url: URL): string | null {
  if (LINK_PARAMS.some((key) => url.searchParams.has(key))) return null
  const path = url.pathname.length > 1 ? url.pathname.replace(/\/+$/, '') : url.pathname
  return isCampaignRedirectPath(path) ? path : null
}

function remember(path: string, url: string | null, now: number) {
  if (cache.size >= MAX_ENTRIES) {
    const oldest = cache.keys().next().value
    if (oldest !== undefined) cache.delete(oldest)
  }
  cache.set(path, { url, until: now + CACHE_MS })
}

/** Só aceita destino no próprio funil (`/i/...`), nunca um domínio de fora. */
function safeTarget(value: unknown, base: URL): string | null {
  if (typeof value !== 'string') return null
  try {
    const target = new URL(value, base)
    return target.pathname.startsWith('/i/') ? `${target.pathname}${target.search}` : null
  } catch {
    return null
  }
}

/**
 * O destino do endereço antigo (`/i/<código>` com a query da visita), ou `null` para abrir a
 * página. `now` é injetável para os testes.
 */
export async function campaignRedirectFor(
  url: URL,
  gateway: GatewayClient,
  now = Date.now(),
): Promise<string | null> {
  const path = redirectCandidate(url)
  if (!path) return null
  let entry = cache.get(path)
  if (!entry || entry.until <= now) {
    let target: string | null = null
    let timer: ReturnType<typeof setTimeout> | undefined
    try {
      const result = await Promise.race([
        gateway.resolveCampaignRedirect(path),
        new Promise<null>((resolve) => {
          timer = setTimeout(() => resolve(null), TIMEOUT_MS)
        }),
      ])
      if (result?.status === 200)
        target = safeTarget((result.body as { url?: unknown } | null)?.url, url)
    } catch {
      target = null
    } finally {
      clearTimeout(timer)
    }
    remember(path, target, now)
    entry = cache.get(path)
  }
  if (!entry?.url) return null
  const target = new URL(entry.url, url)
  for (const [key, value] of url.searchParams) target.searchParams.set(key, value)
  return `${target.pathname}${target.search}`
}

/** Hook de teste. */
export function clearCampaignRedirectCache(): void {
  cache.clear()
}
