'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/cn'
import { ALUNOS_TABS, CATALOG_TABS, PAYMENTS_TABS } from './nav'

interface Tab {
  label: string
  href: string
}

/**
 * As abas de uma área (Catálogo, Vendas, Alunos): links de verdade, com a aba da rota atual
 * marcada. A aba casa a rota exata ou um caminho abaixo dela; a primeira aba de Alunos
 * (`/admin/membros`) perde para a aba mais longa que também casa (Ranking, Análises).
 */
export function SectionTabs({ tabs, label }: { tabs: readonly Tab[]; label: string }) {
  const pathname = usePathname() ?? ''
  const matches = (href: string) => pathname === href || pathname.startsWith(`${href}/`)
  // A aba mais longa que casa vence: /admin/membros/ranking acende Ranking, não Lista.
  const current = tabs
    .filter((tab) => matches(tab.href))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href
  return (
    <nav aria-label={label} className="flex flex-wrap items-center gap-1 border-b border-border">
      {tabs.map((tab) => {
        const active = tab.href === current
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              '-mb-px border-b-[3px] px-3.5 py-2.5 text-[15px] font-bold transition-colors',
              active
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}

export function AlunosTabs() {
  return <SectionTabs tabs={ALUNOS_TABS} label="Alunos" />
}

export function CatalogTabs() {
  return <SectionTabs tabs={CATALOG_TABS} label="Catálogo" />
}

export function PaymentsTabs() {
  return <SectionTabs tabs={PAYMENTS_TABS} label="Vendas" />
}
