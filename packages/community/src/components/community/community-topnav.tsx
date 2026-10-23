'use client'

import { isLessonPath } from '@sistemazero/member-shell/lib/lesson-path'
import { BrandLogo } from '@sistemazero/ui/brand-logo'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/cn'
import type { SessionUserWithAvatar } from '@/lib/types'
import { isNavItemActive, NAV_ITEMS } from './nav'
import { RecadosBell } from './recados-bell'
import { UserMenu } from './user-menu'

/**
 * A barra do topo, a âncora escura do Pen (direção de arte de 18/10/2026): logo, seis destinos com
 * ícone e texto, o botão Recados e o menu do perfil. Do `xl` para baixo o menu desce para uma
 * segunda linha que rola de lado, com alvos de 44 px.
 */
export function CommunityTopnav({ user }: { user: SessionUserWithAvatar }) {
  const pathname = usePathname() ?? ''
  if (isLessonPath(pathname)) return null

  // `prefetch={false}` PROPOSITAL (mesmo motivo do kids): rotas `force-dynamic` + ida ao gateway
  // numa réplica ÚNICA — o prefetch automático de todos os links da barra a cada página vira
  // tempestade de RSC/gateway. A navegação busca sob demanda.
  return (
    <header className="sticky top-0 z-40 bg-(--topo) text-(--topo-texto)">
      <div className="sz-page flex min-h-[4rem] items-center justify-between gap-4">
        <Link href="/" className="flex shrink-0 items-center" aria-label="Início" prefetch={false}>
          <BrandLogo
            fundo="escuro"
            label="Comunidade Sistema Zero"
            className="block h-auto w-[6.2rem] sm:w-[7.5rem]"
          />
        </Link>

        <nav aria-label="Principal" className="hidden items-stretch self-stretch xl:flex">
          {NAV_ITEMS.map((item) => {
            const active = isNavItemActive(item, pathname)
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={false}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-2 px-3.5 font-bold text-[0.9rem] transition-colors',
                  active
                    ? 'text-white shadow-[inset_0_-4px_0_var(--sz-community-action-light)]'
                    : 'text-(--topo-texto) hover:text-white',
                )}
              >
                <Icon className="size-5" aria-hidden />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-2.5">
          <RecadosBell />
          <UserMenu user={user} />
        </div>
      </div>

      <nav
        aria-label="Principal"
        className="scrollbar-subtle flex items-center gap-1 overflow-x-auto border-(--topo-borda) border-t px-3 py-1.5 xl:hidden"
      >
        {NAV_ITEMS.map((item) => {
          const active = isNavItemActive(item, pathname)
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={false}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'inline-flex min-h-[2.2rem] items-center whitespace-nowrap rounded-full px-3.5 font-bold text-[0.85rem] transition-colors',
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'text-(--topo-texto) hover:bg-(--topo-vidro) hover:text-white',
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
