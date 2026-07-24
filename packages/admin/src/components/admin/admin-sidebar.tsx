'use client'

import { useModalA11y } from '@sistemazero/ui/use-modal-a11y'
import { Menu, X } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/cn'
import type { SessionUser } from '@/lib/types'
import { activeHref, visibleGroups } from './nav'
import {
  ensureProfessorCounts,
  type ProfessorCounts,
  useProfessorOverview,
} from './professor-counts-store'
import { ThemeToggle } from './theme-toggle'
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
 * Navegação do painel em SIDEBAR com grupos (Sala do Professor · Gestão ·
 * Configuração — ver `nav.ts`). Desktop (≥md): coluna fixa à esquerda. Mobile:
 * topbar fina (logo + hambúrguer) + drawer lateral com o mesmo conteúdo, que
 * fecha ao navegar. Substituiu a topbar plana (07/2026).
 */
export function AdminSidebar({ user }: { user: SessionUser }) {
  const pathname = usePathname()
  const [drawerOpen, setDrawerOpen] = useState(false)
  // UM store p/ as duas renderizações de NavGroups (desktop + drawer) — single-flight
  // + TTL no módulo; navegação revalida (no-op dentro do TTL).
  const overview = useProfessorOverview()
  const drawerRef = useModalA11y<HTMLDivElement>({
    open: drawerOpen,
    onClose: () => setDrawerOpen(false),
  })

  // Navegou → fecha o drawer (link do menu ou voltar do navegador) e revalida os
  // contadores (no-op dentro do TTL do store).
  // biome-ignore lint/correctness/useExhaustiveDependencies: pathname é o gatilho
  useEffect(() => {
    setDrawerOpen(false)
    void ensureProfessorCounts()
  }, [pathname])

  return (
    <>
      {/* Desktop: coluna fixa */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-border bg-background md:flex">
        <div className="flex h-14 shrink-0 items-center border-b border-border px-4">
          <Logo />
        </div>
        <NavGroups pathname={pathname} role={user.role} counts={overview?.counts} />
        <div className="flex shrink-0 items-center justify-between border-t border-border px-4 py-3">
          <ThemeToggle />
          <UserMenu user={user} dropdownSide="up" />
        </div>
      </aside>

      {/* Mobile: topbar fina */}
      <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur md:hidden">
        <button
          onClick={() => setDrawerOpen(true)}
          className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Abrir menu"
        >
          <Menu className="size-5" />
        </button>
        <Logo />
        <div className="ml-auto flex items-center gap-1">
          <ThemeToggle />
          <UserMenu user={user} />
        </div>
      </header>

      {/* Mobile: drawer lateral */}
      {drawerOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
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
            className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col border-r border-border bg-background shadow-xl outline-none"
          >
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
              <Logo />
              <button
                onClick={() => setDrawerOpen(false)}
                className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Fechar menu"
              >
                <X className="size-5" />
              </button>
            </div>
            <NavGroups pathname={pathname} role={user.role} counts={overview?.counts} />
          </div>
        </div>
      ) : null}
    </>
  )
}

function Logo() {
  return (
    <Link href="/admin" className="flex shrink-0 items-center gap-2">
      {/* Logo dual-theme (mesmos SVGs da referência/community): dark ⇄ light */}
      <Image
        src="/logo_dark.svg"
        width={515}
        height={75}
        alt="Sistema Zero"
        className="hidden h-auto w-[120px] dark:block"
        priority
      />
      <Image
        src="/logo_white.svg"
        width={515}
        height={72}
        alt="Sistema Zero"
        className="block h-auto w-[120px] dark:hidden"
        priority
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
  const groups = visibleGroups(role)
  const active = activeHref(pathname)

  return (
    <nav className="flex-1 overflow-y-auto px-3 py-4">
      {groups.map((group) => (
        <div key={group.id} className="mb-5 last:mb-0">
          <p className="mb-1.5 px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {group.label}
          </p>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const Icon = item.icon
              const isActive = active === item.href
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={isActive ? 'page' : undefined}
                    className={cn(
                      'flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm transition-colors',
                      isActive
                        ? 'bg-muted font-semibold text-foreground'
                        : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                    )}
                  >
                    <Icon className="size-4 shrink-0" />
                    {item.label}
                    {item.soon ? (
                      <span className="rounded bg-muted px-1 text-[10px] uppercase text-muted-foreground">
                        em breve
                      </span>
                    ) : null}
                    {(() => {
                      const count = item.badgeKey ? badgeCount(counts, item.badgeKey) : null
                      return count ? (
                        <>
                          <span
                            aria-hidden="true"
                            className="ml-auto rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold leading-none text-primary-foreground"
                          >
                            {count > 99 ? '99+' : count}
                          </span>
                          <span className="sr-only">
                            , {count} pendente{count === 1 ? '' : 's'}
                          </span>
                        </>
                      ) : null
                    })()}
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
