'use client'
import { Button } from '@sistemazero/ui/button'
import { Input } from '@sistemazero/ui/input'
import { useState } from 'react'
import { useCommunityRequests } from '@/components/admin/community-page'
import { isCanceledCommunityRequest } from '@/lib/community-query'
import type { Platform } from '@/lib/platform'
import type { CampaignCouponDraft } from '@/lib/prepare-campaign-coupon'
import type { OfferListItem, Paginated } from '@/lib/types'

export function CampaignCouponFields({
  audience,
  value,
  onChange,
}: {
  audience: Platform
  value: CampaignCouponDraft | null
  onChange: (value: CampaignCouponDraft | null) => void
}) {
  const { get } = useCommunityRequests(audience)
  const [query, setQuery] = useState('')
  const [items, setItems] = useState<OfferListItem[]>([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searched, setSearched] = useState(false)
  const [selectedOffer, setSelectedOffer] = useState<OfferListItem | null>(null)
  async function search(next = 0) {
    if (loading) return
    setLoading(true)
    setError('')
    try {
      const page = await get<Paginated<OfferListItem>>(
        `/api/catalog/offers?${new URLSearchParams({ q: query, status: 'active', limit: '25', offset: String(next) })}`,
      )
      setItems(page.items)
      setTotal(page.total)
      setOffset(next)
      setSearched(true)
    } catch (e) {
      if (!isCanceledCommunityRequest(e))
        setError('Não foi possível carregar as ofertas. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }
  return (
    <fieldset className="space-y-3 rounded-xl border p-4">
      <legend className="px-1 text-sm font-bold">Cupom da campanha · opcional</legend>
      <label className="flex min-h-11 items-center gap-3 text-sm font-semibold">
        <input
          type="checkbox"
          checked={value !== null}
          onChange={(e) =>
            onChange(e.target.checked ? { code: '', percentOff: 50, offerId: '' } : null)
          }
        />
        Cadastrar um cupom de desconto nesta campanha
      </label>
      <p className="text-sm text-muted-foreground">
        O presente e o desconto são benefícios separados. Este cupom vale para uma oferta da
        comunidade {audience === 'kids' ? 'Kids' : 'Adultos'} e acompanha as datas da campanha.
      </p>
      {value && (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-sm font-semibold">
              Código do cupom
              <Input
                required
                minLength={3}
                maxLength={60}
                pattern="[a-zA-Z0-9][a-zA-Z0-9._\-]*"
                value={value.code}
                onChange={(e) => onChange({ ...value, code: e.target.value.toUpperCase() })}
                placeholder="Ex.: ENCONTRO50"
              />
            </label>
            <label className="space-y-1 text-sm font-semibold">
              Desconto (%)
              <Input
                required
                type="number"
                min={1}
                max={99}
                value={value.percentOff || ''}
                onChange={(e) => onChange({ ...value, percentOff: Number(e.target.value) })}
              />
            </label>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <label className="min-w-0 flex-1 space-y-1 text-sm font-semibold">
              Buscar oferta
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Nome do curso ou da oferta"
              />
            </label>
            <Button
              type="button"
              variant="outline"
              disabled={loading}
              onClick={() => void search()}
            >
              {loading ? 'Buscando…' : 'Buscar'}
            </Button>
          </div>
          <div className="space-y-2">
            {items.map((offer) => (
              <label key={offer.id} className="flex min-h-11 gap-3 rounded-lg border p-3 text-sm">
                <input
                  type="radio"
                  name="campaign-offer"
                  value={offer.id}
                  checked={value.offerId === offer.id}
                  disabled={!offer.isAvailable || offer.content?.allowsCoupon !== true}
                  onChange={() => {
                    setSelectedOffer(offer)
                    onChange({ ...value, offerId: offer.id })
                  }}
                />
                <span>
                  <strong className="block">{offer.name}</strong>
                  {(offer.priceCents / 100).toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: offer.currency,
                  })}
                  {offer.content?.allowsCoupon !== true ? ' · não aceita cupom' : ''}
                  {offer.accessMode === 'fixed'
                    ? ` · acesso por ${offer.accessDurationValue} ${offer.accessDurationUnit === 'days' ? 'dias' : 'meses'} após o pagamento`
                    : ''}
                </span>
              </label>
            ))}
          </div>
          {searched && !loading && !error && items.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nenhuma oferta encontrada. Tente outro nome.
            </p>
          )}
          {selectedOffer?.id === value.offerId && (
            <p className="rounded-lg bg-primary/5 p-3 text-sm">
              Oferta selecionada: <strong>{selectedOffer.name}</strong>
            </p>
          )}
          {total > 25 && (
            <div className="flex justify-between">
              <Button
                type="button"
                variant="ghost"
                disabled={loading || offset === 0}
                onClick={() => void search(offset - 25)}
              >
                Anteriores
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={loading || offset + 25 >= total}
                onClick={() => void search(offset + 25)}
              >
                Próximas
              </Button>
            </div>
          )}
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Para mudar desconto ou oferta depois, cadastre um novo código. Cupons avulsos continuam
            disponíveis em Catálogo → Cupons.
          </p>
        </>
      )}
    </fieldset>
  )
}
