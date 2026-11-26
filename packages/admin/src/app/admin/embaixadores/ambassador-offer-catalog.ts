'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useCommunityRequests } from '@/components/admin/community-page'
import { isCanceledCommunityRequest } from '@/lib/community-query'
import { formatCents } from '@/lib/format'
import { loadAllPages } from '@/lib/load-all-pages'
import type { Platform } from '@/lib/platform'
import type { CourseView, OfferListItem, Paginated, ProductView } from '@/lib/types'
import { toGiftOfferOptions } from './campaign-gift-offer'

/**
 * O que o Admin precisa saber de cada oferta para as listas dos embaixadores e para a campanha de
 * venda (25/11/2026): se serve de presente (a régua do `giftOfferProblem` do referrals), se tem
 * página de venda (a principal do produto ou marcada `pageSellable`, a régua do funil), e se é
 * curso para os pais (o `learner` do curso que o produto entrega).
 */
export interface CatalogOfferInfo {
  id: string
  slug: string
  name: string
  status: string
  productId: string
  productName: string | null
  /** O SKU do produto: o referrals deixa uma oferta ligada por produto em cada lista. */
  productSku: string | null
  pricingMode: OfferListItem['pricingMode']
  priceCents: number
  /** "Pagamento único R$ 67,00 · 30 dias" / "Assinatura mensal R$ 97,00". */
  summary: string
  giftEligible: boolean
  /** Tem página de venda: o funil abre e cobra esta oferta. */
  pageEligible: boolean
  forParents: boolean
}

/** A oferta padrão dos links antigos de embaixador (`DEFAULT_GIFT_OFFER_SLUGS` do referrals). */
export const DEFAULT_GIFT_OFFER_SLUGS: Record<Platform, string> = {
  kids: 'cade-todo-mundo-7-dias',
  adult: 'cade-todo-mundo-adulto-7-dias',
}

function accessText(offer: OfferListItem): string {
  if (offer.pricingMode === 'subscription') {
    const months = offer.billingIntervalMonths
    return months === 12
      ? 'anual'
      : months === 1
        ? 'mensal'
        : months
          ? `a cada ${months} meses`
          : ''
  }
  if (offer.accessMode === 'lifetime') return 'sem prazo'
  const n = offer.accessDurationValue
  if (!n) return ''
  if (offer.accessDurationUnit === 'months') return n === 12 ? '1 ano' : `${n} meses`
  return `${n} ${n === 1 ? 'dia' : 'dias'}`
}

export function offerSummary(offer: OfferListItem): string {
  const access = accessText(offer)
  if (offer.pricingMode === 'subscription')
    return `Assinatura${access ? ` ${access}` : ''} ${formatCents(offer.priceCents)}`
  const price =
    offer.priceCents === 0 ? 'Sem custo' : `Pagamento único ${formatCents(offer.priceCents)}`
  return `${price}${access ? ` · ${access}` : ''}`
}

/** A régua pura (testada): junta ofertas, produtos e cursos. */
export function buildCatalogOffers(
  offers: OfferListItem[],
  products: ProductView[],
  courses: CourseView[],
): CatalogOfferInfo[] {
  const productById = new Map(products.map((p) => [p.id, p]))
  const parentsCourses = new Set(courses.filter((c) => c.learner === 'parents').map((c) => c.slug))
  const giftIds = new Set(toGiftOfferOptions(offers, new Set()).map((o) => o.id))
  return offers.map((offer) => {
    const product = productById.get(offer.productId)
    const usable = offer.status !== 'archived' && offer.status !== 'draft'
    const courseRef =
      product?.fulfillment?.accessType === 'course' ? product.fulfillment.courseRef : undefined
    return {
      id: offer.id,
      slug: offer.slug,
      name: offer.name,
      status: offer.status,
      productId: offer.productId,
      productName: offer.productName,
      productSku: product?.sku ?? null,
      pricingMode: offer.pricingMode,
      priceCents: offer.priceCents,
      summary: offerSummary(offer),
      giftEligible: usable && offer.pricingMode === 'one_time' && giftIds.has(offer.id),
      // A MESMA régua do member-shell (`pageSellableStatus`) e do funil: oferta ativa E
      // disponível agora (esgotada ou fora da janela de venda não abre a página).
      pageEligible:
        offer.status === 'active' &&
        offer.isAvailable !== false &&
        product?.status === 'active' &&
        (product.primaryOfferId === offer.id || offer.content?.pageSellable === true),
      forParents: courseRef ? parentsCourses.has(courseRef) : false,
    }
  })
}

export interface CatalogOffersState {
  status: 'loading' | 'ready' | 'error'
  offers: CatalogOfferInfo[]
  byId: ReadonlyMap<string, CatalogOfferInfo>
  reload: () => void
}

/** Ofertas, produtos e cursos da comunidade (todas as páginas), para as listas e a venda. */
export function useCatalogOffers(audience: Platform): CatalogOffersState {
  const { get } = useCommunityRequests(audience)
  const [status, setStatus] = useState<CatalogOffersState['status']>('loading')
  const [offers, setOffers] = useState<CatalogOfferInfo[]>([])
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let alive = true
    setStatus('loading')
    void attempt
    const page =
      <T>(path: string) =>
      (offset: number, limit: number) =>
        get<Paginated<T>>(
          `${path}?${new URLSearchParams({ limit: String(limit), offset: String(offset) })}`,
        )
    Promise.all([
      loadAllPages(page<OfferListItem>('/api/catalog/offers')),
      loadAllPages(page<ProductView>('/api/catalog/products')),
      // Os cursos só dizem quem é para os pais: sem eles, nada vira "Para os pais".
      loadAllPages(page<CourseView>('/api/members/courses')).catch(() => [] as CourseView[]),
    ])
      .then(([o, p, c]) => {
        if (!alive) return
        setOffers(buildCatalogOffers(o, p, c))
        setStatus('ready')
      })
      .catch((err) => {
        if (!alive || isCanceledCommunityRequest(err)) return
        setStatus('error')
      })
    return () => {
      alive = false
    }
  }, [get, attempt])
  const reload = useCallback(() => setAttempt((n) => n + 1), [])
  const byId = useMemo(() => new Map(offers.map((o) => [o.id, o])), [offers])
  return { status, offers, byId, reload }
}

/** Um grupo do filtro "Todas as ofertas" da Origem das vendas: as ofertas de um produto. */
export interface OriginOfferGroup {
  key: string
  label: string
  offerIds: string[]
}

/**
 * Os grupos do filtro (Canvas "admin-origem"): um por produto que não é curso para pais e um só
 * "Cursos para pais" juntando os deles. O referrals aceita até 20 ofertas por filtro.
 */
export function originOfferGroups(offers: readonly CatalogOfferInfo[]): OriginOfferGroup[] {
  const byProduct = new Map<string, OriginOfferGroup>()
  const parents: string[] = []
  for (const offer of offers) {
    if (offer.forParents) {
      parents.push(offer.id)
      continue
    }
    const key = `produto:${offer.productId}`
    const group = byProduct.get(key) ?? {
      key,
      label: offer.productName ?? offer.name,
      offerIds: [],
    }
    group.offerIds.push(offer.id)
    byProduct.set(key, group)
  }
  const groups = [...byProduct.values()].sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'))
  if (parents.length) groups.push({ key: 'pais', label: 'Cursos para pais', offerIds: parents })
  return groups.map((g) => ({ ...g, offerIds: g.offerIds.slice(0, 20) }))
}
