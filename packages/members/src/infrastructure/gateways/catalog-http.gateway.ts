import {
  type AccessType,
  type FulfillmentSpec,
  isAccessType,
} from '../../domain/entitlement/fulfillment'
import type {
  CatalogGateway,
  ResolvedOffer,
  ResolvedOfferItem,
} from '../../domain/ports/catalog-gateway.port'

export interface CatalogHttpGatewayOptions {
  /** Base do catálogo (ex.: http://localhost:3003). Sem `/catalog`. */
  baseUrl: string
  /** Injetável em testes; default = fetch global. */
  fetchImpl?: typeof fetch
}

/**
 * Adapter HTTP do catálogo. Resolve `GET /catalog/offers/:slug/entitlements`
 * (rota pública de leitura) — chamada S2S direta na rede interna, fora do caminho
 * quente (só no grant). 404 → `null`; outros erros → lança (deixa o webhook retryável).
 */
export function createCatalogHttpGateway(opts: CatalogHttpGatewayOptions): CatalogGateway {
  const doFetch = opts.fetchImpl ?? fetch
  const base = opts.baseUrl.replace(/\/$/, '')

  return {
    async resolveOfferEntitlements(offerIdOrSlug: string): Promise<ResolvedOffer | null> {
      const url = `${base}/catalog/offers/${encodeURIComponent(offerIdOrSlug)}/entitlements`
      const res = await doFetch(url, { method: 'GET', headers: { accept: 'application/json' } })
      if (res.status === 404) return null
      if (!res.ok) {
        throw new Error(`catalog entitlements respondeu ${res.status} para ${offerIdOrSlug}`)
      }
      return parseResolvedOffer(await res.json())
    },
  }
}

function parseResolvedOffer(body: unknown): ResolvedOffer | null {
  if (!body || typeof body !== 'object') return null
  const b = body as Record<string, unknown>
  if (typeof b.offerId !== 'string' || typeof b.offerSlug !== 'string' || !Array.isArray(b.items)) {
    return null
  }
  const items: ResolvedOfferItem[] = []
  for (const raw of b.items) {
    if (!raw || typeof raw !== 'object') continue
    const it = raw as Record<string, unknown>
    if (
      typeof it.productId !== 'string' ||
      typeof it.sku !== 'string' ||
      typeof it.name !== 'string' ||
      typeof it.kind !== 'string'
    ) {
      continue
    }
    items.push({
      productId: it.productId,
      sku: it.sku,
      name: it.name,
      kind: it.kind,
      isPrimary: Boolean(it.isPrimary),
      fulfillment: parseFulfillment(it.fulfillment),
    })
  }
  return { offerId: b.offerId, offerSlug: b.offerSlug, items }
}

function parseFulfillment(value: unknown): FulfillmentSpec | null {
  if (!value || typeof value !== 'object') return null
  const f = value as Record<string, unknown>
  const accessType: AccessType = isAccessType(f.accessType) ? f.accessType : 'none'
  const spec: FulfillmentSpec = { accessType }
  if (typeof f.courseRef === 'string') spec.courseRef = f.courseRef
  if (Array.isArray(f.assets)) spec.assets = f.assets as FulfillmentSpec['assets']
  if (f.release && typeof f.release === 'object')
    spec.release = f.release as FulfillmentSpec['release']
  return spec
}
