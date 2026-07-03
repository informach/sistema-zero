'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/cn'
import type { GamificationMeView, SessionUserWithAvatar } from '@/lib/types'
import { isNavActive } from './app-sidebar'
import { KidsLogo } from './kids-logo'
import { MOBILE_NAV_ITEMS } from './nav'
import { StreakWidget } from './streak-widget'
import { UserMenu } from './user-menu'

/**
 * Top bar do mobile: logo + streak/XP compactos + menu do avatar (tema/sair
 * acessíveis fora do desktop). `gamification` é best-effort (`null` esconde).
 */
export function MobileTopbar({
  user,
  gamification,
  avatarPhotoUrl = null,
}: {
  user: SessionUserWithAvatar
  gamification: GamificationMeView | null
  /** Foto (snapshot) do avatar 3D do perfil ativo — `null` mostra o personagem padrão. */
  avatarPhotoUrl?: string | null
}) {
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-border border-b bg-background/80 px-4 backdrop-blur md:hidden">
      <Link href="/" aria-label="Início" className="flex items-center" prefetch={false}>
        <KidsLogo priority />
      </Link>
      <div className="flex items-center gap-3">
        {gamification ? <StreakWidget gamification={gamification} compact /> : null}
        <UserMenu user={user} gamification={gamification} avatarPhotoUrl={avatarPhotoUrl} />
      </div>
    </header>
  )
}

/**
 * Tab bar inferior do mobile (estilo Duolingo): 5 abas grandes ícone + label
 * (07/2026 — eram os 9 itens da sidebar, alvos minúsculos p/ mãos pequenas;
 * o resto vive no hub "Criar").
 */
export function MobileTabbar() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-40 flex items-stretch justify-around border-border border-t bg-card pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {/* `prefetch={false}`: mesmo motivo da sidebar — rotas `force-dynamic` + gateway numa réplica
          única não aguentam o prefetch de todos os itens a cada página (tempestade de 502/ERR_HTTP2). */}
      {MOBILE_NAV_ITEMS.map((item) => {
        const active = isNavActive(pathname, item.href, item.match)
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            prefetch={false}
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
