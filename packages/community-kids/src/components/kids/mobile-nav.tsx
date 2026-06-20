'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { AvatarConfig } from '@/lib/avatar-catalog'
import { cn } from '@/lib/cn'
import type { GamificationMeView, SessionUserWithAvatar } from '@/lib/types'
import { isNavActive } from './app-sidebar'
import { KidsLogo } from './kids-logo'
import { NAV_ITEMS } from './nav'
import { StreakWidget } from './streak-widget'
import { UserMenu } from './user-menu'

/**
 * Top bar do mobile: logo + streak/XP compactos + menu do avatar (tema/sair
 * acessíveis fora do desktop). `gamification` é best-effort (`null` esconde).
 */
export function MobileTopbar({
  user,
  gamification,
  avatarConfig = null,
}: {
  user: SessionUserWithAvatar
  gamification: GamificationMeView | null
  avatarConfig?: AvatarConfig | null
}) {
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-border border-b bg-background/80 px-4 backdrop-blur md:hidden">
      <Link href="/" aria-label="Início" className="flex items-center">
        <KidsLogo priority />
      </Link>
      <div className="flex items-center gap-3">
        {gamification ? <StreakWidget gamification={gamification} compact /> : null}
        <UserMenu user={user} gamification={gamification} avatarConfig={avatarConfig} />
      </div>
    </header>
  )
}

/** Tab bar inferior do mobile (estilo Duolingo): abas grandes ícone + label. */
export function MobileTabbar() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-40 flex items-stretch justify-around border-border border-t bg-card pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {NAV_ITEMS.map((item) => {
        const active = isNavActive(pathname, item.href, item.match)
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex flex-1 flex-col items-center gap-0.5 py-2 transition-colors',
              active ? 'text-primary' : 'text-muted-foreground',
            )}
          >
            <span
              className={cn(
                'rounded-xl px-3 py-0.5 transition-colors',
                active && 'bg-(--kids-cyan-tint)',
              )}
            >
              <Icon className="size-6" />
            </span>
            <span className="[font-family:var(--font-display)] font-bold text-[0.65rem] uppercase tracking-wide">
              {item.label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
