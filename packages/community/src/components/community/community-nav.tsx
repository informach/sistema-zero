'use client'

import { ArquipelagoNavLink } from '@sistemazero/member-shell/components/arquipelago-nav-link'
import { BrandLogo } from '@sistemazero/ui/brand-logo'
import { Ellipsis, Mail, Palette, PersonStanding, Receipt, Sofa, Trophy } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { type CSSProperties, useEffect, useId, useRef, useState } from 'react'
import { cn } from '@/lib/cn'
import type { SessionUserWithAvatar } from '@/lib/types'
import { isNavItemActive, NAV_ITEMS, type NavItem, visibleCommunityNav } from './nav'
import { UserMenu } from './user-menu'

// `prefetch={false}` PROPOSITAL em todos os links (mesmo motivo do kids): rotas `force-dynamic` +
// ida ao gateway numa réplica ÚNICA. O prefetch automático de todos os links do menu a cada página
// vira tempestade de RSC/gateway; a navegação busca sob demanda.

/** O id do menu lateral (a alça aponta para ele) e a largura dele, que a alça acompanha. */
export const COMMUNITY_SIDEBAR_ID = 'community-sidebar'
export const COMMUNITY_SIDEBAR_WIDTH = '14.4rem'

function unreadLabel(count: number) {
  return count > 0 ? `Recados, ${count} ${count === 1 ? 'novo' : 'novos'}` : 'Recados'
}

function UnreadBadge({ count }: { count: number }) {
  if (count <= 0) return null
  return (
    <span
      aria-hidden
      className="ml-auto inline-grid h-[1.4rem] min-w-[1.4rem] place-items-center rounded-full bg-(--cta) px-1.5 font-bold text-(--cta-tinta) text-[0.85rem]"
    >
      {count > 9 ? '9+' : count}
    </span>
  )
}

/**
 * O MENU LATERAL do "Estúdio à noite" (25/10/2026), do `lg` para cima: a logo, os seis destinos com
 * ícone E texto, Recados com o selo de não lidos e, no pé, o cartão da pessoa (foto com o anel da
 * etapa, nome e etapa), que abre o menu do perfil. O item da página atual ganha a carta escura e a
 * barra amarela à esquerda, além do `aria-current`.
 *
 * `collapsed` (27/10/2026): nas telas de foco o menu recolhe (a alça mora no `CommunityFrame`). A
 * coluna encolhe até zero enquanto o conteúdo, de largura fixa, desliza junto para fora da tela:
 * sem `overflow-hidden`, porque o menu do perfil abre mais largo que a coluna.
 */
export function CommunitySidebar({
  user,
  unread,
  collapsed = false,
  arquipelagoLiberado = false,
}: {
  user: SessionUserWithAvatar
  unread: number
  collapsed?: boolean
  arquipelagoLiberado?: boolean
}) {
  const pathname = usePathname() ?? ''
  const recadosActive = pathname === '/recados' || pathname.startsWith('/recados/')

  return (
    <aside
      id={COMMUNITY_SIDEBAR_ID}
      inert={collapsed}
      aria-hidden={collapsed || undefined}
      className={cn(
        'sticky top-0 z-30 hidden h-dvh shrink-0 transition-[width] duration-300 ease-in-out motion-reduce:transition-none lg:block',
        collapsed ? 'w-0' : 'w-(--sz-menu-width)',
      )}
      style={{ '--sz-menu-width': COMMUNITY_SIDEBAR_WIDTH } as CSSProperties}
    >
      <div
        className={cn(
          'sz-palco flex h-full w-(--sz-menu-width) flex-col gap-1 border-(--linha-escura) border-r bg-(--topo) bg-none px-3 py-5 transition-[translate,opacity] duration-300 ease-in-out motion-reduce:transition-none',
          collapsed ? '-translate-x-full opacity-0' : 'translate-x-0 opacity-100',
        )}
      >
        <Link
          href="/"
          prefetch={false}
          aria-label="Início"
          className="mb-4 flex items-center rounded-[0.6rem] px-3 py-1"
        >
          <BrandLogo
            fundo="escuro"
            instancia="menu"
            label="Comunidade Sistema Zero"
            className="block h-auto w-[8rem]"
          />
        </Link>
        {/* Só a lista rola numa janela baixa: o cartão da pessoa fica sempre à vista no pé. */}
        <nav aria-label="Principal" className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
          {visibleCommunityNav(NAV_ITEMS, arquipelagoLiberado).map((item) => (
            <SidebarLink key={item.href} item={item} active={isNavItemActive(item, pathname)} />
          ))}
          <span aria-hidden className="mx-2 my-2.5 h-px bg-(--linha-escura)" />
          <Link
            href="/recados"
            prefetch={false}
            aria-current={recadosActive ? 'page' : undefined}
            aria-label={unreadLabel(unread)}
            className={sidebarItemClass(recadosActive)}
          >
            <Mail className="size-6 shrink-0" aria-hidden />
            Recados
            <UnreadBadge count={unread} />
          </Link>
        </nav>
        <div className="shrink-0 pt-4">
          <UserMenu user={user} variant="card" />
        </div>
      </div>
    </aside>
  )
}

