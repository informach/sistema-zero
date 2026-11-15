'use client'

import { UserAvatar } from '@sistemazero/member-shell/components/user-avatar'
import {
  BookOpen,
  CalendarDays,
  House,
  KeyRound,
  LifeBuoy,
  LogOut,
  Menu,
  Receipt,
  Users,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { type ReactNode, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { FocusModeToggle } from '@/components/kids/focus-mode-toggle'
import { KidsLogo } from '@/components/kids/kids-logo'
import { ParentPasswordChange } from '@/components/kids/profile-management'
import { logoutAccount } from '@/components/kids/profiles-unavailable'
import { StudentAreaButton } from '@/components/kids/student-area-button'
import { apiGet } from '@/lib/api'
import { cn } from '@/lib/cn'
import type { ProfileView } from '@/lib/types'
import { childHref, PARENT_SECTIONS, type ParentSectionId } from '../parent-routes'

const ICONS: Record<ParentSectionId, typeof Users> = {
  inicio: House,
  familia: Users,
  cursos: BookOpen,
  oficinas: CalendarDays,
  conta: Receipt,
  ajuda: LifeBuoy,
}

/** Medidas do menu da criança (`AppSidebar`): item de 46px, canto de 12px. */
const ITEM =
  'flex h-[2.875rem] shrink-0 items-center gap-3.5 rounded-[0.75rem] px-3.5 font-semibold text-base transition-colors'

/**
 * Os filhos no menu, debaixo de Família. Cada página monta a sua moldura: ela mostra na hora a
 * última lista lida nesta aba e relê em seguida, para um filho criado ou arquivado aparecer (ou
 * sair) já na página seguinte. Falha na leitura mantém a lista que havia.
 */
let lastFamily: ProfileView[] | null = null
function useFamily(): ProfileView[] {
  const [profiles, setProfiles] = useState<ProfileView[]>(() => lastFamily ?? [])
  useEffect(() => {
    let alive = true
    apiGet<{ profiles?: ProfileView[] }>('/api/profiles')
      .then((body) => {
        lastFamily = body?.profiles ?? []
        if (alive) setProfiles(lastFamily)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])
  return profiles
}

function SectionLink({
  id,
  label,
  href,
  active,
  onNavigate,
}: {
  id: ParentSectionId
  label: string
  href: string
  active: boolean
  onNavigate?: () => void
}) {
  const Icon = ICONS[id]
  return (
    <Link
      href={href}
      prefetch={false}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      className={cn(ITEM, active ? 'kids-marca' : 'hover:bg-(--menu-vidro) hover:text-white')}
    >
      <Icon
        className={cn('size-5 shrink-0', !active && 'text-(--menu-icone)')}
        strokeWidth={1.75}
        aria-hidden
      />
      {label}
    </Link>
  )
}

function MenuSections({
  active,
  activeChildId,
  family,
  onNavigate,
}: {
  active: ParentSectionId | null
  activeChildId?: string
  family: ProfileView[]
  onNavigate?: () => void
}) {
  return PARENT_SECTIONS.map((section) => (
    <div key={section.id} className="flex flex-col gap-1">
      <SectionLink
        id={section.id}
        label={section.label}
        href={section.href}
        active={section.id === active && !activeChildId}
        onNavigate={onNavigate}
      />
      {section.id === 'familia' && family.length ? (
        <ul className="flex flex-col gap-0.5 pl-6">
          {family.map((child) => (
            <li key={child.id}>
              <Link
                href={childHref(child.id)}
                prefetch={false}
                onClick={onNavigate}
                aria-current={child.id === activeChildId ? 'page' : undefined}
                className={cn(
                  'flex min-h-10 items-center gap-2.5 rounded-[0.625rem] px-3 font-semibold text-sm transition-colors',
                  child.id === activeChildId
                    ? 'bg-(--menu-vidro) text-white'
                    : 'hover:bg-(--menu-vidro) hover:text-white',
                )}
              >
                <UserAvatar firstName={child.name} avatarUrl={null} size="sm" />
                <span className="truncate">{child.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  ))
}

/** As quatro seções da barra de baixo do celular; o resto mora em "Mais". */
const MOBILE_TABS: readonly ParentSectionId[] = ['inicio', 'familia', 'cursos', 'oficinas']
const MOBILE_LABELS: Partial<Record<ParentSectionId, string>> = {
  cursos: 'Cursos',
  oficinas: 'Oficinas',
}

/**
 * A moldura de TODAS as páginas da área dos pais. Redesenho de 14/11/2026: menu lateral escuro,
 * como o da área da criança, com Início, Família (e os filhos), Cursos para pais, Oficinas ao
 * vivo, Conta e Ajuda; no pé, a troca segura para a criança, a senha e o sair. No celular, uma
 * barra no alto (logo e "Área da criança") e uma embaixo (Início, Família, Cursos, Oficinas e
 * Mais). `variant="lesson"` deixa a aula dos cursos para pais no regime da aula da criança.
 */
export function ParentShell({
  active,
  activeChildId,
  parentName,
  studentDestination,
  variant = 'page',
  semAreaDaCrianca = false,
  children,
}: {
  /** A parte acesa no menu; `null` nas páginas que não são de uma parte só. */
  active: ParentSectionId | null
  /** Na página de um filho, o nome dele acende debaixo de Família. */
  activeChildId?: string
  parentName?: string
  /** A entrada da criança com o `next` de uma aula, quando o responsável chegou por um link dela. */
  studentDestination?: string
  variant?: 'page' | 'lesson'
  /**
   * Quem comprou só um curso para pais (`parentPurpose === 'curso'`, decidido no servidor pelo
   * Início e pela Família): sem filho cadastrado, não há área da criança para abrir.
   */
  semAreaDaCrianca?: boolean
  children: ReactNode
}) {
  const [password, setPassword] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const family = useFamily()
  async function leave() {
    setLeaving(true)
    try {
      await logoutAccount()
    } catch {
      toast.error('Não foi possível sair agora. Verifique a conexão e tente novamente.')
      setLeaving(false)
    }
  }
  const name = parentName ?? 'Responsável'
  const accountActions = (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={() => {
          setMoreOpen(false)
          setPassword(true)
        }}
        className={cn(ITEM, 'hover:bg-(--menu-vidro) hover:text-white')}
      >
        <KeyRound className="size-5 shrink-0 text-(--menu-icone)" strokeWidth={1.75} aria-hidden />
        Trocar senha
      </button>
      <button
        type="button"
        disabled={leaving}
        onClick={() => void leave()}
        className={cn(ITEM, 'hover:bg-(--menu-vidro) hover:text-white disabled:opacity-60')}
      >
        <LogOut className="size-5 shrink-0 text-(--menu-icone)" strokeWidth={1.75} aria-hidden />
        {leaving ? 'Saindo…' : 'Sair'}
      </button>
    </div>
  )
  return (
    <div className="kids-shell-row flex min-h-dvh bg-(--band-creme)">
      <aside
        aria-label="Menu da área dos pais"
        className="kids-menu sticky top-0 hidden h-screen min-h-0 w-(--kids-menu-width) shrink-0 flex-col border-(--menu-2) border-r bg-(--menu) px-5 text-(--menu-texto) md:flex"
      >
        <Link
          href="/pais"
          prefetch={false}
          aria-label="Área dos pais, início"
          className="mt-6 flex h-10 shrink-0 items-center px-2"
        >
          <KidsLogo fundo="escuro" />
        </Link>
        <span className="mt-2 px-2 font-extrabold text-(--menu-icone) text-[0.6875rem] uppercase tracking-[0.16em]">
          Área dos pais
        </span>
        <nav
          aria-label="Área dos pais"
          className="mt-5 flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto overscroll-contain"
        >
          <MenuSections active={active} activeChildId={activeChildId} family={family} />
        </nav>
        <div className="flex shrink-0 flex-col gap-3 pt-4 pb-7">
          {semAreaDaCrianca ? null : (
            <StudentAreaButton
              destination={studentDestination}
              disabled={leaving}
              className="sz-btn-gradient h-12 w-full gap-2 px-4 text-[0.9375rem]"
            />
          )}
          <div className="flex flex-col gap-1 rounded-[0.875rem] bg-(--menu-2) p-2">
            <div className="flex items-center gap-2.5 px-2 py-1.5">
              <UserAvatar firstName={name} avatarUrl={null} size="sm" />
              <span className="flex min-w-0 flex-col leading-tight">
                <strong className="truncate text-white">{name}</strong>
                <span className="text-(--menu-icone) text-xs">Responsável</span>
              </span>
            </div>
            {accountActions}
          </div>
        </div>
      </aside>
      {/* Na aula, a alça que abre e fecha a lista de aulas (começa fechada, como na aula da
          criança). Fora do `FocusModeProvider` ela não aparece. */}
      {variant === 'lesson' ? <FocusModeToggle target="outline" /> : null}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Celular: a logo e a troca para a criança no alto; as seções na barra de baixo. */}
        <header className="sticky top-0 z-30 flex items-center gap-2 border-(--linha-carta) border-b bg-card px-3 py-2.5 md:hidden">
          <Link href="/pais" prefetch={false} aria-label="Área dos pais, início">
            <KidsLogo className="w-24" />
          </Link>
          {semAreaDaCrianca ? null : (
            <StudentAreaButton
              destination={studentDestination}
              disabled={leaving}
              shortLabel="Área da criança"
              className="sz-btn-gradient ml-auto h-10 gap-1.5 px-3.5 text-sm"
            />
          )}
        </header>
        {variant === 'lesson' ? (
          <main
            id="main-content"
            tabIndex={-1}
            className="kids-aula w-full flex-1 px-4 pt-6 pb-40 md:px-8 md:pt-8 md:pb-32"
          >
            {children}
          </main>
        ) : (
          <main
            id="main-content"
            className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-4 pt-8 pb-28 sm:px-6 sm:pt-10 md:pb-12"
          >
            {children}
          </main>
        )}
        {variant === 'lesson' ? null : (
          <nav
            aria-label="Seções da área dos pais"
            className="fixed inset-x-0 bottom-0 z-40 flex border-(--linha-carta) border-t bg-card px-1 pt-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] md:hidden"
          >
            {MOBILE_TABS.map((id) => {
              const section = PARENT_SECTIONS.find((item) => item.id === id)
              if (!section) return null
              const Icon = ICONS[id]
              const isActive = id === active
              return (
                <Link
                  key={id}
                  href={section.href}
                  prefetch={false}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 font-extrabold text-[0.6875rem]',
                    isActive ? 'text-primary' : 'text-muted-foreground',
                  )}
                >
                  <Icon className="size-[1.375rem]" strokeWidth={1.9} aria-hidden />
                  {MOBILE_LABELS[id] ?? section.label}
                </Link>
              )
            })}
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              aria-expanded={moreOpen}
              className={cn(
                'flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 font-extrabold text-[0.6875rem]',
                active === 'conta' || active === 'ajuda' ? 'text-primary' : 'text-muted-foreground',
              )}
            >
              <Menu className="size-[1.375rem]" strokeWidth={1.9} aria-hidden />
              Mais
            </button>
          </nav>
        )}
      </div>

      {moreOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Mais opções da área dos pais"
          className="kids-menu fixed inset-0 z-50 flex flex-col gap-3 overflow-y-auto bg-(--menu) px-4 pt-5 pb-6 text-(--menu-texto) md:hidden"
        >
          <div className="flex items-center justify-between">
            <KidsLogo fundo="escuro" className="w-36" />
            <button
              type="button"
              onClick={() => setMoreOpen(false)}
              aria-label="Fechar o menu"
              className="flex size-11 items-center justify-center rounded-full bg-(--menu-2) text-white"
            >
              <X className="size-5" aria-hidden />
            </button>
          </div>
          <div className="flex items-center gap-2.5 px-2 py-2">
            <UserAvatar firstName={name} avatarUrl={null} size="sm" />
            <strong className="text-white">{name}</strong>
          </div>
          <nav aria-label="Mais" className="flex flex-col gap-1">
            <MenuSections
              active={active}
              activeChildId={activeChildId}
              family={family}
              onNavigate={() => setMoreOpen(false)}
            />
          </nav>
          {accountActions}
        </div>
      ) : null}
      {password ? <ParentPasswordChange onCancel={() => setPassword(false)} /> : null}
    </div>
  )
}
