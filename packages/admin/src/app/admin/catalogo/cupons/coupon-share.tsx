'use client'
import { Button } from '@sistemazero/ui/button'
import { Dialog } from '@sistemazero/ui/dialog'
import { Input } from '@sistemazero/ui/input'
import { ShareCard } from '@sistemazero/ui/share-card'
import { useCallback, useEffect, useRef, useState } from 'react'
import { copyToClipboard } from '@/app/admin/notas-fiscais/copy-to-clipboard'
import { useCommunityRequests } from '@/components/admin/community-page'
import { isCanceledCommunityRequest } from '@/lib/community-query'
import { loadAllPages } from '@/lib/load-all-pages'
import type { CouponView, OfferListItem, Paginated } from '@/lib/types'

export function CouponShare({ coupon, onClose }: { coupon: CouponView; onClose: () => void }) {
  const { get } = useCommunityRequests(coupon.audience)
  const [offers, setOffers] = useState<OfferListItem[]>([])
  const [offerId, setOfferId] = useState('')
  const [resolved, setResolved] = useState<{ offerId: string; url: string } | null>(null)
  const [offersError, setOffersError] = useState('')
  const [linkError, setLinkError] = useState('')
  const [loadingOffers, setLoadingOffers] = useState(true)
  const [loadingLink, setLoadingLink] = useState(false)
  const offersAttempt = useRef(0)
  const linkAttempt = useRef(0)
  const loadOffers = useCallback(async () => {
    const attempt = ++offersAttempt.current
    setLoadingOffers(true)
    setOffersError('')
    await loadAllPages((offset, limit) =>
      get<Paginated<OfferListItem>>(`/api/catalog/offers?offset=${offset}&limit=${limit}`),
    )
      .then((items) => {
        if (attempt === offersAttempt.current)
          setOffers(
            items.filter(
              (o) =>
                o.isAvailable &&
                o.content?.allowsCoupon === true &&
                (coupon.appliesToAll || coupon.offerIds.includes(o.id)),
            ),
          )
      })
      .catch((e) => {
        if (attempt === offersAttempt.current && !isCanceledCommunityRequest(e))
          setOffersError('Não foi possível carregar as ofertas.')
      })
      .finally(() => {
        if (attempt === offersAttempt.current) setLoadingOffers(false)
      })
  }, [get, coupon])
  useEffect(() => {
    void loadOffers()
    return () => {
      ++offersAttempt.current
    }
  }, [loadOffers])
  const offer = offers.find((o) => o.id === offerId)
  const url = resolved?.offerId === offerId ? resolved.url : ''
  const loadLink = useCallback(async () => {
    const attempt = ++linkAttempt.current
    setResolved(null)
    setLinkError('')
    if (!offer) {
      setLoadingLink(false)
      return
    }
    setLoadingLink(true)
    await get<{ url: string }>(
      `/api/catalog/coupon-link?${new URLSearchParams({ code: coupon.code, offer: offer.slug })}`,
    )
      .then((value) => {
        if (attempt === linkAttempt.current) setResolved({ offerId: offer.id, url: value.url })
      })
      .catch((e) => {
        if (attempt === linkAttempt.current && !isCanceledCommunityRequest(e))
          setLinkError(
            e && typeof e === 'object' && 'message' in e
              ? String(e.message)
              : 'Não foi possível preparar o link.',
          )
      })
      .finally(() => {
        if (attempt === linkAttempt.current) setLoadingLink(false)
      })
  }, [offer, coupon.code, get])
  useEffect(() => {
    void loadLink()
    return () => {
      ++linkAttempt.current
    }
  }, [loadLink])
  const loading = loadingOffers || loadingLink
  const error = offersError || linkError
  const date = (value: string) =>
    new Date(value).toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      dateStyle: 'short',
      timeStyle: 'short',
    })
  const discount =
    coupon.percentOff !== null
      ? `${coupon.percentOff}%`
      : ((coupon.amountOffCents ?? 0) / 100).toLocaleString('pt-BR', {
          style: 'currency',
          currency: coupon.currency,
        })
  const notice = [
    offer?.pricingMode === 'subscription'
      ? 'Desconto só na primeira cobrança. Renovações pelo preço normal.'
      : '',
    coupon.validFrom ? `A partir de ${date(coupon.validFrom)}.` : '',
    coupon.validUntil
      ? `Use até ${date(coupon.validUntil)} (Brasília).`
      : 'Sem data de encerramento definida.',
    coupon.minPurchaseCents
      ? `Compra mínima: ${(coupon.minPurchaseCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: coupon.currency })}.`
      : '',
    coupon.maxRedemptions ? 'Sujeito ao limite de usos disponíveis.' : '',
  ]
    .filter(Boolean)
    .join(' ')
  return (
    <Dialog open onClose={onClose} title={`Divulgar cupom ${coupon.code}`} className="max-w-xl">
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Escolha a oferta que o QR code vai abrir. O cupom mantém o escopo e as condições
          cadastradas.
        </p>
        <label className="block space-y-1 text-sm font-semibold">
          Oferta do cartão
          <select
            className="min-h-11 w-full rounded-lg border bg-background p-2"
            value={offerId}
            onChange={(e) => setOfferId(e.target.value)}
          >
            <option value="">Selecione uma oferta</option>
            {offers.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </label>
        {loading && (
          <p role="status" className="text-sm">
            Conferindo a oferta…
          </p>
        )}
        {error && (
          <div role="alert" className="text-sm text-destructive">
            <p>{error}</p>
            <Button
              variant="ghost"
              disabled={loading}
              onClick={() => void (offersError ? loadOffers() : loadLink())}
            >
              Tentar novamente
            </Button>
          </div>
        )}
        {!loading && !error && offers.length === 0 && (
          <p className="text-sm">
            Não há ofertas disponíveis que aceitem este cupom nesta comunidade.
          </p>
        )}
        {url && offer && (
          <>
            <Input
              readOnly
              aria-label="Link do cupom"
              value={url}
              onFocus={(e) => e.target.select()}
            />
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" onClick={() => void copyToClipboard(url, 'Link do cupom')}>
                Copiar link
              </Button>
              <ShareCard
                url={url}
                title={`${discount} de desconto`}
                subtitle={
                  coupon.audience === 'kids' ? 'Kids · para crianças' : 'Adultos · 18 anos ou mais'
                }
                description={`${offer.name}. Use o cupom ${coupon.code}.${offer.accessMode === 'fixed' ? ` Acesso por ${offer.accessDurationValue} ${offer.accessDurationUnit === 'days' ? 'dias' : 'meses'} após o pagamento.` : ''}`}
                notice={notice}
                label="Cartão do cupom"
              />
            </div>
          </>
        )}
      </div>
    </Dialog>
  )
}