function sidebarItemClass(active: boolean) {
  return cn(
    'flex min-h-[2.8rem] items-center gap-3.5 rounded-[0.7rem] px-3.5 font-bold text-[0.95rem] no-underline transition-colors',
    active
      ? 'bg-(--carta) text-(--texto-claro) shadow-[inset_4px_0_0_var(--cta)]'
      : 'text-(--texto-claro-2) hover:bg-(--carta) hover:text-(--texto-claro)',
  )
}

function SidebarLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon
  return (
    <ArquipelagoNavLink
      href={item.href}
      aria-current={active ? 'page' : undefined}
      className={sidebarItemClass(active)}
    >
      <Icon className="size-6 shrink-0" aria-hidden />
      {item.label}
    </ArquipelagoNavLink>
  )
}

/**
 * A barra do topo do celular e do tablet (abaixo do `lg`): a logo, Recados (ícone com o selo) e a
 * foto que abre o menu do perfil. A navegação mora nas abas de baixo. `compact` é a sala ao vivo:
 * a mesma barra em toda largura, sem menu lateral nem abas, porque a sala desenha a própria barra
 * fixa embaixo.
 */
export function CommunityTopBar({
  user,
  unread,
  compact = false,
}: {
  user: SessionUserWithAvatar
  unread: number
  compact?: boolean
}) {
  const pathname = usePathname() ?? ''
  const recadosActive = pathname === '/recados' || pathname.startsWith('/recados/')
  return (
    <header
      className={cn(
        'sz-palco sticky top-0 z-40 border-(--linha-escura) border-b bg-(--topo) bg-none',
        !compact && 'lg:hidden',
      )}
    >
      <div className="flex min-h-[3.4rem] items-center justify-between gap-3 px-4">
        <Link href="/" prefetch={false} aria-label="Início" className="flex shrink-0 items-center">
          <BrandLogo
            fundo="escuro"
            label="Comunidade Sistema Zero"
            className="block h-auto w-[6.4rem]"
          />
        </Link>
        <div className="flex shrink-0 items-center gap-2.5">
          <Link
            href="/recados"
            prefetch={false}
            aria-current={recadosActive ? 'page' : undefined}
            aria-label={unreadLabel(unread)}
            className={cn(
              'relative inline-flex h-[2.4rem] items-center gap-2 rounded-[0.6rem] bg-(--carta) px-3 font-bold text-(--texto-claro) text-[0.9rem]',
              recadosActive && 'shadow-[inset_0_0_0_2px_var(--cta)]',
            )}
          >
            <Mail className="size-5" aria-hidden />
            <span className={compact ? 'hidden sm:inline' : 'sr-only'}>Recados</span>
            {unread > 0 ? (
              <span
                aria-hidden
                className="inline-grid h-[1.3rem] min-w-[1.3rem] place-items-center rounded-full bg-(--cta) px-1 font-bold text-(--cta-tinta) text-[0.85rem]"
              >
                {unread > 9 ? '9+' : unread}
              </span>
            ) : null}
          </Link>
          <UserMenu user={user} />
        </div>
      </div>
    </header>
  )
}

/** As quatro abas fixas do celular; o resto mora em "Mais". */
const TAB_HREFS = ['/', '/cursos', '/criar', '/comunidade'] as const

function navItem(href: string): NavItem {
  const item = NAV_ITEMS.find((candidate) => candidate.href === href)
  if (!item) throw new Error(`Item de navegação ausente: ${href}`)
  return item
}

/**
 * O que fica em "Mais": as rotas que não têm aba (e acendem "Mais" quando abertas). Oficinas e
 * Ajuda vêm do `NAV_ITEMS` (os mesmos prefixos do menu lateral); só o rótulo muda.
 */
const MORE_LINKS: readonly NavItem[] = [
  { ...navItem('/oficinas'), label: 'Oficinas ao vivo' },
  navItem('/arquipelago'),
  { href: '/recados', label: 'Recados', icon: Mail },
  { href: '/progresso', label: 'Seu progresso', icon: Trophy },
  navItem('/ajuda'),
  { href: '/perfil', label: 'Meu perfil', icon: Palette },
  { href: '/meu-avatar', label: 'Meu avatar 3D', icon: PersonStanding },
  { href: '/quarto', label: 'Meu espaço 3D', icon: Sofa },
  { href: '/compras', label: 'Compras e assinatura', icon: Receipt },
]

function inMore(pathname: string, links: readonly NavItem[]) {
  return links.some((link) => isNavItemActive(link, pathname))
}

