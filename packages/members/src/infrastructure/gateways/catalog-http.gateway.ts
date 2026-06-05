import type { Logger } from '@sistemazero/core/logging'
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
  /** Timeout por chamada (ms). Sem ele, um catálogo travado pendura o webhook. */
  timeoutMs?: number
  /** Injetável em testes; default = fetch global. */
  fetchImpl?: typeof fetch
  /** Para aflorar drift de contrato (itens descartados no parse). */
  logger?: Logger
}

const DEFAULT_TIMEOUT_MS = 10_000

/**
 * Adapter HTTP do catálogo. Resolve `GET /catalog/offers/:slug/entitlements`
 * (rota pública de leitura) — chamada S2S direta na rede interna, fora do caminho
 * quente (só no grant). 404 → `null`; outros erros (incluindo timeout) → lança
 * (deixa o webhook retryável). Itens com shape inválido são DESCARTADOS com log
 * de warning — o chamador decide o que fazer com uma oferta sem itens.
 */
export function createCatalogHttpGateway(opts: CatalogHttpGatewayOptions): CatalogGateway {
  const doFetch = opts.fetchImpl ?? fetch
  const base = opts.baseUrl.replace(/\/$/, '')
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS

  return {
    async resolveOfferEntitlements(offerIdOrSlug: string): Promise<ResolvedOffer | null> {
      const url = `${base}/catalog/offers/${encodeURIComponent(offerIdOrSlug)}/entitlements`
      const res = await doFetch(url, {
        method: 'GET',
        headers: { accept: 'application/json' },
        signal: AbortSignal.timeout(timeoutMs),
      })
      if (res.status === 404) return null
      if (!res.ok) {
        throw new Error(`catalog entitlements respondeu ${res.status} para ${offerIdOrSlug}`)
      }
      const offer = parseResolvedOffer(await res.json(), offerIdOrSlug, opts.logger)
      if (!offer) {
        // Corpo 200 com shape irreconhecível = drift de contrato — loga e trata
        // como oferta não resolvida (o webhook devolve 502 e a entrega re-tenta).
        opts.logger?.error('catalog.offer_unparseable', { offerRef: offerIdOrSlug })
      }
      return offer
    },
  }
}

function parseResolvedOffer(
  body: unknown,
  offerRef: string,
  logger?: Logger,
): ResolvedOffer | null {
  if (!body || typeof body !== 'object') return null
  const b = body as Record<string, unknown>
  if (typeof b.offerId !== 'string' || typeof b.offerSlug !== 'string' || !Array.isArray(b.items)) {
    return null
  }
  const items: ResolvedOfferItem[] = []
  for (const raw of b.items) {
    const it = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : null
    if (
      !it ||
      typeof it.productId !== 'string' ||
      typeof it.sku !== 'string' ||
      typeof it.name !== 'string' ||
      typeof it.kind !== 'string'
    ) {
      // Item malformado NÃO é silencioso: um drift de contrato no catálogo
      // viraria "comprador sem acesso" sem nenhum alarme.
      logger?.warn('catalog.offer_item_discarded', {
        offerRef,
        productId: it && typeof it.productId === 'string' ? it.productId : null,
      })
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
