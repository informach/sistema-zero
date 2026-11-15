import { creatorCommunityAccessRef } from '@sistemazero/core/creations'
import { z } from 'zod'
import {
  GIFT_OFFER_STATUSES,
  type GiftOffer,
  type GiftOfferCatalog,
} from '../../domain/ports/gift-offer-catalog.port'

const MURAL_FULL_REFS = new Set(
  (['kids', 'adult'] as const).map((audience) =>
    creatorCommunityAccessRef('mural-dos-criadores', audience),
  ),
)

/** `GET /catalog/offers/:ref` (leitura pública: nome, status, público e política). */
const offerSchema = z.object({
  id: z.uuid(),
  slug: z.string().min(1),
  name: z.string().min(1),
  status: z.enum(GIFT_OFFER_STATUSES),
  accessMode: z.enum(['fixed', 'lifetime', 'billing_cycle']),
  accessDurationValue: z.number().int().positive().nullable(),
  accessDurationUnit: z.enum(['days', 'months']).nullable(),
  product: z.object({ audience: z.string() }).partial().optional(),
})

/** `GET /catalog/offers/:ref/entitlements` (S2S, token interno: o manifesto de entrega). */
const entitlementsSchema = z.object({
  offerId: z.uuid(),
  items: z.array(
    z.object({
      kind: z.string(),
      isPrimary: z.boolean(),
      fulfillment: z
        .object({ accessType: z.string(), courseRef: z.string().optional() })
        .nullable(),
    }),
  ),
})

const CACHE_TTL_MS = 30_000

/**
 * Cliente do Catálogo para a oferta do presente (15/11/2026). Fala DIRETO com o catálogo na
 * rede privada (`CATALOG_BASE_URL`), o mesmo caminho do members e do cupom de campanha: a
 * leitura pública da oferta (nome, status, público do produto principal, política de acesso)
 * e os entitlements com o `x-internal-token` (`CATALOG_INTERNAL_TOKEN`, o `INTERNAL_API_TOKEN`
 * do catálogo). Sem o token, o catálogo de produção recusa (401) e o presente fica
 * indisponível; em dev o catálogo sem token aceita. Cache curto (30 s) só de acertos: a
 * landing `/bolsa/<código>` lê o presente a cada visita.
 */
export class GiftOfferCatalogHttpClient implements GiftOfferCatalog {
  private readonly cache = new Map<string, { at: number; offer: GiftOffer }>()

  constructor(
    private readonly options: {
      baseUrl: string
      internalToken?: string
      timeoutMs: number
      fetchImpl?: typeof fetch
      now?: () => number
    },
  ) {}

  async resolve(offerRef: string): Promise<GiftOffer | null> {
    const key = offerRef.trim().toLowerCase()
    const now = (this.options.now ?? Date.now)()
    const cached = this.cache.get(key)
    if (cached && now - cached.at < CACHE_TTL_MS) return cached.offer

    const doFetch = this.options.fetchImpl ?? fetch
    const base = `${this.options.baseUrl.replace(/\/$/, '')}/catalog/offers/${encodeURIComponent(key)}`
    const [offerRes, entitlementsRes] = await Promise.all([
      doFetch(base, { signal: AbortSignal.timeout(this.options.timeoutMs) }),
      doFetch(`${base}/entitlements`, {
        headers: this.options.internalToken
          ? { 'x-internal-token': this.options.internalToken }
          : {},
        signal: AbortSignal.timeout(this.options.timeoutMs),
      }),
    ])
    if (offerRes.status === 404 || entitlementsRes.status === 404) return null
    if (!offerRes.ok || !entitlementsRes.ok)
      throw new Error(`catálogo respondeu ${offerRes.status}/${entitlementsRes.status}`)
    const view = offerSchema.parse(await offerRes.json())
    const resolved = entitlementsSchema.parse(await entitlementsRes.json())
    if (view.id !== resolved.offerId) throw new Error('O Catálogo retornou outra oferta.')

    const courses = resolved.items.filter(
      (item) => item.fulfillment?.accessType === 'course' && item.fulfillment.courseRef,
    )
    const primaryCourse = courses.find((item) => item.isPrimary) ?? courses[0]
    const audience = view.product?.audience
    const offer: GiftOffer = {
      offerId: view.id,
      offerSlug: view.slug,
      name: view.name,
      status: view.status,
      audience: audience === 'kids' || audience === 'adult' ? audience : null,
      accessMode: view.accessMode,
      accessDurationValue: view.accessDurationValue,
      accessDurationUnit: view.accessDurationUnit,
      courseSlug: primaryCourse?.fulfillment?.courseRef ?? null,
      includesMural: resolved.items.some(
        (item) =>
          item.fulfillment?.accessType === 'community' &&
          MURAL_FULL_REFS.has(item.fulfillment.courseRef ?? ''),
      ),
    }
    // Pela chave pedida e pelo UUID: a campanha guarda o UUID, o padrão é slug.
    this.cache.set(key, { at: now, offer })
    this.cache.set(offer.offerId, { at: now, offer })
    return offer
  }
}
