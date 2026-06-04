'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/cn'
import type { SessionUser } from '@/lib/types'
import { NAV_ITEMS } from './nav'
import { ThemeToggle } from './theme-toggle'
import { UserMenu } from './user-menu'

export function AdminTopbar({ user }: { user: SessionUser }) {
  const pathname = usePathname()

  function isActive(href: string, match?: string): boolean {
    const prefix = match ?? href
    if (prefix === '/admin') return pathname === '/admin'
    return pathname === prefix || pathname.startsWith(`${prefix}/`) || pathname.startsWith(prefix)
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <div className="flex h-14 items-center gap-4 px-4 md:px-6">
        <Link href="/admin" className="flex shrink-0 items-center gap-2">
          {/* Logo dual-theme (mesmos SVGs da referência/community): dark ⇄ light */}
          <Image
            src="/logo_dark.svg"
            width={515}
            height={75}
            alt="Sistema Zero"
            className="hidden h-auto w-[120px] md:w-[140px] dark:block"
            priority
          />
          <Image
            src="/logo_white.svg"
            width={515}
            height={72}
            alt="Sistema Zero"
            className="block h-auto w-[120px] md:w-[140px] dark:hidden"
            priority
          />
          <span className="hidden text-xs font-medium text-muted-foreground sm:inline">Admin</span>
        </Link>

        <nav className="ml-2 hidden items-center gap-1 md:flex">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href, item.match)
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors',
                  active
                    ? 'bg-muted font-semibold text-foreground'
                    : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                )}
              >
                <Icon className="size-4" />
                {item.label}
                {item.soon ? (
                  <span className="rounded bg-muted px-1 text-[10px] uppercase text-muted-foreground">
                    em breve
                  </span>
                ) : null}
              </Link>
            )
          })}
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <ThemeToggle />
          <UserMenu user={user} />
        </div>
      </div>

      {/* Nav compacto (mobile) */}
      <nav className="flex items-center gap-1 overflow-x-auto border-t border-border px-4 py-1.5 md:hidden">
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
    </header>
  )
}
