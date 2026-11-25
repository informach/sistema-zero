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
type CatalogGateway = Pick<GatewayClient, 'getOffer' | 'getProductBySku'>

const SLUG = /^(?=.{1,80}$)[a-z0-9]+(?:-[a-z0-9]+)*$/
const TTL_MS = 60_000
const primaryCache = new Map<string, { slug: string | null; at: number }>()

/**
 * A oferta principal do produto: `ok` (o slug), `none` (produto sem principal marcada, ou sem o
 * produto) ou `unavailable` (catálogo/gateway fora e sem cópia em cache). Cache curto; falha
 * transitória usa a cópia velha. Quem responde ao visitante distingue os dois últimos: "sem
 * página" é 404, "fora do ar" é "tente de novo".
 */
export type PrimaryOfferLookup =
  | { kind: 'ok'; slug: string }
  | { kind: 'none' }
  | { kind: 'unavailable' }

export async function primaryOfferLookup(
  gateway: CatalogGateway,
  productSku: string,
  opts?: { now?: number; log?: Log },
): Promise<PrimaryOfferLookup> {
  const now = opts?.now ?? Date.now()
  const cached = primaryCache.get(productSku)
  const fromCache = (slug: string | null): PrimaryOfferLookup =>
    slug ? { kind: 'ok', slug } : { kind: 'none' }
  if (cached && now - cached.at < TTL_MS) return fromCache(cached.slug)
  const { status, body } = await gateway.getProductBySku(productSku)
  if (status === 404) {
    opts?.log?.('page_offer.no_primary_offer', { productSku, reason: 'product_not_found' })
    primaryCache.set(productSku, { slug: null, at: now })
    return { kind: 'none' }
  }
  if (status !== 200) {
    if (cached) return fromCache(cached.slug)
    opts?.log?.('page_offer.catalog_unavailable', { productSku, status })
    return { kind: 'unavailable' }
  }
  const raw = (body as { primaryOfferSlug?: unknown } | null)?.primaryOfferSlug
  const slug = typeof raw === 'string' && SLUG.test(raw) ? raw : null
  if (!slug) opts?.log?.('page_offer.no_primary_offer', { productSku })
  primaryCache.set(productSku, { slug, at: now })
  return fromCache(slug)
}

/** O slug da oferta principal do produto, ou null (sem principal ou catálogo fora). */
export async function primaryOfferSlug(
  gateway: CatalogGateway,
  productSku: string,
  opts?: { now?: number; log?: Log },
): Promise<string | null> {
  const lookup = await primaryOfferLookup(gateway, productSku, opts)
  return lookup.kind === 'ok' ? lookup.slug : null
}

/** O catálogo não respondeu: o visitante recebe "tente de novo", nunca "não existe". */
export class PageOfferUnavailableError extends Error {
  constructor() {
    super('O catálogo não respondeu ao resolver a página da oferta.')
    this.name = 'PageOfferUnavailableError'
  }
}

/** Oferta do mesmo produto, marcada para venda na página (`pageSellable`) e dentro do contrato. */
function sellableOnPage(
  offer: CatalogOfferView | null,
  f: Pick<FunnelDef, 'productSku' | 'offerContract'>,
): boolean {
  return Boolean(
    offer &&
      offer.productSku === f.productSku &&
      offer.pageSellable &&
      checkOfferContract(f.offerContract, offer).ok,
  )
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
    // Só oferta MARCADA para a página (`pageSellable`): oferta de presente nunca abre à venda.
    if (chosen && sellableOnPage(chosen, f)) {
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
 * ou outra oferta do mesmo produto MARCADA para a página (`pageSellable`) e dentro do contrato
 * (anti-forja: um slug qualquer no corpo do POST não cobra uma oferta que a página não vende, e a
 * oferta de presente nunca é cobrada).
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
  return sellableOnPage(await getActiveOffer(gateway, slug, { log: opts?.log }), f)
}

/**
 * A página (funil) que vende esta oferta no público pedido: a do PRODUTO da oferta. `primary`
 * diz se é a principal (link sem `?oferta=`); a irmã do alternador e as outras ofertas do mesmo
 * produto marcadas para a página vão com `?oferta=`. `null` = nenhuma página vende essa oferta;
 * LANÇA `PageOfferUnavailableError` quando o catálogo não respondeu e nada foi achado.
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
  let unavailable = false
  for (const funnel of funnels) {
    const lookup = await primaryOfferLookup(gateway, funnel.productSku, opts)
    if (lookup.kind === 'unavailable') unavailable = true
    if (lookup.kind !== 'ok') continue
    const primarySlug = lookup.slug
    if (primarySlug === slug) return { funnel, primary: true, alt: false }
    // A irmã do alternador da principal (o anual da Comunidade), qualquer que seja o produto dela.
    const principal = await getActiveOffer(gateway, primarySlug, { log: opts?.log })
    if (principal?.altOffer?.slug === slug) return { funnel, primary: false, alt: true }
    if (sellableOnPage(offer, funnel)) return { funnel, primary: false, alt: false }
  }
  // Nenhuma página encontrada COM o catálogo fora em alguma delas: não dá para afirmar que não
  // existe página (quem chama responde "tente de novo").
  if (unavailable) throw new PageOfferUnavailableError()
  return null
}
