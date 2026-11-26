'use client'

import { Field } from '@sistemazero/ui/label'
import { Select } from '@sistemazero/ui/select'
import { useEffect, useState } from 'react'
import { apiGet } from '@/lib/api'
import { formatCents } from '@/lib/format'
import type { OfferListItem, Paginated } from '@/lib/types'

/** O prazo da oferta para o rótulo da opção ("1 ano", "15 dias"). */
function accessLabel(offer: OfferListItem): string {
  const n = offer.accessDurationValue
  if (offer.accessMode !== 'fixed' || !n) return 'sem prazo fixo'
  if (offer.accessDurationUnit === 'months') return n === 12 ? '1 ano' : `${n} meses`
  return `${n} ${n === 1 ? 'dia' : 'dias'}`
}

/**
 * "Oferta de venda" do curso (25/11/2026): a oferta do catálogo que a área dos pais vende no
 * curso fechado, pelo mini checkout. Lista só as ofertas avulsas ativas da plataforma do curso;
 * uma oferta guardada que saiu da lista continua escolhida, com o aviso.
 */
export function CourseSaleOfferField({
  audience,
  value,
  onChange,
}: {
  audience: string
  value: string
  onChange: (value: string) => void
}) {
  const [offers, setOffers] = useState<OfferListItem[] | null>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    let active = true
    setOffers(null)
    setFailed(false)
    const params = new URLSearchParams({ audience, status: 'active', limit: '100', offset: '0' })
    apiGet<Paginated<OfferListItem>>(`/api/catalog/offers?${params}`)
      .then((page) => {
        if (active) setOffers(page.items.filter((offer) => offer.pricingMode === 'one_time'))
      })
      .catch(() => {
        if (active) setFailed(true)
      })
    return () => {
      active = false
    }
  }, [audience])
  const known = offers?.some((offer) => offer.slug === value) ?? true
  return (
    <Field
      label="Oferta de venda"
      htmlFor="salesOfferRef"
      hint={
        failed
          ? 'As ofertas do catálogo não carregaram agora. A oferta escolhida continua guardada.'
          : 'A oferta que a área dos pais vende quando o curso está fechado, sem sair da plataforma. Escolha a oferta de venda, nunca a do presente.'
      }
    >
      <Select
        id="salesOfferRef"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={offers === null && !failed}
      >
        <option value="">Sem venda na plataforma</option>
        {value && !known ? <option value={value}>{value} (fora das ofertas ativas)</option> : null}
        {(offers ?? []).map((offer) => (
          <option key={offer.id} value={offer.slug}>
            {offer.name} · {formatCents(offer.priceCents)} · {accessLabel(offer)}
          </option>
        ))}
      </Select>
    </Field>
  )
}
