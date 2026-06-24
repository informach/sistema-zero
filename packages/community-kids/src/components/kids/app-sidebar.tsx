'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/cn'
import { profileMenuSubtitle } from '@/lib/gamification-label'
import type { GamificationMeView, SessionUserWithAvatar } from '@/lib/types'
import { KidsLogo } from './kids-logo'
import { NAV_ITEMS } from './nav'
import { StreakWidget } from './streak-widget'
import { UserMenu } from './user-menu'

export function isNavActive(pathname: string, href: string, match?: string): boolean {
  // Raiz só acende em match exato (todo path começa com '/').
  if (href === '/') return pathname === '/'
  if (pathname === href || pathname.startsWith(`${href}/`)) return true
  if (match) return pathname === match || pathname.startsWith(`${match}/`)
  return false
}

/**
 * Sidebar fixa do desktop (estilo Duolingo): logo no topo, itens grandes
 * com ícone + label em Baloo (ativo = tint da marca + borda), widget de
 * streak/XP acima do rodapé e menu do avatar ancorado no rodapé (dropdown
 * abre PARA CIMA). `gamification` é best-effort (`null` esconde o widget).
 */
export function AppSidebar({
  user,
  gamification,
  avatarPhotoUrl = null,
}: {
  user: SessionUserWithAvatar
  gamification: GamificationMeView | null
  /** Foto (snapshot) do avatar 3D do perfil ativo — `null` mostra o personagem padrão. */
  avatarPhotoUrl?: string | null
}) {
  const pathname = usePathname()

  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-border border-r bg-card px-3 py-5 md:flex">
      <Link href="/" aria-label="Início" className="px-2" prefetch={false}>
        <KidsLogo priority />
      </Link>

      {/* ⚠️ `prefetch={false}` é PROPOSITAL: todos os itens da sidebar ficam SEMPRE na viewport e
          TODA rota é `force-dynamic` + faz ida ao gateway (members/hub). O prefetch automático do
          Next disparava ~7 requisições RSC pesadas (incl. /estudio e /quarto) a CADA página numa
          réplica ÚNICA → tempestade de 502/ERR_HTTP2 e navegação lenta. Navegar passa a buscar sob
          demanda; o `loading.tsx` do grupo dá o esqueleto instantâneo no clique. */}
      <nav className="mt-8 flex flex-col gap-1.5">
        {NAV_ITEMS.map((item) => {
          const active = isNavActive(pathname, item.href, item.match)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={false}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex items-center gap-3 rounded-2xl border-2 px-4 py-3 transition-colors',
                '[font-family:var(--font-display)] font-bold text-sm uppercase tracking-wide',
                active
                  ? 'border-primary bg-(--kids-cyan-tint) text-primary'
                  : 'border-transparent text-muted-foreground hover:bg-muted/60 hover:text-foreground',
              )}
            >
              <Icon className="size-6" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {gamification ? (
        <div className="mt-auto pb-4">
          <StreakWidget gamification={gamification} />
        </div>
      ) : null}

      <div
        className={cn(
          'flex items-center gap-3 border-border border-t pt-4',
          !gamification && 'mt-auto',
        )}
      >
        <UserMenu
          user={user}
          gamification={gamification}
          avatarPhotoUrl={avatarPhotoUrl}
          direction="up"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-sm">{user.firstName || 'Aluno'}</p>
          {(() => {
            // Ranking/XP no lugar do e-mail do responsável (decisão 06/2026).
            const subtitle = profileMenuSubtitle(gamification, Boolean(user.activeProfile))
            return subtitle ? (
              <p className="truncate text-muted-foreground text-xs">{subtitle}</p>
            ) : null
          })()}
        </div>
      </div>
    </aside>
  )
}
