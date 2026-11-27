'use client'

import { creatorCommunityAccessRef } from '@sistemazero/core/creations'
import { type CampaignInput, giftDurationLabel } from '@sistemazero/core/referrals'
import { Button } from '@sistemazero/ui/button'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useCommunityRequests } from '@/components/admin/community-page'
import { isCanceledCommunityRequest } from '@/lib/community-query'
import type { Platform } from '@/lib/platform'
import type { OfferListItem, Paginated, ProductView } from '@/lib/types'

/**
 * Oferta de presente da campanha (15/11/2026). O presente é uma OFERTA do catálogo do mesmo
 * público da campanha, de pagamento único, sem prazo ou com prazo fixo (dias ou meses): o referrals
 * recusa assinatura, oferta arquivada e outro público. Curso, prazo e Mural vêm
 * da oferta escolhida.
 */
export const GIFT_OFFER_LOCKED_MESSAGE =
  'A oferta de presente só muda enquanto a campanha está em rascunho e sem cadastros. Para trocar, duplique a campanha como nova edição.'
/** Fora do rascunho (27/11/2026): a troca vale só por outra oferta do mesmo curso. */
export const GIFT_OFFER_SAME_COURSE_MESSAGE =
  'Com a campanha no ar, dá para trocar só por outra oferta do mesmo curso. Quem já se cadastrou fica com a oferta que recebeu. Para dar outro curso, duplique a campanha como nova edição.'
export const GIFT_CATALOG_UNAVAILABLE_MESSAGE =
  'Não foi possível conferir a oferta de presente no Catálogo agora. Tente de novo em instantes.'
export const GIFT_OFFER_REQUIRED_MESSAGE = 'Escolha a oferta de presente da campanha.'
/** Campanha anterior à escolha de oferta: o referrals usa a oferta padrão do Cadê do público. */
export const DEFAULT_GIFT_OFFER_LABEL = 'Oferta padrão do Cadê'

export interface GiftOfferOption {
  id: string
  name: string
  slug: string
  status: string
  /** Nome do produto principal (o curso). */
  courseName: string | null
  /** O produto principal: com a campanha no ar, a troca vale só dentro do mesmo produto. */
  productId: string
  includesMural: boolean
  /** "7 dias", "6 meses" ou "sem prazo" (`giftDurationLabel`). */
  duration: string
  accessMode: 'fixed' | 'lifetime'
}

const statusLabels: Record<string, string> = {
  active: 'Ativa',
  paused: 'Pausada',
  draft: 'Rascunho',
  archived: 'Arquivada',
}
export const giftOfferStatusLabel = (status: string) => statusLabels[status] ?? status

/** O que a oferta inclui: o curso principal e, quando houver o item, "+ Mural". */
export function giftOfferIncludes(option: Pick<GiftOfferOption, 'courseName' | 'includesMural'>) {
  return `${option.courseName ?? 'Curso'}${option.includesMural ? ' + Mural' : ''}`
}

/**
 * As ofertas que servem de presente: pagamento único, sem prazo ou com prazo fixo (dias ou, desde
 * 27/11/2026, meses: a oferta única de 6 meses de cada curso também é o presente). Arquivadas
 * ficam de fora da escolha, mas continuam no mapa para nomear a
 * oferta de uma campanha antiga.
 */
export function toGiftOfferOptions(
  offers: OfferListItem[],
  muralProductIds: ReadonlySet<string>,
): GiftOfferOption[] {
  return offers.flatMap((offer) => {
    const { accessMode } = offer
    if (accessMode !== 'fixed' && accessMode !== 'lifetime') return []
    // Prazo fixo com a duração cadastrada: a régua do `giftOfferProblem` do referrals.
    if (accessMode === 'fixed' && (!offer.accessDurationUnit || !offer.accessDurationValue))
      return []
    return [
      {
        id: offer.id,
        name: offer.name,
        slug: offer.slug,
        status: offer.status,
        courseName: offer.productName,
        productId: offer.productId,
        includesMural:
          muralProductIds.has(offer.productId) ||
          offer.items.some((item) => muralProductIds.has(item.productId)),
        duration:
          accessMode !== 'fixed'
            ? giftDurationLabel(null)
            : offer.accessDurationUnit === 'months'
              ? giftDurationLabel(null, offer.accessDurationValue)
              : giftDurationLabel(offer.accessDurationValue),
        accessMode,
      },
    ]
  })
}

