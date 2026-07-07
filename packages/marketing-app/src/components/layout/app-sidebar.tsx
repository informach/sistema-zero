'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/cn'
import { NAV_ITEMS } from './nav'

function useIsActive() {
  const pathname = usePathname()
  return (href: string, match?: string): boolean => {
    const prefix = match ?? href
    if (prefix === '/') return pathname === '/'
    return pathname === prefix || pathname.startsWith(`${prefix}/`)
  }
}

/** Navegação lateral (desktop). No mobile use o `MobileNav` (faixa horizontal). */
export function AppSidebar() {
  const isActive = useIsActive()

  return (
    <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-56 shrink-0 flex-col gap-1 overflow-y-auto border-r border-border p-3 md:flex">
      {NAV_ITEMS.map((item) => {
        const active = isActive(item.href, item.match)
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
              active
                ? 'bg-muted font-semibold text-foreground'
                : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
            )}
          >
            <Icon className="size-4" />
            {item.label}
            {item.soon ? (
              <span className="ml-auto rounded bg-muted px-1 text-[10px] uppercase text-muted-foreground">
                em breve
              </span>
            ) : null}
          </Link>
        )
      })}
    </aside>
  )
}

/** Navegação compacta (mobile) — faixa horizontal sob a topbar. */
export function MobileNav() {
  const isActive = useIsActive()

  return (
    <nav className="flex items-center gap-1 overflow-x-auto border-b border-border px-4 py-1.5 md:hidden">
      {NAV_ITEMS.map((item) => {
        const active = isActive(item.href, item.match)
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'whitespace-nowrap rounded-lg px-3 py-1 text-sm transition-colors',
              active ? 'bg-muted font-semibold text-foreground' : 'text-muted-foreground',
            )}
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
