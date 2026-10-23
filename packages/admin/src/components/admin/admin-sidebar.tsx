'use client'

import { BrandLogo } from '@sistemazero/ui/brand-logo'
import type { ConsoleAppLink } from '@sistemazero/ui/console-apps'
import { useModalA11y } from '@sistemazero/ui/use-modal-a11y'
import { Menu, X } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/cn'
import { roleLabel, type SessionUser } from '@/lib/types'
import { activeHref, hrefForPlatform, visibleGroups } from './nav'
import { usePlatform } from './platform-provider'
import { PlatformSwitcher } from './platform-switcher'
import {
  ensureProfessorCounts,
  type ProfessorCounts,
  useProfessorOverview,
} from './professor-counts-store'
import { UserMenu } from './user-menu'

/** Chave do chip → número (moderação soma fila de aprovação + denúncias abertas). */
function badgeCount(counts: ProfessorCounts | undefined, key: string): number | null {
  if (!counts) return null
  if (key === 'entregas') return counts.pendingSubmissions
  if (key === 'recados') return counts.unreadThreads
  if (key === 'moderacao') {
    if (counts.moderationPending === null && counts.openReports === null) return null
    return (counts.moderationPending ?? 0) + (counts.openReports ?? 0)
  }
  return null
}

/**
 * O menu da sala da equipe (23/10/2026): a coluna na noite da Comunidade dos Criadores, a lente
 * das comunidades no topo e as três áreas (Turma, Conteúdo e Negócio, ver `nav.ts`). Desktop
 * (≥md): coluna fixa à esquerda. Mobile: barra fina (logo + hambúrguer) + gaveta lateral com o
 * mesmo conteúdo, que fecha ao navegar.
 */
export function AdminSidebar({
  user,
  apps,
}: {
  user: SessionUser
  apps?: readonly ConsoleAppLink[]
}) {
  const pathname = usePathname()
  const [drawerOpen, setDrawerOpen] = useState(false)
  // UM store p/ as duas renderizações de NavGroups (desktop + gaveta): single-flight
  // + TTL no módulo; navegação revalida (no-op dentro do TTL).
  const overview = useProfessorOverview()
  const drawerRef = useModalA11y<HTMLDivElement>({
    open: drawerOpen,
    onClose: () => setDrawerOpen(false),
  })

  // Navegou → fecha a gaveta (link do menu ou voltar do navegador) e revalida os
  // contadores (no-op dentro do TTL do store).
  // biome-ignore lint/correctness/useExhaustiveDependencies: pathname é o gatilho
  useEffect(() => {
    setDrawerOpen(false)
    void ensureProfessorCounts()
  }, [pathname])

  return (
    <>
      {/* Desktop: coluna fixa */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col bg-menu text-menu-text md:flex">
        <div className="flex h-16 shrink-0 items-center px-5">
          <Logo />
        </div>
        <PlatformSwitcher />
        <NavGroups pathname={pathname} role={user.role} counts={overview?.counts} />
        <AccountFooter user={user} apps={apps} />
      </aside>

      {/* Mobile: barra fina */}
      <header className="sticky top-0 z-40 flex h-14 items-center gap-3 bg-menu px-4 text-menu-text md:hidden">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="flex size-10 items-center justify-center rounded-xl bg-menu-2 text-menu-text transition-colors hover:text-white"
          aria-label="Abrir menu"
        >
          <Menu className="size-5" />
        </button>
        <Logo />
        <div className="ml-auto flex items-center gap-1">
          <UserMenu
            user={user}
            apps={apps}
            roleLabel={roleLabel(user.role)}
            triggerClassName={AVATAR_CLASS}
          />
        </div>
      </header>

      {/* Mobile: gaveta lateral */}
      {drawerOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label="Fechar menu"
            onClick={() => setDrawerOpen(false)}
          />
          <div
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Menu de navegação"
            tabIndex={-1}
            className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-menu text-menu-text shadow-xl outline-none"
          >
            <div className="flex h-14 shrink-0 items-center justify-between px-4">
              <Logo />
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="flex size-10 items-center justify-center rounded-xl bg-menu-2 text-menu-text transition-colors hover:text-white"
                aria-label="Fechar menu"
              >
                <X className="size-5" />
              </button>
            </div>
            <PlatformSwitcher />
            <NavGroups pathname={pathname} role={user.role} counts={overview?.counts} />
          </div>
        </div>
      ) : null}
    </>
  )
}

