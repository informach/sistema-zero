'use client'

import { BrandLogo } from '@sistemazero/ui/brand-logo'
import { CircleHelp, Ellipsis, Home, Mail, Radio, Receipt, Trophy, User } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useId, useRef, useState } from 'react'
import { cn } from '@/lib/cn'
import type { SessionUserWithAvatar } from '@/lib/types'
import { isNavItemActive, NAV_ITEMS, type NavItem } from './nav'
import { UserMenu } from './user-menu'

// `prefetch={false}` PROPOSITAL em todos os links (mesmo motivo do kids): rotas `force-dynamic` +
// ida ao gateway numa réplica ÚNICA. O prefetch automático de todos os links do menu a cada página
// vira tempestade de RSC/gateway; a navegação busca sob demanda.

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
 */
export function CommunitySidebar({
  user,
  unread,
}: {
  user: SessionUserWithAvatar
  unread: number
}) {
  const pathname = usePathname() ?? ''
  const recadosActive = pathname === '/recados' || pathname.startsWith('/recados/')

  return (
    <aside className="sz-palco sticky top-0 z-30 hidden h-dvh w-[14.4rem] shrink-0 flex-col gap-1 border-(--linha-escura) border-r bg-(--topo) bg-none px-3 py-5 lg:flex">
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
        {NAV_ITEMS.map((item) => (
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
    <Link
      href={item.href}
      prefetch={false}
      aria-current={active ? 'page' : undefined}
      className={sidebarItemClass(active)}
    >
      <Icon className="size-6 shrink-0" aria-hidden />
      {item.label}
    </Link>
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

/** O que fica em "Mais": as rotas que não têm aba (e acendem "Mais" quando abertas). */
const MORE_LINKS = [
  { href: '/oficinas', label: 'Oficinas ao vivo', icon: Radio },
  { href: '/recados', label: 'Recados', icon: Mail },
  { href: '/progresso', label: 'Seu progresso', icon: Trophy },
  { href: '/ajuda', label: 'Ajuda', icon: CircleHelp, match: ['/como-fazer'] },
  { href: '/perfil', label: 'Meu perfil', icon: User },
  { href: '/meu-avatar', label: 'Meu avatar 3D', icon: User },
  { href: '/quarto', label: 'Meu espaço 3D', icon: Home },
  { href: '/compras', label: 'Compras e assinatura', icon: Receipt },
] as const

function inMore(pathname: string) {
  return MORE_LINKS.some((link) =>
    [link.href, ...('match' in link ? link.match : [])].some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    ),
  )
}

/**
 * As ABAS de baixo do celular (abaixo do `lg`): Início, Cursos, Criar, Comunidade e Mais. O botão
 * amarelo de cada tela fica ao alcance do polegar, e as abas têm 64 px de altura com ícone E texto.
 * "Mais" abre um painel com o resto (Oficinas, Recados, Seu progresso, Ajuda, perfil e compras):
 * botão com `aria-expanded`, Esc fecha e devolve o foco, clicar fora fecha.
 */
export function CommunityTabs({ unread }: { unread: number }) {
  const pathname = usePathname() ?? ''
  const [open, setOpen] = useState(false)
  const panelId = useId()
  const ref = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const tabs = TAB_HREFS.map((href) => NAV_ITEMS.find((item) => item.href === href)).filter(
    (item): item is NavItem => Boolean(item),
  )
  const moreActive = inMore(pathname)

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
      'flex min-h-[3.2rem] min-w-0 flex-col items-center justify-center gap-0.5 px-0.5 pt-1.5 pb-2 font-bold text-[clamp(0.75rem,4.2vw,0.85rem)] leading-tight no-underline',
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
        className="grid grid-cols-[1fr_1fr_1fr_1.6fr_1fr] border-(--linha-escura) border-t pb-[env(safe-area-inset-bottom)]"
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
        <div
          id={panelId}
          className="max-h-[70dvh] overflow-y-auto border-(--linha-escura) border-t px-3 pt-3 pb-2"
        >
          <p className="sz-kicker px-2 pb-2">Mais</p>
          <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2">
            {MORE_LINKS.map((link) => {
              const Icon = link.icon
              const active = [link.href, ...('match' in link ? link.match : [])].some(
                (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
              )
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    prefetch={false}
                    aria-current={active ? 'page' : undefined}
                    // O link da página atual não troca a rota: fecha o painel no clique.
                    onClick={() => setOpen(false)}
                    className={sidebarItemClass(active)}
                  >
                    <Icon className="size-6 shrink-0" aria-hidden />
                    {link.label}
                    {link.href === '/recados' ? <UnreadBadge count={unread} /> : null}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
