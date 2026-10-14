'use client'

import { UserAvatar } from '@sistemazero/member-shell/components/user-avatar'
import {
  CalendarDays,
  ChevronDown,
  KeyRound,
  LifeBuoy,
  LogOut,
  Receipt,
  Sparkles,
  Users,
} from 'lucide-react'
import Link from 'next/link'
import { type ReactNode, useState } from 'react'
import { toast } from 'sonner'
import { KidsLogo } from '@/components/kids/kids-logo'
import { ParentPasswordChange } from '@/components/kids/profile-management'
import { logoutAccount } from '@/components/kids/profiles-unavailable'
import { StudentAreaButton } from '@/components/kids/student-area-button'
import { PARENT_SECTIONS, type ParentSectionId } from '../parent-routes'
import { HEADER_ACTION } from './parent-actions'
import { OptionsMenu } from './parent-ui'

const ICONS: Record<ParentSectionId, typeof Users> = {
  familia: Users,
  acompanhamento: Sparkles,
  oficinas: CalendarDays,
  conta: Receipt,
  ajuda: LifeBuoy,
}

const TAB =
  'inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full px-4 font-bold text-muted-foreground text-sm transition-colors hover:bg-(--band-ceu) hover:text-foreground aria-[current=page]:bg-(--band-ceu) aria-[current=page]:text-primary'

function SectionLinks({ active }: { active: ParentSectionId | null }) {
  return PARENT_SECTIONS.map((section) => {
    const Icon = ICONS[section.id]
    return (
      <Link
        key={section.id}
        href={section.href}
        aria-current={section.id === active ? 'page' : undefined}
        className={TAB}
      >
        <Icon className="size-4" aria-hidden="true" />
        {section.label}
      </Link>
    )
  })
}

/**
 * A moldura de TODAS as páginas da área dos pais (11/10/2026): a barra com a logo, as quatro
 * seções (Família, Acompanhamento, Conta, Ajuda), a troca segura para a criança e o menu da
 * conta. Antes cada página tinha um jeito de voltar, e a ajuda do acesso saía da área sem volta.
 * No celular as seções descem para uma fileira que rola de lado, abaixo da barra.
 */
export function ParentShell({
  active,
  parentName,
  studentDestination,
  children,
}: {
  /** A seção acesa na barra; `null` nas páginas que não são de uma seção só. */
  active: ParentSectionId | null
  parentName?: string
  /** A entrada da criança com o `next` de uma fase, quando o responsável chegou por um link dela. */
  studentDestination?: string
  children: ReactNode
}) {
  const [password, setPassword] = useState(false)
  const [leaving, setLeaving] = useState(false)
  async function leave() {
    setLeaving(true)
    try {
      await logoutAccount()
    } catch {
      toast.error('Não foi possível sair agora. Verifique a conexão e tente novamente.')
      setLeaving(false)
    }
  }
  return (
    <div className="flex min-h-dvh flex-col bg-(--band-creme)">
      <header className="sticky top-0 z-30 border-(--linha-carta) border-b bg-card">
        {/* No celular a linha é apertada (logo, "Área da criança" e o menu da conta em 320px):
            logo, vãos e o botão encolhem abaixo de 640px. Medido numa moldura de 320 e 360px. */}
        <div className="mx-auto flex w-full max-w-6xl items-center gap-2 px-3 py-2.5 sm:gap-3 sm:px-6">
          <Link href="/pais" aria-label="Área dos pais, início" className="shrink-0">
            <KidsLogo className="w-24 sm:w-36" />
          </Link>
          <span className="hidden h-7 w-px bg-(--linha-carta) sm:block" aria-hidden="true" />
          <span className="hidden whitespace-nowrap font-extrabold text-muted-foreground text-xs uppercase tracking-[0.14em] sm:block">
            Área dos pais
          </span>
          <nav aria-label="Área dos pais" className="ml-4 hidden items-center gap-1 xl:flex">
            <SectionLinks active={active} />
          </nav>
          <div className="ml-auto flex items-center gap-1 sm:gap-1.5">
            <StudentAreaButton
              destination={studentDestination}
              disabled={leaving}
              shortLabel="Área da criança"
              className={HEADER_ACTION}
            />
            <OptionsMenu
              label="Sua conta"
              triggerClassName="gap-0.5 pr-1 pl-0.5 sm:gap-1 sm:pr-2 sm:pl-1"
              trigger={
                <>
                  <UserAvatar firstName={parentName ?? 'Responsável'} avatarUrl={null} size="sm" />
                  <ChevronDown className="size-4 max-[359px]:hidden" aria-hidden="true" />
                </>
              }
              items={[
                { label: 'Conta e compras', href: '/pais/conta', icon: Receipt },
                { label: 'Trocar senha', icon: KeyRound, onSelect: () => setPassword(true) },
                {
                  label: leaving ? 'Saindo…' : 'Sair',
                  icon: LogOut,
                  disabled: leaving,
                  onSelect: () => void leave(),
                },
              ]}
            />
          </div>
        </div>
        <nav
          aria-label="Área dos pais"
          className="flex gap-1 overflow-x-auto border-(--linha-carta) border-t px-3 py-1.5 xl:hidden"
        >
          <SectionLinks active={active} />
        </nav>
      </header>
      <main
        id="main-content"
        className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-4 py-8 sm:px-6 sm:py-10"
      >
        {children}
      </main>
      {password ? <ParentPasswordChange onCancel={() => setPassword(false)} /> : null}
    </div>
  )
}
