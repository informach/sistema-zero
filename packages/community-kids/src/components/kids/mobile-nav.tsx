'use client'

import type { CreativeToolId } from '@sistemazero/core/career'
import { useModalA11y } from '@sistemazero/ui/use-modal-a11y'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/cn'
import type { GamificationMeView, SessionUserWithAvatar } from '@/lib/types'
import { KidsLogo } from './kids-logo'
import {
  isNavActive,
  MOBILE_NAV_ITEMS,
  type NavChild,
  type NavItem,
  navMatch,
  visibleChildren,
} from './nav'
import { RecadosBell } from './recados-bell'
import { StreakWidget } from './streak-widget'
import { UserMenu } from './user-menu'

/**
 * Top bar do mobile: logo + streak/XP compactos + menu do avatar (tema/sair
 * acessíveis fora do desktop). `gamification` é best-effort (`null` esconde).
 * Escura como o menu do desktop (a âncora do Pen, 11/09/2026): no celular é ela que faz
 * o papel do menu, então a página continua com um fundo só e a âncora em cima.
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
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-2 border-(--menu-2) border-b bg-(--menu) px-3 text-(--menu-texto) md:hidden">
      {/* `shrink-0`: sem ele o bloco da direita espremia o logo e o selo "kids" escapava
          por baixo dos números (medido a 375px: logo em 104px para um conteúdo de 150). */}
      <Link href="/" aria-label="Início" className="flex shrink-0 items-center" prefetch={false}>
        <KidsLogo fundo="escuro" />
      </Link>
      <div className="flex min-w-0 items-center gap-2">
        {gamification ? <StreakWidget gamification={gamification} compact /> : null}
        <RecadosBell />
        <UserMenu user={user} gamification={gamification} avatarPhotoUrl={avatarPhotoUrl} />
      </div>
    </header>
  )
}

/**
 * A gaveta da aba: os mesmos destinos do accordion do desktop, no gesto que o celular
 * já usa. `useModalA11y` dá o foco preso, o Esc, a devolução do foco para a aba e o
 * lock de rolagem refcontado (o mesmo das celebrações).
 */
function NavDrawer({
  item,
  filhos,
  pathname,
  onClose,
}: {
  item: NavItem
  filhos: NavChild[]
  pathname: string
  onClose: () => void
}) {
  const cardRef = useModalA11y<HTMLDivElement>({ open: true, onClose })
  return (
    <div className="fixed inset-0 z-40 md:hidden">
      {/* O véu fecha no toque fora, como nas modais da casa. */}
      <button
        type="button"
        aria-label="Fechar"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-label={item.label}
        tabIndex={-1}
        // Acima da barra de abas (que é `fixed` e tem a área segura do aparelho).
        className="absolute inset-x-0 bottom-0 mb-[calc(3.5rem+env(safe-area-inset-bottom))] rounded-t-[1.25rem] bg-(--menu) px-3 pt-3 pb-4 outline-none"
      >
        <p className="px-3 pb-2 font-extrabold text-(--menu-texto) text-xs uppercase tracking-[0.12em]">
          {item.label}
        </p>
        <ul className="flex flex-col gap-1">
          {filhos.map((child) => {
            const ChildIcon = child.icon
            const active = isNavActive(pathname, child.href)
            return (
              <li key={child.href}>
                <Link
                  href={child.href}
                  prefetch={false}
                  onClick={onClose}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex min-h-12 items-center gap-3 rounded-[0.75rem] px-3 font-semibold text-base transition-colors',
                    active ? 'kids-marca' : 'text-(--menu-texto)',
                  )}
                >
                  <ChildIcon
                    className={cn('size-5 shrink-0', !active && 'text-(--menu-icone)')}
                    strokeWidth={1.75}
                    aria-hidden
                  />
                  {child.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

/**
 * Tab bar inferior do mobile (estilo Duolingo): 5 abas grandes ícone + label
 * (07/2026 — eram os 9 itens da sidebar, alvos minúsculos p/ mãos pequenas;
 * o resto vive no hub "Criar"). Mesmo desenho do menu do desktop (telas-modelo de
 * 11/09/2026): escura, ícone de TRAÇO, e a aba ativa numa pílula na cor de ação atrás
 * do ícone, com o rótulo na ação clara (a de sobre o escuro: a cor de ação crua dava
 * 3,2:1 no navy).
 */
export function MobileTabbar({ tools = null }: { tools?: CreativeToolId[] | null }) {
  const pathname = usePathname()
  // A gaveta aberta (a aba com destinos por dentro). Fecha ao navegar: no celular a
  // página nova já é a resposta do toque.
  const [gaveta, setGaveta] = useState<string | null>(null)
  // biome-ignore lint/correctness/useExhaustiveDependencies: navegar fecha a gaveta
  useEffect(() => setGaveta(null), [pathname])
  const aberta = MOBILE_NAV_ITEMS.find((item) => item.href === gaveta) ?? null
  const filhosAbertos = aberta ? visibleChildren(aberta, tools) : []

  return (
    <>
      {aberta && filhosAbertos.length ? (
        <NavDrawer
          item={aberta}
          filhos={filhosAbertos}
          pathname={pathname}
          onClose={() => setGaveta(null)}
        />
      ) : null}
      <nav
        aria-label="Navegação principal"
        className="fixed inset-x-0 bottom-0 z-40 flex items-stretch justify-around border-(--menu-2) border-t bg-(--menu) pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        {/* `prefetch={false}`: mesmo motivo da sidebar — rotas `force-dynamic` + gateway numa réplica
          única não aguentam o prefetch de todos os itens a cada página (tempestade de 502/ERR_HTTP2). */}
        {MOBILE_NAV_ITEMS.map((item) => {
          const filhos = visibleChildren(item, tools)
          const active = isNavActive(pathname, item.href, navMatch(item))
          const Icon = item.icon
          const conteudo = (
            <>
              <span
                aria-hidden="true"
                className={cn(
                  'grid h-8 w-12 place-items-center rounded-full transition-colors',
                  active && 'kids-marca',
                )}
              >
                <Icon className="size-5" />
              </span>
              <span className="font-bold text-[0.68rem]">{item.label}</span>
            </>
          )
          const classe = cn(
            'flex min-h-14 flex-1 flex-col items-center justify-center gap-1 py-1.5 transition-colors',
            active ? 'text-(--pen-acao-clara)' : 'text-(--menu-texto)',
          )
          // Aba com destinos por dentro abre a GAVETA, como o accordion do desktop: a
          // criança alcança o Pinta sem passar pela página do Criar.
          if (filhos.length)
            return (
              <button
                key={item.href}
                type="button"
                onClick={() => setGaveta(gaveta === item.href ? null : item.href)}
                aria-expanded={gaveta === item.href}
                aria-current={active ? 'page' : undefined}
                className={classe}
              >
                {conteudo}
              </button>
            )
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={false}
              aria-current={active ? 'page' : undefined}
              className={classe}
            >
              {conteudo}
            </Link>
          )
        })}
      </nav>
    </>
  )
}