/** O avatar sobre o menu escuro: o amarelo do Zappy, a mesma marca da lente Kids. */
const AVATAR_CLASS =
  'flex size-9 items-center justify-center rounded-full bg-sun text-sm font-bold text-lens-kids-ink transition-transform hover:scale-105'

function AccountFooter({ user, apps }: { user: SessionUser; apps?: readonly ConsoleAppLink[] }) {
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email
  return (
    <div className="flex shrink-0 items-center gap-3 border-t border-menu-2 px-4 py-3">
      <UserMenu
        user={user}
        apps={apps}
        dropdownSide="up"
        dropdownAlign="left"
        roleLabel={roleLabel(user.role)}
        triggerClassName={AVATAR_CLASS}
      />
      <div className="min-w-0">
        <p className="truncate text-sm font-bold text-white">{name}</p>
        <p className="truncate text-xs text-menu-icon">{roleLabel(user.role)}</p>
      </div>
    </div>
  )
}

function Logo() {
  return (
    <Link href="/admin/professor" className="flex shrink-0 items-center gap-2">
      {/* A logo oficial (a MESMA da comunidade), na versão para fundo escuro: o menu é a noite
          da Comunidade dos Criadores. O ZERO lê `--logo-zero-escuro-*` do chassi console. */}
      <BrandLogo
        fundo="escuro"
        label="Sistema Zero, ir para Hoje"
        className="block h-auto w-[140px]"
      />
    </Link>
  )
}

function NavGroups({
  pathname,
  role,
  counts,
}: {
  pathname: string
  role: string
  counts?: ProfessorCounts
}) {
  const platform = usePlatform()
  const groups = visibleGroups(role)
  const active = activeHref(pathname)

  return (
    <nav
      aria-label="Menu principal"
      className="console-menu-scrollbar flex-1 overflow-y-auto px-3 pt-2 pb-4"
    >
      {groups.map((group) => (
        <div key={group.id} className="mb-4 last:mb-0">
          <p className="mb-1.5 px-2.5 pt-2 font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-menu-icon">
            {group.label}
          </p>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const Icon = item.icon
              const isActive = active === item.href
              const count = item.badgeKey ? badgeCount(counts, item.badgeKey) : null
              return (
                <li key={item.href}>
                  <Link
                    href={hrefForPlatform(item, platform)}
                    aria-current={isActive ? 'page' : undefined}
                    className={cn(
                      'flex min-h-10 items-center gap-2.5 rounded-xl px-2.5 text-[15px] font-semibold transition-colors',
                      isActive
                        ? 'bg-primary text-white shadow-[0_3px_0_#0a2a7a]'
                        : 'text-menu-text hover:bg-menu-2 hover:text-white',
                    )}
                  >
                    <Icon
                      className={cn(
                        'size-[18px] shrink-0',
                        isActive ? 'text-white' : 'text-menu-icon',
                      )}
                      aria-hidden
                    />
                    {item.label}
                    {item.soon ? (
                      <span className="rounded bg-menu-2 px-1 text-[10px] uppercase text-menu-text">
                        em breve
                      </span>
                    ) : null}
                    {count ? (
                      <>
                        <span
                          aria-hidden="true"
                          className="ml-auto rounded-full bg-sun px-1.5 py-0.5 font-mono text-[11px] font-bold leading-none text-lens-kids-ink"
                        >
                          {count > 99 ? '99+' : count}
                        </span>
                        <span className="sr-only">, {count} esperando a equipe</span>
                      </>
                    ) : null}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </nav>
  )
}
