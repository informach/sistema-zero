'use client'

import { Badge } from '@sistemazero/ui/badge'
import { Button, buttonVariants } from '@sistemazero/ui/button'
import { Skeleton } from '@sistemazero/ui/skeleton'
import { Tabs } from '@sistemazero/ui/tabs'
import {
  CalendarDays,
  CalendarX2,
  CircleCheck,
  Clapperboard,
  Clock3,
  DoorOpen,
  Radio,
} from 'lucide-react'
import { useState } from 'react'
import { AdminHeader } from '@/components/admin/admin-header'
import { EmptyState } from '@/components/admin/empty-state'
import {
  AGENDA_STATE_LABEL,
  type AgendaGroups,
  type AgendaItem,
  type AgendaState,
  agendaActionLabel,
  agendaWhen,
  agendaZoneNote,
  roomHref,
} from '@/lib/live-agenda'
import { useLiveAgenda } from './use-live-agenda'

export const STATE_BADGE: Record<
  AgendaState,
  { variant: 'success' | 'muted' | 'destructive' | 'default' | 'outline'; icon: typeof Radio }
> = {
  live: { variant: 'success', icon: Radio },
  lobby: { variant: 'success', icon: DoorOpen },
  'in-time': { variant: 'default', icon: Clock3 },
  scheduled: { variant: 'default', icon: CalendarDays },
  ended: { variant: 'muted', icon: CircleCheck },
  cancelled: { variant: 'outline', icon: CalendarX2 },
  missed: { variant: 'destructive', icon: CalendarX2 },
}

const GROUPS: { key: keyof AgendaGroups; title: string; empty: string }[] = [
  { key: 'today', title: 'Hoje', empty: 'Nenhum encontro hoje.' },
  { key: 'upcoming', title: 'Próximos', empty: 'Nenhum encontro marcado depois de hoje.' },
  { key: 'past', title: 'Encerrados', empty: 'Nenhum encontro encerrado ainda.' },
]

/**
 * A agenda de quem conduz (Turma → Encontros): os encontros das turmas em que a pessoa conduz,
 * em abas Hoje, Próximos e Encerrados. ⚠️ O link para a sala é `<a href>` de propósito: a sala
 * precisa de navegação completa (ver `roomHref`).
 */
export function LiveAgenda() {
  const { data, groups, error, loadingMore, retry, loadMore } = useLiveAgenda()
  const [chosen, setChosen] = useState<keyof AgendaGroups | null>(null)
  // Sem escolha de quem olha, a aba abre onde há o que fazer: Hoje, ou Próximos se hoje está livre.
  const tab: keyof AgendaGroups =
    chosen ??
    (groups && groups.today.length === 0 && groups.upcoming.length > 0 ? 'upcoming' : 'today')
  const current = GROUPS.find((group) => group.key === tab) ?? GROUPS[0]!
  return (
    <div className="space-y-6">
      <AdminHeader
        title="Encontros"
        description="Os encontros das turmas que você conduz. A sala abre daqui, e a gravação fica pronta para revisar depois."
      />
      {error ? (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-[15px]"
        >
          <p>{error}</p>
          <Button variant="outline" className="min-h-11 px-4" onClick={retry}>
            Tentar de novo
          </Button>
        </div>
      ) : null}
      {!groups && !error ? (
        <div className="space-y-2" role="status" aria-label="Carregando a agenda">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : null}
      {groups && data?.sessions.length === 0 ? (
        <div className="rounded-[18px] border border-border bg-card">
          <EmptyState
            zappy="happy"
            title="Você ainda não conduz nenhuma turma."
            description="Quem administra as oficinas escolhe quem conduz cada turma em Oficinas."
          />
        </div>
      ) : null}
      {groups && data && data.sessions.length > 0 ? (
        <div className="space-y-4">
          <Tabs
            value={tab}
            onChange={(value) => setChosen(value as keyof AgendaGroups)}
            items={GROUPS.map((group) => ({
              value: group.key,
              label: group.title,
              badge: groups[group.key].length,
            }))}
          />
          <p className="text-sm text-muted-foreground">
            Cada horário aparece no fuso da turma. Quando ele for diferente do seu, o encontro
            avisa.
          </p>
          <section
            role="tabpanel"
            aria-label={current.title}
            className="space-y-3"
            data-agenda-group={current.key}
          >
            {groups[current.key].length === 0 ? (
              <p className="text-[15px] text-muted-foreground">{current.empty}</p>
            ) : (
              <ul className="space-y-2">
                {groups[current.key].map((item) => (
                  <AgendaRow key={item.session.id} item={item} group={current.key} />
                ))}
              </ul>
            )}
          </section>
        </div>
      ) : null}
      {data?.nextCursor ? (
        <Button
          variant="outline"
          className="min-h-11 px-4"
          disabled={loadingMore}
          onClick={() => void loadMore()}
        >
          {loadingMore ? 'Carregando…' : 'Carregar mais turmas'}
        </Button>
      ) : null}
    </div>
  )
}

function AgendaRow({ item, group }: { item: AgendaItem; group: keyof AgendaGroups }) {
  const badge = STATE_BADGE[item.state]
  const Icon = badge.icon
  const timeZone = item.cohort?.timeZone ?? 'America/Sao_Paulo'
  const highlight = item.state === 'live' || item.state === 'lobby'
  const zone = agendaZoneNote(item.cohort?.timeZone)
  return (
    <li
      data-session={item.session.id}
      className={`flex flex-col gap-3 rounded-[18px] border bg-card p-5 sm:flex-row sm:items-center ${highlight ? 'border-primary' : 'border-border'}`}
    >
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={badge.variant}>
            <Icon className="size-3.5" aria-hidden />
            {AGENDA_STATE_LABEL[item.state]}
          </Badge>
          {item.recordingPublished ? (
            <Badge variant="outline">
              <Clapperboard className="size-3.5" aria-hidden />
              Gravação publicada
            </Badge>
          ) : null}
        </div>
        <h3 className="truncate font-bold">{item.session.title}</h3>
        <p className="text-sm text-muted-foreground">
          {item.cohort?.title ?? 'Turma'} · Encontro {item.session.order + 1}
        </p>
        <p className="flex items-center gap-1.5 text-sm">
          <CalendarDays className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          {agendaWhen(item.startsAt, item.endsAt, timeZone)}
        </p>
        {zone ? <p className="text-xs text-muted-foreground">{zone}</p> : null}
      </div>
      <a
        href={roomHref(item.session.id)}
        className={`${buttonVariants({ variant: highlight ? 'default' : 'outline' })} min-h-11 shrink-0 px-4`}
      >
        {agendaActionLabel(item, group)}
      </a>
    </li>
  )
}
