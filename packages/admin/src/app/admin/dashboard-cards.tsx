'use client'

import { CreditCard, Package, TicketPercent, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { communityPage, useCommunityRequests } from '@/components/admin/community-page'
import { OverviewCard } from '@/components/admin/overview-card'
import { apiGet as sharedGet } from '@/lib/api'
import type { Platform } from '@/lib/platform'
import type { Paginated } from '@/lib/types'

type Totals = {
  users: number | null
  products: number | null
  offers: number | null
  coupons: number | null
}

export const DashboardCards = communityPage(DashboardCardsCommunity)

function DashboardCardsCommunity({ audience }: { audience: Platform }) {
  const { get: apiGet } = useCommunityRequests(audience)
  const [totals, setTotals] = useState<Totals>({
    users: null,
    products: null,
    offers: null,
    coupons: null,
  })

  useEffect(() => {
    let alive = true
    async function load() {
      const fetchTotal = async (path: string, shared = false) => {
        try {
          const page = await (shared ? sharedGet : apiGet)<Paginated<unknown>>(`${path}?limit=1`)
          return page.total
        } catch {
          return null
        }
      }
      const [users, products, offers, coupons] = await Promise.all([
        fetchTotal('/api/admin/users', true),
        fetchTotal('/api/catalog/products'),
        fetchTotal('/api/catalog/offers'),
        fetchTotal('/api/catalog/coupons'),
      ])
      if (alive) setTotals({ users, products, offers, coupons })
    }
    load()
    return () => {
      alive = false
    }
  }, [apiGet])

  const fmt = (n: number | null) => (n === null ? '—' : String(n))

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <OverviewCard
        title="Contas compartilhadas"
        value={fmt(totals.users)}
        icon={Users}
        description="Identidades de Kids, Adultos e equipe"
        href="/admin/usuarios"
      />
      <OverviewCard
        title="Produtos"
        value={fmt(totals.products)}
        icon={Package}
        description="O que a pessoa ganha"
        href="/admin/catalogo/produtos"
      />
      <OverviewCard
        title="Ofertas"
        value={fmt(totals.offers)}
        icon={CreditCard}
        description="Como cada produto é vendido"
        href="/admin/catalogo/ofertas"
      />
      <OverviewCard
        title="Cupons"
        value={fmt(totals.coupons)}
        icon={TicketPercent}
        description="Descontos nas ofertas"
        href="/admin/catalogo/cupons"
      />
    </div>
  )
}
