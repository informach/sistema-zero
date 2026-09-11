'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/cn'
import type { SessionUserWithAvatar } from '@/lib/types'
import { BrandLogo } from './brand-logo'
import { NAV_ITEMS } from './nav'
import { RecadosBell } from './recados-bell'
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

  // A barra do topo é a âncora escura do Pen (o adulto não tem menu lateral): fundo `--topo`,
  // item ativo na pílula da cor de ação, os outros claros sobre o escuro.
  return (
    <header className="sticky top-0 z-40 border-(--topo-borda) border-b bg-(--topo)">
      <div className="relative flex h-14 items-center justify-between gap-4 px-4 md:px-6">
        {/* `prefetch={false}` PROPOSITAL (mesmo motivo do kids): rotas `force-dynamic` + ida ao
            gateway numa réplica ÚNICA — o prefetch automático do Next de todos os links do header
            a cada página vira tempestade de RSC/gateway. Navegação passa a buscar sob demanda. */}
        <Link href="/" className="flex shrink-0 items-center" aria-label="Início" prefetch={false}>
          {/* A versão de letras claras, feita para fundo escuro, nos dois temas (no Pink o ZERO
              fica rosa). */}
          <BrandLogo fundo="escuro" className="block h-auto w-[130px] md:w-[150px]" />
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
                  'flex items-center gap-2 rounded-full px-4 py-2 text-sm transition-colors',
                  active
                    ? 'bg-primary font-semibold text-primary-foreground'
                    : 'text-(--topo-texto) hover:bg-(--topo-vidro) hover:text-white',
                )}
              >
                <Icon className={cn('size-4', !active && 'text-(--topo-icone)')} />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <RecadosBell />
          <UserMenu user={user} />
        </div>
      </div>

      {/* Nav compacto (mobile). `scrollbar-subtle`: a barra de rolagem clara do navegador ficava
          riscada sobre o fundo escuro; o item cortado na borda já mostra que a fileira rola. */}
      <nav className="scrollbar-subtle flex items-center gap-1 overflow-x-auto border-(--topo-borda) border-t px-4 py-1.5 md:hidden">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href, item.match)
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={false}
              className={cn(
                'whitespace-nowrap rounded-full px-3 py-1 text-sm transition-colors',
                active
                  ? 'bg-primary font-semibold text-primary-foreground'
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