/**
 * As ABAS de baixo do celular (abaixo do `lg`): Início, Cursos, Criar, Comunidade e Mais. O botão
 * amarelo de cada tela fica ao alcance do polegar, e as abas têm 64 px de altura com ícone E texto.
 * "Mais" abre um painel com o resto (Oficinas, Recados, Seu progresso, Ajuda, perfil e compras):
 * botão com `aria-expanded`, Esc fecha e devolve o foco, clicar fora fecha.
 */
export function CommunityTabs({
  unread,
  arquipelagoLiberado = false,
}: {
  unread: number
  arquipelagoLiberado?: boolean
}) {
  const pathname = usePathname() ?? ''
  const [open, setOpen] = useState(false)
  const panelId = useId()
  const ref = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const tabs = TAB_HREFS.map((href) => NAV_ITEMS.find((item) => item.href === href)).filter(
    (item): item is NavItem => Boolean(item),
  )
  const moreLinks = visibleCommunityNav(MORE_LINKS, arquipelagoLiberado)
  const moreActive = inMore(pathname, moreLinks)

  // Trocar de página fecha o painel.
  // biome-ignore lint/correctness/useExhaustiveDependencies: o efeito reage SÓ à troca de rota.
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!open) return
    const onClick = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setOpen(false)
      trigger.current?.focus()
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const tabClass = (active: boolean) =>
    cn(
      'flex min-h-[3.2rem] min-w-0 flex-col items-center justify-center gap-0.5 pt-1.5 pb-2 font-bold text-[0.85rem] leading-tight no-underline',
      active ? 'text-(--cta)' : 'text-(--legenda-clara) hover:text-(--texto-claro)',
    )

  // ⚠️ A ordem no DOM é abas → painel (o leitor de tela chega ao "Mais" e logo depois ao que ele
  // abriu); o `flex-col-reverse` só desenha o painel por cima das abas.
  return (
    <div
      ref={ref}
      className="sz-palco fixed inset-x-0 bottom-0 z-40 flex flex-col-reverse bg-(--topo) bg-none lg:hidden"
      // Como no menu do perfil: só fecha quando o foco VAI para fora (Tab); o clique fora já fecha
      // pelo `mousedown`.
      onBlur={(event) => {
        const next = event.relatedTarget as Node | null
        if (open && next && !ref.current?.contains(next)) setOpen(false)
      }}
    >
      <nav
        aria-label="Principal"
        className="grid grid-cols-[1fr_1fr_1fr_1.85fr_1fr] border-(--linha-escura) border-t pb-[env(safe-area-inset-bottom)]"
      >
        {tabs.map((item) => {
          const Icon = item.icon
          const current = isNavItemActive(item, pathname)
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={false}
              aria-current={current ? 'page' : undefined}
              // Com o painel aberto, o destaque passa para "Mais"; a página atual segue anunciada.
              // A aba da página atual não troca a rota: fecha o painel no clique.
              onClick={() => setOpen(false)}
              className={tabClass(current && !open)}
            >
              <Icon className="size-6" aria-hidden />
              {item.label}
            </Link>
          )
        })}
        <button
          ref={trigger}
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((value) => !value)}
          className={cn(tabClass(open || moreActive), 'relative')}
        >
          <span className="relative">
            <Ellipsis className="size-6" aria-hidden />
            {unread > 0 ? (
              <span
                aria-hidden
                className="absolute -top-1 -right-2 size-3 rounded-full bg-(--cta) ring-2 ring-(--topo)"
              />
            ) : null}
          </span>
          Mais
          {unread > 0 ? <span className="sr-only">, {unreadLabel(unread)}</span> : null}
        </button>
      </nav>
      {open ? (
        <nav
          id={panelId}
          aria-labelledby={`${panelId}-titulo`}
          className="max-h-[70dvh] overflow-y-auto border-(--linha-escura) border-t px-3 pt-3 pb-2"
        >
          <p id={`${panelId}-titulo`} className="sz-kicker px-2 pb-2">
            Mais
          </p>
          <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2">
            {moreLinks.map((link) => {
              const Icon = link.icon
              const active = isNavItemActive(link, pathname)
              return (
                <li key={link.href}>
                  <ArquipelagoNavLink
                    href={link.href}
                    aria-current={active ? 'page' : undefined}
                    // O link da página atual não troca a rota: fecha o painel no clique.
                    onClick={() => setOpen(false)}
                    className={sidebarItemClass(active)}
                  >
                    <Icon className="size-6 shrink-0" aria-hidden />
                    {link.label}
                    {link.href === '/recados' ? <UnreadBadge count={unread} /> : null}
                  </ArquipelagoNavLink>
                </li>
              )
            })}
          </ul>
        </nav>
      ) : null}
    </div>
  )
}
