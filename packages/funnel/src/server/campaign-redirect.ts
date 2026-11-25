import { isCampaignRedirectPath } from '@sistemazero/core/referrals'
import type { GatewayClient } from '../lib/gateway-client'

/**
 * Endereço antigo de campanha (25/11/2026): a campanha do Admin pode pedir que um caminho do
 * funil (ex.: `/kids/vilao-em-aliado`, o link antigo do guia dos pais) leve ao link dela até
 * uma data. O funil guarda a LISTA dos endereços ativos (uma chamada ao referrals por minuto e
 * por instância, qualquer que seja o tráfego) e confere cada visita localmente. Sem lista, com o
 * referrals fora ou fora do prazo, a página abre normalmente.
 */

/** Parâmetros que dizem que a pessoa já veio de um link (presente, indicação, cupom): sem laço. */
const LINK_PARAMS = ['presente', 'indicacao', 'cupom', 'coupon'] as const
/** O botão da plataforma não passa adiante: o link da campanha é a origem. */
const DROPPED_PARAMS = new Set(['lugar'])

export interface CampaignRedirectsDeps {
  gateway: Pick<GatewayClient, 'resolveCampaignRedirects'>
  now: () => number
  /** Validade da lista (60 s). */
  ttlMs?: number
  /** A primeira visita não espera a lista mais que isto (1,5 s). */
  timeoutMs?: number
  log?: (event: string, meta?: Record<string, unknown>) => void
}

export interface CampaignRedirects {
  /** O destino (`/i/<código>` com a query da visita), ou `null` para abrir a página. */
  lookup(url: URL): Promise<string | null>
}

/** O caminho candidato (sem a barra final), ou `null` se nunca pode ser endereço antigo. */
export function redirectCandidate(url: URL): string | null {
  if (LINK_PARAMS.some((key) => url.searchParams.has(key))) return null
  const path = url.pathname.length > 1 ? url.pathname.replace(/\/+$/, '') : url.pathname
  return isCampaignRedirectPath(path) ? path : null
}

/** Só aceita destino no próprio funil (`/i/...`), nunca um domínio de fora. */
function safeTarget(value: unknown): string | null {
  if (typeof value !== 'string') return null
  try {
    const target = new URL(value, 'https://funil.local')
    return target.pathname.startsWith('/i/') ? `${target.pathname}${target.search}` : null
  } catch {
    return null
  }
}

function parseList(body: unknown): Map<string, string> {
  const map = new Map<string, string>()
  const items = (body as { items?: unknown } | null)?.items
  if (!Array.isArray(items)) return map
  for (const item of items) {
    const raw = item as { path?: unknown; url?: unknown }
    const target = safeTarget(raw.url)
    if (isCampaignRedirectPath(raw.path) && target) map.set(raw.path, target)
  }
  return map
}

export function createCampaignRedirects(deps: CampaignRedirectsDeps): CampaignRedirects {
  const ttlMs = deps.ttlMs ?? 60_000
  const timeoutMs = deps.timeoutMs ?? 1_500
  let list: Map<string, string> | null = null
  let fetchedAt = 0
  let inflight: Promise<void> | null = null

  function refresh(): Promise<void> {
    inflight ??= (async () => {
      try {
        const { status, body } = await deps.gateway.resolveCampaignRedirects()
        if (status === 200) list = parseList(body)
        else {
          deps.log?.('campaign_redirects.refresh_failed', { status })
          list ??= new Map()
        }
      } catch (error) {
        deps.log?.('campaign_redirects.refresh_failed', { message: String(error) })
        list ??= new Map()
      } finally {
        // Falha também espera o próximo ciclo: o referrals fora não vira uma chamada por visita.
        fetchedAt = deps.now()
        inflight = null
      }
    })()
    return inflight
  }

  return {
    async lookup(url) {
      const path = redirectCandidate(url)
      if (!path) return null
      if (list === null) {
        // Primeira visita da instância: espera a lista, com teto.
        let timer: ReturnType<typeof setTimeout> | undefined
        await Promise.race([
          refresh(),
          new Promise<void>((resolve) => {
            timer = setTimeout(resolve, timeoutMs)
          }),
        ])
        clearTimeout(timer)
      } else if (deps.now() - fetchedAt >= ttlMs) {
        // Lista velha: renova em segundo plano e responde com a que tem.
        void refresh()
      }
      const found = list?.get(path)
      if (!found) return null
      const target = new URL(found, url)
      for (const [key, value] of url.searchParams)
        if (!DROPPED_PARAMS.has(key)) target.searchParams.set(key, value)
      return `${target.pathname}${target.search}`
    },
  }
}
