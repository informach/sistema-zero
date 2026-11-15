'use client'

import { UserAvatar } from '@sistemazero/member-shell/components/user-avatar'
import type { StudyGrantView } from '@sistemazero/member-shell/lib/study-access'
import { Skeleton } from '@sistemazero/ui/skeleton'
import { ChevronRight, Flame, Medal, Monitor, Pencil, Plus, Star } from 'lucide-react'
import Link from 'next/link'
import { levelInfo } from '@/lib/level-info'
import type { ChildDashboardView, ProfileView } from '@/lib/types'
import { ChildAccessStatus } from '../child-access-status'
import { childEditHref, childHref, NEW_CHILD_HREF } from '../parent-routes'
import { LevelChip, OptionsMenu, PRIMARY_ACTION, SECONDARY_ACTION, StatTile } from './parent-ui'
import { type ChildrenStats, statsFor, weekSentence } from './use-children-stats'

function Numbers({ child, stats }: { child: ChildDashboardView | null; stats: ChildrenStats }) {
  if (stats.state === 'loading')
    return (
      <div className="grid grid-cols-3 gap-2" aria-hidden="true">
        {[0, 1, 2].map((index) => (
          <Skeleton key={index} className="h-[3.9rem] rounded-2xl" />
        ))}
      </div>
    )
  if (!child) return null
  return (
    <div className="grid grid-cols-3 gap-2">
      <StatTile
        icon={Flame}
        value={child.streak.current}
        label="dias seguidos"
        color="var(--sz-hot)"
      />
      <StatTile
        icon={Star}
        value={child.xp.toLocaleString('pt-BR')}
        label="XP"
        color="var(--primary)"
      />
      <StatTile
        icon={Medal}
        value={child.badgesCount}
        label="medalhas"
        color="var(--kids-ouro-texto)"
      />
    </div>
  )
}

/**
 * Uma linha por filho no Início (redesenho de 14/11/2026): nome, nível, a frase da semana e os
 * números, levando à página dele.
 */
export function ChildSummaryRow({
  profile,
  photoUrl,
  stats,
  studentDestination,
}: {
  profile: ProfileView
  photoUrl: string | null
  stats: ChildrenStats
  studentDestination?: string
}) {
  const child = statsFor(stats, profile.id)
  const level = child?.career ? levelInfo(child.career.level) : null
  const week = weekSentence(child)
  return (
    <li className="border-(--linha-carta) border-t first:border-t-0">
      <Link
        href={childHref(profile.id, undefined, studentDestination)}
        className="flex items-center gap-4 py-4 text-foreground"
      >
        <UserAvatar avatarUrl={photoUrl} firstName={profile.name} size="lg" />
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="flex flex-wrap items-center gap-2">
            <strong className="sz-display text-xl leading-tight">{profile.name}</strong>
            {level ? (
              <LevelChip label={level.label} color={level.colorVar} icon={level.icon} />
            ) : null}
          </span>
          {stats.state === 'ready' && child ? (
            <span className="text-muted-foreground text-sm">
              {week ? `Esta semana: ${week}` : 'Nenhuma atividade esta semana ainda.'}
            </span>
          ) : null}
        </span>
        <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
      </Link>
    </li>
  )
}

/** O cartão de um filho na Família: quem é, se pode entrar e como foi a semana. */
export function ChildCard({
  profile,
  photoUrl,
  grants,
  stats,
  studentDestination,
}: {
  profile: ProfileView
  photoUrl: string | null
  grants: StudyGrantView[] | null | undefined
  stats: ChildrenStats
  /** A aula do link que trouxe o responsável: segue para a página da criança. */
  studentDestination?: string
}) {
  const child = statsFor(stats, profile.id)
  const level = child?.career ? levelInfo(child.career.level) : null
  const week = weekSentence(child)
  return (
    <li className="kids-carta flex flex-col gap-5 p-5 sm:p-6">
      <div className="flex items-start gap-4">
        <UserAvatar avatarUrl={photoUrl} firstName={profile.name} size="xl" />
        <div className="min-w-0 flex-1 pt-1">
          <h3 className="sz-display break-words text-2xl leading-tight">{profile.name}</h3>
          {level ? (
            <div className="mt-1.5">
              <LevelChip label={level.label} color={level.colorVar} icon={level.icon} />
            </div>
          ) : null}
        </div>
        <OptionsMenu
          label={`Mais opções de ${profile.name}`}
          items={[{ label: 'Editar perfil', href: childEditHref(profile.id), icon: Pencil }]}
        />
      </div>
      <ChildAccessStatus grants={grants} />
      <Numbers child={child} stats={stats} />
      {stats.state === 'ready' && child ? (
        <p className="text-muted-foreground text-sm">
          <strong className="text-foreground">Esta semana:</strong>{' '}
          {week ?? 'nenhuma atividade ainda. Que tal criar junto?'}
        </p>
      ) : null}
      <div className="mt-auto flex flex-col gap-2">
        <Link
          href={childHref(profile.id, undefined, studentDestination)}
          className={PRIMARY_ACTION}
        >
          Ver a página de {profile.name}
          <ChevronRight className="size-4" aria-hidden="true" />
        </Link>
        <Link
          href={childHref(profile.id, 'aparelhos', studentDestination)}
          data-access-for={profile.id}
          className={SECONDARY_ACTION}
        >
          <Monitor className="size-4" aria-hidden="true" />
          Acesso nos aparelhos
        </Link>
      </div>
    </li>
  )
}

/** O lugar de mais uma criança, dentro da grade (o limite do plano mora nele). */
export function AddChildCard({ note }: { note?: string }) {
  return (
    <li className="flex">
      <Link
        href={NEW_CHILD_HREF}
        className="flex min-h-64 w-full flex-col items-center justify-center gap-3 rounded-(--raio-carta) border-2 border-(--linha-carta) border-dashed p-6 text-center text-muted-foreground transition-colors hover:border-primary hover:text-primary"
      >
        <span className="flex size-14 items-center justify-center rounded-full bg-card">
          <Plus className="size-6" aria-hidden="true" />
        </span>
        <span className="font-extrabold text-foreground">Adicionar filho(a)</span>
        {note ? <span className="text-sm">{note}</span> : null}
      </Link>
    </li>
  )
}
