'use client'

import { Field } from '@sistemazero/ui/label'
import { Select } from '@sistemazero/ui/select'
import { useEffect, useMemo, useState } from 'react'
import { apiGet } from '@/lib/api'
import { formatCents } from '@/lib/format'
import { loadAllPages } from '@/lib/load-all-pages'
import type { OfferListItem, Paginated, ProductView } from '@/lib/types'

/** O prazo da oferta para o rótulo da opção ("1 ano", "15 dias"). */
function accessLabel(offer: OfferListItem): string {
  const n = offer.accessDurationValue
  if (offer.accessMode !== 'fixed' || !n) return 'sem prazo fixo'
  if (offer.accessDurationUnit === 'months') return n === 12 ? '1 ano' : `${n} meses`
  return `${n} ${n === 1 ? 'dia' : 'dias'}`
}

/**
 * A régua do BFF do mini checkout (`pageSellableStatus` do member-shell), mais a entrega do curso:
 * oferta avulsa e disponível de um produto ATIVO que entrega ESTE curso, e que é a oferta
 * principal do produto ou está marcada "Pode ser vendida na página do produto". Uma oferta fora
 * dessa régua seria recusada na área dos pais, e o curso ficaria sem compra calado.
 */
export function saleOffersForCourse(
  offers: OfferListItem[],
  products: ProductView[],
  courseSlug: string,
): OfferListItem[] {
  const byId = new Map(products.map((product) => [product.id, product]))
  return offers.filter((offer) => {
    if (offer.pricingMode !== 'one_time' || offer.isAvailable === false) return false
    const product = byId.get(offer.productId)
    if (product?.status !== 'active') return false
    if (product.fulfillment?.accessType !== 'course') return false
    if (product.fulfillment.courseRef !== courseSlug) return false
    return product.primaryOfferId === offer.id || offer.content?.pageSellable === true
  })
}

/**
 * "Oferta de venda" do curso (25/11/2026): a oferta do catálogo que a área dos pais vende no
 * curso fechado, pelo mini checkout. Lista só as que a área dos pais consegue vender
 * (`saleOffersForCourse`), lendo todas as páginas de ofertas e produtos; a oferta guardada
 * aparece sempre, mesmo fora da lista ou com o catálogo fora do ar.
 */
export function CourseSaleOfferField({
  audience,
  courseSlug,
  value,
  onChange,
}: {
  audience: string
  courseSlug: string
  value: string
  onChange: (value: string) => void
}) {
  const [catalog, setCatalog] = useState<{
    offers: OfferListItem[]
    products: ProductView[]
  } | null>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    let active = true
    setCatalog(null)
    setFailed(false)
    const page = (path: string, extra: Record<string, string>) => (offset: number, limit: number) =>
      apiGet<Paginated<never>>(
        `${path}?${new URLSearchParams({ audience, ...extra, limit: String(limit), offset: String(offset) })}`,
      )
    Promise.all([
      loadAllPages<OfferListItem>(page('/api/catalog/offers', { status: 'active' })),
      loadAllPages<ProductView>(page('/api/catalog/products', {})),
    ])
      .then(([offers, products]) => {
        if (active) setCatalog({ offers, products })
      })
      .catch(() => {
        if (active) setFailed(true)
      })
    return () => {
      active = false
    }
  }, [audience])
  // O slug muda a cada letra do título no curso novo: a régua roda na tela, sem ler de novo.
  const offers = useMemo(
    () =>
      catalog ? saleOffersForCourse(catalog.offers, catalog.products, courseSlug.trim()) : null,
    [catalog, courseSlug],
  )
  // A guardada aparece sempre: sem a opção, o campo mostraria "Sem venda" com o catálogo fora.
  const known = offers?.some((offer) => offer.slug === value) ?? false
  return (
    <Field
      label="Oferta de venda"
      htmlFor="salesOfferRef"
      hint={
        failed
          ? 'As ofertas do catálogo não carregaram agora. A oferta escolhida continua guardada.'
          : 'A oferta que a área dos pais vende quando o curso está fechado, sem sair da plataforma. Aparecem as ofertas avulsas do produto deste curso que são a principal dele ou estão marcadas para venda na página do produto.'
      }
    >
      <Select
        id="salesOfferRef"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={offers === null && !failed && !value}
      >
        <option value="">Sem venda na plataforma</option>
        {value && !known ? (
          <option value={value}>
            {offers === null ? value : `${value} (não pode ser vendida aqui)`}
          </option>
        ) : null}
        {(offers ?? []).map((offer) => (
          <option key={offer.id} value={offer.slug}>
            {offer.name} · {formatCents(offer.priceCents)} · {accessLabel(offer)}
          </option>
        ))}
      </Select>
    </Field>
  )
}
