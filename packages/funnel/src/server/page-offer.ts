import { FUNNEL_KEYS, type FunnelDef, getFunnelByKey } from '../funnels/registry'
import type { GatewayClient } from '../lib/gateway-client'
import { type CatalogOfferView, getActiveOffer } from './catalog'
import { checkOfferContract } from './offer-contract'

/**
 * A oferta de cada PÁGINA DE VENDA (25/11/2026): a oferta principal vem do CATÁLOGO (o produto da
 * página, `FunnelDef.productSku`, marca `primaryOfferId` no Admin), nunca de variável de ambiente.
 * `?oferta=<slug>` escolhe OUTRA oferta do mesmo produto, conferida no servidor (mesmo produto,
 * disponível, dentro do contrato da página). Sem oferta principal marcada, a página fica
 * indisponível (503 na rota), nunca o boot.
 */

type Log = (event: string, meta?: Record<string, unknown>) => void
type CatalogGateway = Pick<GatewayClient, 'getOffer' | 'getProduct'>

const SLUG = /^(?=.{1,80}$)[a-z0-9]+(?:-[a-z0-9]+)*$/
const TTL_MS = 60_000
const primaryCache = new Map<string, { slug: string | null; at: number }>()

/** O slug da oferta principal do produto (cache curto; falha transitória usa a cópia velha). */
export async function primaryOfferSlug(
  gateway: CatalogGateway,
  productSku: string,
  opts?: { now?: number; log?: Log },
): Promise<string | null> {
  const now = opts?.now ?? Date.now()
  const cached = primaryCache.get(productSku)
  if (cached && now - cached.at < TTL_MS) return cached.slug
  const { status, body } = await gateway.getProduct(productSku)
  if (status === 404) {
    primaryCache.set(productSku, { slug: null, at: now })
    return null
  }
  if (status !== 200) return cached?.slug ?? null
  const raw = (body as { primaryOfferSlug?: unknown } | null)?.primaryOfferSlug
  const slug = typeof raw === 'string' && SLUG.test(raw) ? raw : null
  if (!slug) opts?.log?.('page_offer.no_primary_offer', { productSku })
  primaryCache.set(productSku, { slug, at: now })
  return slug
}

/** Hook de teste. */
export function clearPrimaryOfferCache(): void {
  primaryCache.clear()
}

export interface PageOffer {
  /** A oferta que a página mostra e o checkout cobra. */
  slug: string
  offer: CatalogOfferView | null
  /** É a oferta principal do produto (sem `?oferta=` válido). */
  primary: boolean
  /** O slug da principal (o alternador mensal/anual parte dela). */
  primarySlug: string
}

/**
 * A oferta da página: a escolhida em `?oferta=` quando é do MESMO produto e passa no contrato da
 * página; a irmã do alternador da principal continua sendo a principal (o plano se escolhe no
 * checkout). Qualquer outra coisa cai na principal. `null` = produto sem oferta principal marcada.
 */
export async function resolvePageOffer(
  gateway: CatalogGateway,
  f: Pick<FunnelDef, 'productSku' | 'offerContract'>,
  requested?: string | null,
  opts?: { log?: Log },
): Promise<PageOffer | null> {
  const primarySlug = await primaryOfferSlug(gateway, f.productSku, opts)
  if (!primarySlug) return null
  const wanted = requested?.trim().toLowerCase() ?? ''
  if (wanted && wanted !== primarySlug && SLUG.test(wanted)) {
    const chosen = await getActiveOffer(gateway, wanted, { log: opts?.log })
    if (
      chosen &&
      chosen.productSku === f.productSku &&
      checkOfferContract(f.offerContract, chosen).ok
    ) {
      const principal = await getActiveOffer(gateway, primarySlug, { log: opts?.log })
      // A irmã do alternador fica com a principal (a página mostra os dois planos).
      if (principal?.altOffer?.slug !== wanted)
        return { slug: wanted, offer: chosen, primary: false, primarySlug }
    }
  }
  const offer = await getActiveOffer(gateway, primarySlug, { log: opts?.log })
  return { slug: primarySlug, offer, primary: true, primarySlug }
}

/**
 * Esta oferta pode ser cobrada no checkout desta página? A principal, a irmã do alternador dela,
 * ou outra oferta do mesmo produto dentro do contrato (anti-forja: um slug qualquer no corpo do
 * POST não cobra uma oferta que a página não vende).
 */
export async function isPageOffer(
  gateway: CatalogGateway,
  f: Pick<FunnelDef, 'productSku' | 'offerContract'>,
  slug: string,
  opts?: { log?: Log },
): Promise<boolean> {
  const primarySlug = await primaryOfferSlug(gateway, f.productSku, opts)
  if (!primarySlug) return false
  if (slug === primarySlug) return true
  const principal = await getActiveOffer(gateway, primarySlug, { log: opts?.log })
  if (principal?.altOffer?.slug === slug) return true
  const chosen = await getActiveOffer(gateway, slug, { log: opts?.log })
  return Boolean(
    chosen && chosen.productSku === f.productSku && checkOfferContract(f.offerContract, chosen).ok,
  )
}

/**
 * A página (funil) que vende esta oferta no público pedido: a do PRODUTO da oferta. `primary`
 * diz se é a principal (link sem `?oferta=`); a irmã do alternador e as outras ofertas do mesmo
 * produto vão com `?oferta=`. `null` = nenhuma página vende essa oferta.
 */
export async function pageForOffer(
  gateway: CatalogGateway,
  slug: string,
  audience: string,
  opts?: { log?: Log },
): Promise<{ funnel: FunnelDef; primary: boolean; alt: boolean } | null> {
  if (!SLUG.test(slug) || (audience !== 'kids' && audience !== 'adult')) return null
  const target = audience === 'adult' ? 'pro' : 'kids'
  const offer = await getActiveOffer(gateway, slug, { log: opts?.log })
  const funnels = FUNNEL_KEYS.map((key) => getFunnelByKey(key)).filter(
    (f): f is FunnelDef => Boolean(f) && f?.audience === target,
  )
  for (const funnel of funnels) {
    const primarySlug = await primaryOfferSlug(gateway, funnel.productSku, opts)
    if (!primarySlug) continue
    if (primarySlug === slug) return { funnel, primary: true, alt: false }
    // A irmã do alternador da principal (o anual da Comunidade), qualquer que seja o produto dela.
    const principal = await getActiveOffer(gateway, primarySlug, { log: opts?.log })
    if (principal?.altOffer?.slug === slug) return { funnel, primary: false, alt: true }
    if (
      offer &&
      funnel.productSku === offer.productSku &&
      checkOfferContract(funnel.offerContract, offer).ok
    )
      return { funnel, primary: false, alt: false }
  }
  return null
}