/** O produto do Mural completo do público (o mesmo ref que o referrals procura na oferta). */
export function isMuralProduct(product: ProductView, audience: Platform): boolean {
  const ref = creatorCommunityAccessRef('mural-dos-criadores', audience)
  return product.fulfillment
    ? product.fulfillment.accessType === 'community' && product.fulfillment.courseRef === ref
    : product.slug === ref
}

/** Texto do cartão de compartilhamento a partir da oferta (ou o texto histórico do Cadê). */
export function giftOfferShareDescription(option: GiftOfferOption | null, legacy: boolean) {
  if (legacy) return '7 dias gratuitos no curso Cadê Todo Mundo e no Mural de criações.'
  if (!option) return 'Um presente gratuito do Sistema Zero.'
  const course = option.courseName ? `ao curso ${option.courseName}` : 'ao curso'
  const mural = option.includesMural ? ' e ao Mural de criações' : ''
  return option.accessMode === 'lifetime'
    ? `Acesso gratuito ${course}${mural}, sem prazo.`
    : `${option.duration} de acesso gratuito ${course}${mural}.`
}

export type GiftOffersState = {
  status: 'loading' | 'ready' | 'error'
  options: GiftOfferOption[]
  byId: ReadonlyMap<string, GiftOfferOption>
  reload: () => void
}

const PAGE = 100
const MAX_PAGES = 10

/**
 * Lê as ofertas do público (todas as páginas, até 1.000) e os produtos do Mural, para saber
 * quais ofertas incluem o Mural. Os itens da oferta só trazem o `productId`. O público já vai na
 * consulta (`communityQuery`); a listagem do Catálogo não filtra por política de acesso e filtra
 * uma situação por vez, e a lista precisa das quatro (o rascunho aparece desabilitado, a
 * arquivada nomeia a oferta de campanha antiga), por isso a paginação.
 */
export function useGiftOffers(audience: Platform): GiftOffersState {
  const { get } = useCommunityRequests(audience)
  const [status, setStatus] = useState<GiftOffersState['status']>('loading')
  const [options, setOptions] = useState<GiftOfferOption[]>([])
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let alive = true
    setStatus('loading')
    void attempt
    ;(async () => {
      const offers: OfferListItem[] = []
      for (let page = 0; page < MAX_PAGES; page++) {
        const result = await get<Paginated<OfferListItem>>(
          `/api/catalog/offers?${new URLSearchParams({ limit: String(PAGE), offset: String(page * PAGE) })}`,
        )
        offers.push(...result.items)
        if (result.items.length < PAGE || offers.length >= result.total) break
      }
      const products = await get<Paginated<ProductView>>(
        `/api/catalog/products?${new URLSearchParams({ q: 'mural-dos-criadores', limit: '100' })}`,
      )
      const mural = new Set(
        products.items.filter((product) => isMuralProduct(product, audience)).map((p) => p.id),
      )
      return toGiftOfferOptions(offers, mural)
    })()
      .then((next) => {
        if (!alive) return
        setOptions(next)
        setStatus('ready')
      })
      .catch((err) => {
        if (!alive || isCanceledCommunityRequest(err)) return
        setStatus('error')
      })
    return () => {
      alive = false
    }
  }, [get, audience, attempt])
  const reload = useCallback(() => setAttempt((n) => n + 1), [])
  const byId = useMemo(() => new Map(options.map((o) => [o.id, o])), [options])
  return { status, options, byId, reload }
}

/** Nome da oferta de presente de uma campanha na lista e no detalhe. */
export function campaignGiftOfferName(
  campaign: Pick<CampaignInput, 'giftOfferId'>,
  offers: GiftOffersState,
): string {
  if (!campaign.giftOfferId) return DEFAULT_GIFT_OFFER_LABEL
  const option = offers.byId.get(campaign.giftOfferId)
  if (option) return option.name
  return offers.status === 'loading' ? 'Carregando oferta…' : 'Oferta do Catálogo'
}

