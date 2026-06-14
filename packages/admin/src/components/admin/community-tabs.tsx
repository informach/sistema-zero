'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/cn'
import { COMMUNITY_TABS } from './nav'

/** Abas da comunidade (Servidores | Moderação). */
export function CommunityTabs() {
  const pathname = usePathname()
  return (
    <div className="flex items-center gap-1 border-b border-border">
      {COMMUNITY_TABS.map((tab) => {
        const active = pathname.startsWith(tab.href)
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              '-mb-px border-b-2 px-3 py-2 text-sm transition-colors',
              active
                ? 'border-primary font-semibold text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {tab.label}
          </Link>
        )
      })}
    </div>
  )
}
