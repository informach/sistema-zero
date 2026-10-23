'use client'

import { saoPauloDayKey } from '@sistemazero/core/time'
import { UserAvatar } from '@sistemazero/member-shell/components/user-avatar'
import type { StudyGrantView } from '@sistemazero/member-shell/lib/study-access'
import { ArrowLeft, ArrowUpRight, CalendarDays, Monitor, Pencil, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { type KeyboardEvent, useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { StudyDeviceManager } from '@/components/kids/study-device-manager'
import { cn } from '@/lib/cn'
import { levelInfo } from '@/lib/level-info'
import { areaAdultaContinuarUrl } from '@/lib/links'
import { trackOnboardingEvent } from '@/lib/onboarding-telemetry'
import { profileAgeOn } from '@/lib/profile-age'
import { grantIsLive } from '@/lib/study-access-view'
import type { ProfileView } from '@/lib/types'
import { ChildProgress } from '../../_components/child-progress'
import { ParentShell } from '../../_components/parent-shell'
import { LevelChip, PRIMARY_ACTION, SECONDARY_ACTION } from '../../_components/parent-ui'
import {
  archiveProfile,
  RemoveProfileDialog,
  showProfileActionError,
} from '../../_components/remove-profile'
import { statsFor, useChildrenStats } from '../../_components/use-children-stats'
import { childEditHref, familyHref, studentEntryFor } from '../../parent-routes'

export type ChildTab = 'acesso' | 'progresso'

const TABS: { id: ChildTab; label: string; icon: typeof Monitor }[] = [
  { id: 'acesso', label: 'Acesso nos aparelhos', icon: Monitor },
  { id: 'progresso', label: 'Progresso', icon: Sparkles },
]

/**
 * A página de uma criança (11/10/2026): quem ela é, onde pode entrar e o que anda criando. Era o
 * painel que tomava o lugar da lista na área dos pais, sem endereço próprio.
 */
export function ChildClient({
  accountId,
  parentName,
  profile,
  photoUrl,
  initialTab,
  familyReady,
  studentDestination,
}: {
  accountId: string
  parentName?: string
  profile: ProfileView
  photoUrl: string | null
  initialTab: ChildTab
  /** O acesso da família já estava preparado ao abrir (o guia registra a primeira vez). */
  familyReady: boolean | null
  /** A aula do link que trouxe o responsável (`?aluno=`): abre depois da troca para a criança. */
  studentDestination?: string
}) {
  const [tab, setTab] = useState<ChildTab>(initialTab)
  const tabRefs = useRef<Record<ChildTab, HTMLButtonElement | null>>({
    acesso: null,
    progresso: null,
  })
  const studentEntry = studentEntryFor(studentDestination)
  const stats = useChildrenStats()
  const child = statsFor(stats, profile.id)
  const level = child?.career ? levelInfo(child.career.level) : null
  // O dia de São Paulo, igual no servidor e no navegador: a idade não muda na hidratação.
  const age = profileAgeOn(profile.birthDate, saoPauloDayKey())
  const [removing, setRemoving] = useState(false)
  const [archiving, setArchiving] = useState(false)
  /** O mesmo arquivamento do editor (com a mesma confirmação): a vaga do plano volta. */
  async function archive() {
    setArchiving(true)
    try {
      await archiveProfile(profile.id)
      window.location.assign('/pais')
    } catch (error) {
      showProfileActionError(error)
      setArchiving(false)
    }
  }
  const reported = useRef(familyReady !== false)
  const onGrants = useCallback((_profileId: string, grants: StudyGrantView[]) => {
    // A família não tinha nenhum acesso vivo e agora tem: é o passo que o guia dos pais espera.
    if (reported.current || !grants.some((grant) => grantIsLive(grant))) return
    reported.current = true
    trackOnboardingEvent({ audience: 'parent', action: 'access_prepared', step: 'access' })
  }, [])
  // O recado que o editor do perfil deixou no endereço (`?aviso=`): lido uma vez e apagado.
  useEffect(() => {
    const url = new URL(window.location.href)
    const aviso = url.searchParams.get('aviso')
    if (!aviso) return
    url.searchParams.delete('aviso')
    window.history.replaceState(window.history.state, '', url)
    if (aviso === 'fala-entrar') {
      const next = encodeURIComponent(childEditHref(profile.id))
      toast.info(
        `O perfil de ${profile.name} foi criado, ainda sem a fala. Ligar a fala pede um login recente: entre de novo e ligue em Editar perfil.`,
        {
          duration: 20_000,
          action: {
            label: 'Entrar de novo',
            onClick: () => window.location.assign(`/login/responsavel?next=${next}`),
          },
        },
      )
    } else if (aviso === 'fala-nao-gravou')
      toast.error(
        'Não consegui guardar a escolha da fala agora. Confira em Editar perfil daqui a pouco.',
        { duration: 20_000 },
      )
  }, [profile.id, profile.name])
  function choose(next: ChildTab) {
    setTab(next)
    // O endereço acompanha a aba (voltar e recarregar abrem a mesma), sem nova navegação.
    const url = new URL(window.location.href)
    if (next === 'progresso') url.searchParams.set('aba', 'progresso')
    else url.searchParams.delete('aba')
    window.history.replaceState(window.history.state, '', url)
  }
  /** O padrão de abas do ARIA: setas e Home/End andam entre as abas e já as abrem. */
  function onTabKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const last = TABS.length - 1
    const target =
      event.key === 'ArrowRight'
        ? index === last
          ? 0
          : index + 1
        : event.key === 'ArrowLeft'
          ? index === 0
            ? last
            : index - 1
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? last
              : null
    if (target === null) return
    event.preventDefault()
    const next = TABS[target] as (typeof TABS)[number]
    choose(next.id)
    tabRefs.current[next.id]?.focus()
  }
  const details = [
    age !== null ? (age === 1 ? '1 ano' : `${age} anos`) : null,
    profile.publicProfileEnabled ? 'perfil público' : 'perfil privado',
    // Falar em vez de escrever para a equipe (14/10/2026): só aparece quando os pais ligaram.
    profile.voiceInputEnabled === true ? 'fala liberada' : null,
  ].filter(Boolean)
  return (
    <ParentShell active="familia" parentName={parentName} studentDestination={studentEntry}>
      <Link
        href={familyHref(studentDestination)}
        className="-mb-4 inline-flex min-h-11 items-center gap-2 self-start font-bold text-muted-foreground text-sm hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" /> Família
      </Link>
      <section className="kids-carta flex flex-wrap items-center gap-5 p-6">
        <UserAvatar avatarUrl={photoUrl} firstName={profile.name} size="xl" />
        <div className="min-w-0 flex-1">
          <h1 className="sz-display break-words text-[2.25rem] leading-tight">{profile.name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {level ? (
              <LevelChip label={level.label} color={level.colorVar} icon={level.icon} />
            ) : null}
            <span className="text-muted-foreground text-sm">{details.join(' · ')}</span>
          </div>
        </div>
        <Link href={childEditHref(profile.id)} className={SECONDARY_ACTION}>
          <Pencil className="size-4" aria-hidden="true" /> Editar perfil
        </Link>
      </section>
      {age !== null && age >= 18 ? (
        // O perfil Kids não é cortado aos 18 (regra aprovada): ele segue funcionando, e a área
        // adulta passa a existir como caminho, com conta própria.
        <section aria-label="Aviso dos 18 anos" className="kids-carta flex flex-col gap-4 p-6">
          <p className="font-medium text-[0.9375rem]">
            {profile.name} fez 18 anos. O perfil Kids continua funcionando enquanto a sua assinatura
            estiver ativa, com os projetos que já estão aqui. Agora {profile.name} também pode ter
            uma conta própria na área adulta, que começa nova e usa o mesmo Estúdio.
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href={areaAdultaContinuarUrl('pais-perfil-18')}
              target="_blank"
              rel="noopener noreferrer"
              className={PRIMARY_ACTION}
            >
              Conhecer a área adulta <ArrowUpRight className="size-4" aria-hidden="true" />
            </a>
            <button type="button" className={SECONDARY_ACTION} onClick={() => setRemoving(true)}>
              Arquivar perfil
            </button>
          </div>
        </section>
      ) : null}
      {profile.birthDate ? null : (
        // A data é obrigatória desde 23/10/2026; os perfis criados antes podem não ter. O aviso
        // pede a data, sem bloquear a criança: o perfil continua funcionando até ela ser informada.
        <p className="flex flex-wrap items-center gap-x-2 rounded-2xl bg-[#fff3c4] px-4 py-2 text-sm text-[#5c3200]">
          <CalendarDays className="size-4 shrink-0" aria-hidden="true" />
          <span>
            Falta a data de nascimento de {profile.name}. Ela é obrigatória: mostra a idade para a
            equipe e faz a plataforma avisar você quando {profile.name} completar 18 anos.
          </span>
          <Link
            href={childEditHref(profile.id)}
            className="inline-flex min-h-11 items-center font-bold text-primary underline-offset-4 hover:underline"
          >
            Informar a data
          </Link>
        </p>
      )}
      {/* No celular as duas abas dividem a largura (o rótulo longo quebra dentro da aba, não a
          fileira); do `sm` em diante, a pílula de sempre. */}
      <div
        role="tablist"
        aria-label={`Sobre ${profile.name}`}
        className="-mt-4 grid grid-cols-2 gap-1 rounded-2xl bg-card p-1 sm:flex sm:self-start sm:rounded-full"
      >
        {TABS.map((item, index) => (
          <button
            key={item.id}
            ref={(node) => {
              tabRefs.current[item.id] = node
            }}
            type="button"
            role="tab"
            id={`tab-${item.id}`}
            aria-selected={tab === item.id}
            aria-controls={`painel-${item.id}`}
            tabIndex={tab === item.id ? 0 : -1}
            onClick={() => choose(item.id)}
            onKeyDown={(event) => onTabKey(event, index)}
            className={cn(
              'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 py-1.5 text-center font-bold text-sm leading-tight sm:rounded-full sm:px-5',
              tab === item.id ? 'kids-marca' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <item.icon className="size-4 shrink-0" aria-hidden="true" />
            {item.label}
          </button>
        ))}
      </div>
      {/* Os dois painéis ficam montados: trocar de aba não pode apagar o código gerado nem a
          espera de "a criança já entrou" do painel de aparelhos. */}
      <div
        role="tabpanel"
        id="painel-acesso"
        aria-labelledby="tab-acesso"
        hidden={tab !== 'acesso'}
      >
        <StudyDeviceManager
          profileId={profile.id}
          name={profile.name}
          accountId={accountId}
          onGrants={onGrants}
          studentDestination={studentEntry}
        />
      </div>
      <div
        role="tabpanel"
        id="painel-progresso"
        aria-labelledby="tab-progresso"
        hidden={tab !== 'progresso'}
      >
        <ChildProgress profileId={profile.id} stats={stats} />
      </div>
      <RemoveProfileDialog
        name={profile.name}
        open={removing}
        busy={archiving}
        onCancel={() => setRemoving(false)}
        onConfirm={() => void archive()}
      />
    </ParentShell>
  )
}
