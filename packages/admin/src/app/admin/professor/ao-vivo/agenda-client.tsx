'use client'

import type { LiveCatalogView, LiveCohort } from '@sistemazero/core/live'
import { liveRequest } from '@sistemazero/member-shell/lib/live/client'
import { Badge } from '@sistemazero/ui/badge'
import { Button, buttonVariants } from '@sistemazero/ui/button'
import { Card } from '@sistemazero/ui/card'
import { Skeleton } from '@sistemazero/ui/skeleton'
import {
  CalendarDays,
  CalendarX2,
  CircleCheck,
  Clapperboard,
  Clock3,
  DoorOpen,
  Radio,
} from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { AdminHeader } from '@/components/admin/admin-header'
import {
  AGENDA_STATE_LABEL,
  type AgendaGroups,
  type AgendaItem,
  type AgendaState,
  agendaActionLabel,
  agendaWhen,
  groupLiveAgenda,
  roomHref,
} from '@/lib/live-agenda'

const STATE_BADGE: Record<
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

const merge = <T extends { id: string }>(previous: T[], next: T[]) => [
  ...new Map([...previous, ...next].map((item) => [item.id, item])).values(),
]

/**
 * A agenda da professora na Sala do Professor: os encontros das turmas em que ela conduz,
 * agrupados em Hoje, Próximos e Encerrados. ⚠️ O link para a sala é `<a href>` de propósito:
 * a sala precisa de navegação completa (ver `roomHref`).
 */
export function LiveAgenda() {
  const [data, setData] = useState<LiveCatalogView | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [reload, setReload] = useState(0)
  const [now, setNow] = useState(() => Date.now())
  // biome-ignore lint/correctness/useExhaustiveDependencies: "Tentar novamente" invalida a agenda.
  useEffect(() => {
    const controller = new AbortController()
    setError(null)
    liveRequest<LiveCatalogView>('/api/live/catalog?limit=50', undefined, 'GET', controller.signal)
      .then((next) => {
        setData(next)
        setNow(Date.now())
      })
      .catch((cause) => {
        if (!controller.signal.aborted)
          setError(cause instanceof Error ? cause.message : 'Não foi possível abrir a agenda.')
      })
    return () => controller.abort()
  }, [reload])
  // Um encontro passa de "Próximos" para "Hoje" (e de "Hoje" para "Encerrados") sem recarregar.
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(timer)
  }, [])
  const loadMore = useCallback(async () => {
    if (!data?.nextCursor || loadingMore) return
    setLoadingMore(true)
    try {
      const next = await liveRequest<LiveCatalogView>(
        `/api/live/catalog?limit=50&cursor=${encodeURIComponent(data.nextCursor)}`,
      )
      setData((previous) =>
        previous
          ? {
              ...next,
              programs: merge(previous.programs, next.programs),
              cohorts: merge(previous.cohorts, next.cohorts),
              sessions: merge(previous.sessions, next.sessions),
              enrollments: merge(previous.enrollments, next.enrollments),
            }
          : next,
      )
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível carregar mais encontros.')
    } finally {
      setLoadingMore(false)
    }
  }, [data?.nextCursor, loadingMore])
  const groups = data ? groupLiveAgenda(data.sessions, data.cohorts, now) : null
  return (
    <div className="space-y-6">
      <AdminHeader
        title="Ao vivo"
        description="Os encontros das turmas que você conduz. Abra a sala para receber a turma e revise a gravação depois."
        action={
          <Link
            href="/admin/oficinas"
            className={`${buttonVariants({ variant: 'outline' })} min-h-11 px-4`}
          >
            Oficinas ao vivo
          </Link>
        }
      />
      {error ? (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm"
        >
          <p>{error}</p>
          <Button
            variant="outline"
            className="min-h-11 px-4"
            onClick={() => setReload((value) => value + 1)}
          >
            Tentar novamente
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
        <Card className="space-y-2 p-6 text-sm">
          <CalendarDays className="size-6 text-muted-foreground" aria-hidden />
          <p className="font-medium">Você ainda não conduz nenhuma turma.</p>
          <p className="text-muted-foreground">
            Quem administra as oficinas escolhe as professoras de cada turma em Oficinas ao vivo.
          </p>
        </Card>
      ) : null}
      {groups && data && data.sessions.length > 0
        ? GROUPS.map((group) => (
            <section
              key={group.key}
              aria-labelledby={`agenda-${group.key}`}
              className="space-y-3"
              data-agenda-group={group.key}
            >
              <h2 id={`agenda-${group.key}`} className="text-lg font-semibold">
                {group.title}{' '}
                <span className="text-sm font-normal text-muted-foreground">
                  ({groups[group.key].length})
                </span>
              </h2>
              {groups[group.key].length === 0 ? (
                <p className="text-sm text-muted-foreground">{group.empty}</p>
              ) : (
                <ul className="space-y-2">
                  {groups[group.key].map((item) => (
                    <AgendaRow key={item.session.id} item={item} group={group.key} />
                  ))}
                </ul>
              )}
            </section>
          ))
        : null}
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

function zoneNote(cohort: LiveCohort | undefined) {
  const local = Intl.DateTimeFormat().resolvedOptions().timeZone
  return cohort && cohort.timeZone !== local ? ` (fuso da turma: ${cohort.timeZone})` : ''
}

function AgendaRow({ item, group }: { item: AgendaItem; group: keyof AgendaGroups }) {
  const badge = STATE_BADGE[item.state]
  const Icon = badge.icon
  const timeZone = item.cohort?.timeZone ?? 'America/Sao_Paulo'
  const highlight = item.state === 'live' || item.state === 'lobby'
  return (
    <li
      data-session={item.session.id}
      className={`flex flex-col gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-center ${highlight ? 'border-primary' : 'border-border'}`}
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
        <h3 className="truncate font-semibold">{item.session.title}</h3>
        <p className="text-sm text-muted-foreground">
          {item.cohort?.title ?? 'Turma'} · Encontro {item.session.order + 1}
        </p>
        <p className="flex items-center gap-1.5 text-sm">
          <CalendarDays className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          {agendaWhen(item.startsAt, item.endsAt, timeZone)}
          {zoneNote(item.cohort)}
        </p>
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
