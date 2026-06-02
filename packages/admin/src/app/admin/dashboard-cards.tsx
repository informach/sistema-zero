'use client'

import { CreditCard, Package, TicketPercent } from 'lucide-react'
import { useEffect, useState } from 'react'
import { OverviewCard } from '@/components/admin/overview-card'
import { apiGet } from '@/lib/api'
import type { Paginated } from '@/lib/types'

type Totals = { products: number | null; offers: number | null; coupons: number | null }

export function DashboardCards() {
  const [totals, setTotals] = useState<Totals>({ products: null, offers: null, coupons: null })

  useEffect(() => {
    let alive = true
    async function load() {
      const fetchTotal = async (path: string) => {
        try {
          const page = await apiGet<Paginated<unknown>>(`${path}?limit=1`)
          return page.total
        } catch {
          return null
        }
      }
      const [products, offers, coupons] = await Promise.all([
        fetchTotal('/api/catalog/products'),
        fetchTotal('/api/catalog/offers'),
        fetchTotal('/api/catalog/coupons'),
      ])
      if (alive) setTotals({ products, offers, coupons })
    }
    load()
    return () => {
      alive = false
    }
  }, [])

  const fmt = (n: number | null) => (n === null ? '—' : String(n))

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <OverviewCard
        title="Produtos"
        value={fmt(totals.products)}
        icon={Package}
        description="No catálogo"
      />
      <OverviewCard
        title="Ofertas"
        value={fmt(totals.offers)}
        icon={CreditCard}
        description="Unidades de venda"
      />
      <OverviewCard
        title="Cupons"
        value={fmt(totals.coupons)}
        icon={TicketPercent}
        description="Descontos cadastrados"
      />
    </div>
  )
}
