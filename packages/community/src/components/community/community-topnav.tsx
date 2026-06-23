'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/cn'
import type { SessionUserWithAvatar } from '@/lib/types'
import { NAV_ITEMS } from './nav'
import { UserMenu } from './user-menu'

export function CommunityTopnav({ user }: { user: SessionUserWithAvatar }) {
  const pathname = usePathname()

  function isActive(href: string, match?: string): boolean {
    // Raiz só acende em match exato (todo path começa com '/').
    if (href === '/') return pathname === '/'
    if (pathname === href || pathname.startsWith(`${href}/`)) return true
    if (match) return pathname === match || pathname.startsWith(`${match}/`)
    return false
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <div className="relative flex h-14 items-center justify-between gap-4 px-4 md:px-6">
        {/* `prefetch={false}` PROPOSITAL (mesmo motivo do kids): rotas `force-dynamic` + ida ao
            gateway numa réplica ÚNICA — o prefetch automático do Next de todos os links do header
            a cada página vira tempestade de RSC/gateway. Navegação passa a buscar sob demanda. */}
        <Link href="/" className="flex shrink-0 items-center" aria-label="Início" prefetch={false}>
          <Image
            src="/logo_dark.svg"
            width={515}
            height={75}
            alt="Comunidade Sistema Zero"
            className="hidden h-auto w-[130px] md:w-[150px] dark:block"
            priority
          />
          <Image
            src="/logo_white.svg"
            width={515}
            height={72}
            alt="Comunidade Sistema Zero"
            className="block h-auto w-[130px] md:w-[150px] dark:hidden"
            priority
          />
        </Link>

        {/* Menu principal CENTRALIZADO (como na referência) */}
        <nav className="-translate-x-1/2 absolute left-1/2 hidden items-center gap-1 md:flex">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href, item.match)
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={false}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-4 py-2 text-sm transition-colors',
                  active
                    ? 'bg-muted font-semibold text-foreground'
                    : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                )}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="flex shrink-0 items-center">
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
              prefetch={false}
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