const optionLabel = (option: GiftOfferOption) =>
  `${option.name} · ${giftOfferIncludes(option)} · ${option.duration}${option.status === 'active' ? '' : ` · ${giftOfferStatusLabel(option.status)}`}`

/**
 * O campo obrigatório "Oferta de presente". Campanha antiga sem oferta mostra a "Oferta padrão
 * do Cadê" até alguém escolher outra; fora do rascunho (ou com cadastros) a escolha trava.
 */
export function GiftOfferField({
  value,
  onChange,
  offers,
  legacy,
  locked,
}: {
  value: string | null | undefined
  onChange: (next: string | null) => void
  offers: GiftOffersState
  /** Campanha antiga, gravada sem oferta. */
  legacy: boolean
  locked: boolean
}) {
  const selected = value ? offers.byId.get(value) : undefined
  // Arquivada só aparece quando já é a escolhida (campanha antiga). Com a campanha no ar, só as
  // ofertas do mesmo produto (o referrals confere o curso de novo).
  const choices = offers.options.filter(
    (o) =>
      (o.status !== 'archived' || o.id === value) &&
      (!locked || o.id === value || (selected !== undefined && o.productId === selected.productId)),
  )
  // Sem a oferta gravada na lista (catálogo fora, oferta de outra lente), nada a trocar.
  const disabled = locked && (!selected || choices.length < 2)
  return (
    <fieldset className="min-w-0 space-y-2 rounded-lg border p-4">
      <legend className="px-1 text-sm font-semibold">Oferta de presente</legend>
      <p className="text-sm text-muted-foreground">
        O que quem se cadastra recebe sem pagar: o curso, o prazo e, quando a oferta inclui, o
        Mural. Aparecem as ofertas do Catálogo deste público com pagamento único, sem prazo ou com
        prazo fixo. Uma oferta pausada pode servir só de presente.
      </p>
      <label className="block space-y-1 text-sm font-semibold">
        <span>Oferta de presente</span>
        <select
          name="campaign-gift-offer"
          className="w-full rounded-md border bg-background p-2 font-normal"
          required={!legacy}
          disabled={disabled}
          value={value ?? ''}
          onChange={(event) => onChange(event.target.value || null)}
        >
          {legacy ? (
            <option value="">{DEFAULT_GIFT_OFFER_LABEL} (campanha antiga)</option>
          ) : (
            <option value="" disabled>
              {offers.status === 'loading' ? 'Carregando ofertas…' : 'Escolha uma oferta'}
            </option>
          )}
          {value && !selected ? <option value={value}>Oferta escolhida ({value})</option> : null}
          {choices.map((option) => (
            <option key={option.id} value={option.id} disabled={option.status === 'draft'}>
              {optionLabel(option)}
              {option.status === 'draft' ? ' (ative ou pause no Catálogo para usar)' : ''}
            </option>
          ))}
        </select>
      </label>
      {selected ? (
        <p className="text-sm" role="status">
          Inclui {giftOfferIncludes(selected)}. Prazo: {selected.duration}. Situação no Catálogo:{' '}
          {giftOfferStatusLabel(selected.status)}.
        </p>
      ) : legacy && !value ? (
        <p className="text-sm text-muted-foreground">
          Esta campanha é anterior à escolha de oferta e entrega a oferta padrão do Cadê Todo Mundo
          deste público. Escolha outra oferta para mudar o presente.
        </p>
      ) : null}
      {locked ? (
        <p className="text-sm text-muted-foreground">
          {disabled ? GIFT_OFFER_LOCKED_MESSAGE : GIFT_OFFER_SAME_COURSE_MESSAGE}
        </p>
      ) : null}
      {offers.status === 'error' ? (
        <p role="alert" className="text-sm text-destructive">
          As ofertas do Catálogo não carregaram.{' '}
          <Button type="button" variant="ghost" size="sm" onClick={offers.reload}>
            Tentar de novo
          </Button>
        </p>
      ) : null}
      {offers.status === 'ready' && choices.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Não há oferta de pagamento único neste público. Cadastre uma em Catálogo, Ofertas.
        </p>
      ) : null}
    </fieldset>
  )
}
