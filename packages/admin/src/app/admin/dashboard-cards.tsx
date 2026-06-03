'use client'

import { Banknote, CreditCard, Package, TicketPercent, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { OverviewCard } from '@/components/admin/overview-card'
import { apiGet } from '@/lib/api'
import { formatCentsStr } from '@/lib/format'
import type { Paginated, PaymentStats } from '@/lib/types'

type Totals = {
  users: number | null
  products: number | null
  offers: number | null
  coupons: number | null
  revenue: string | null
}

export function DashboardCards() {
  const [totals, setTotals] = useState<Totals>({
    users: null,
    products: null,
    offers: null,
    coupons: null,
    revenue: null,
  })

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
      const fetchRevenue = async () => {
        try {
          const stats = await apiGet<PaymentStats>('/api/payments/stats')
          return stats.paidAmountInCents
        } catch {
          return null
        }
      }
      const [users, products, offers, coupons, revenue] = await Promise.all([
        fetchTotal('/api/admin/users'),
        fetchTotal('/api/catalog/products'),
        fetchTotal('/api/catalog/offers'),
        fetchTotal('/api/catalog/coupons'),
        fetchRevenue(),
      ])
      if (alive) setTotals({ users, products, offers, coupons, revenue })
    }
    load()
    return () => {
      alive = false
    }
  }, [])

  const fmt = (n: number | null) => (n === null ? '—' : String(n))

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <OverviewCard
        title="Receita (paga)"
        value={totals.revenue === null ? '—' : formatCentsStr(totals.revenue)}
        icon={Banknote}
        description="Pagamentos confirmados"
      />
      <OverviewCard
        title="Usuários"
        value={fmt(totals.users)}
        icon={Users}
        description="Contas cadastradas"
      />
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
