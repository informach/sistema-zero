'use client'

import type { LiveCatalogView, LiveCohort, LiveSessionSummary } from '@sistemazero/core/live'
import { Button } from '@sistemazero/ui'
import { ArrowRight, CalendarDays, Clock3, Headphones, Laptop, Users } from 'lucide-react'
import { type ReactNode, useEffect, useState } from 'react'
import { liveDate, liveRequest } from '../../lib/live/client'
import {
  countdown,
  durationLabel,
  friendlyDay,
  friendlyWhen,
  type LiveScheduleState,
  liveScheduleState,
} from '../../lib/live/schedule'
import { LiveParentReservations } from './live-parent-reservations'

function teacherOf(cohort?: LiveCohort): string | null {
  if (!cohort?.teacherNames) return null
  for (const id of cohort.teacherIds) if (cohort.teacherNames[id]) return cohort.teacherNames[id]!
  return null
}

function sortByStart(a: LiveSessionSummary, b: LiveSessionSummary) {
  return (
    Date.parse(a.occurrenceStartsAt ?? a.startsAt) - Date.parse(b.occurrenceStartsAt ?? b.startsAt)
  )
}

const STATE_LABEL: Record<LiveScheduleState, string> = {
  live: 'Ao vivo agora',
  soon: 'A sala está abrindo',
  today: 'Hoje',
  upcoming: 'Em breve',
  ended: 'Já aconteceu',
  cancelled: 'Cancelado',
  expired: 'Prazo encerrado',
}

/**
 * A agenda das oficinas ao vivo (redesenho do full review de 14/10/2026). Quem desenha o
 * cabeçalho é a página (Kids e área dos pais), com as peças de cada área.
 */
export function LiveCatalog({
  mode = 'learner',
  empty,
  prepareHref,
}: {
  mode?: 'learner' | 'parent' | 'teacher'
  /** Estado vazio da área (com o Zappy, no Kids). */
  empty?: ReactNode
  /** Área dos pais: onde se prepara o acesso da criança no computador. */
  prepareHref?: string
}) {
  const [data, setData] = useState<LiveCatalogView | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [reload, setReload] = useState(0)
  const endpoint = mode === 'parent' ? '/api/parents/live/enrollments' : '/api/live/catalog'
  // biome-ignore lint/correctness/useExhaustiveDependencies: Retry and profile assignment explicitly invalidate this catalog.
  useEffect(() => {
    const controller = new AbortController()
    setError(null)
    liveRequest<LiveCatalogView>(endpoint, undefined, 'GET', controller.signal)
      .then(setData)
      .catch((cause) => {
        if (!controller.signal.aborted) setError(cause.message)
      })
    return () => controller.abort()
  }, [endpoint, reload])
  async function loadMore() {
    if (!data?.nextCursor || loadingMore) return
    setLoadingMore(true)
    try {
      const next = await liveRequest<LiveCatalogView>(`${endpoint}?cursor=${data.nextCursor}`)
      const merge = <T extends { id: string }>(a: T[], b: T[]) => [
        ...new Map([...a, ...b].map((item) => [item.id, item])).values(),
      ]
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
  }
  if (error && !data)
    return (
      <div role="alert" className="kids-carta space-y-3 p-6">
        <p className="font-semibold">{error}</p>
        <Button className="min-h-11" onClick={() => setReload((value) => value + 1)}>
          Tentar de novo
        </Button>
      </div>
    )
  if (!data)
    return (
      <p role="status" className="kids-carta p-6 font-semibold">
        Buscando as oficinas…
      </p>
    )
  const cohortOf = (session: LiveSessionSummary) =>
    data.cohorts.find((item) => item.id === session.cohortId)
  const zoneOf = (session: LiveSessionSummary) => cohortOf(session)?.timeZone ?? 'America/Sao_Paulo'
  const sessions = [...data.sessions].sort(sortByStart)
  const withState = sessions.map((session) => ({
    session,
    state: liveScheduleState(session, zoneOf(session)),
  }))
  const ahead = withState.filter(({ state }) =>
    ['live', 'soon', 'today', 'upcoming'].includes(state),
  )
  const past = withState
    .filter(({ state }) => ['ended', 'cancelled', 'expired'].includes(state))
    .reverse()
  const enrolledPrograms = new Set(
    data.cohorts
      .filter((cohort) => data.enrollments.some((item) => item.cohortId === cohort.id))
      .map((cohort) => cohort.programId),
  )
  const explore = data.programs.filter((program) => !enrolledPrograms.has(program.id))
  const [next, ...upcoming] = ahead
  const parent = mode === 'parent'
  const card = (session: LiveSessionSummary, state: LiveScheduleState) => (
    <SessionCard
      key={session.id}
      session={session}
      cohort={cohortOf(session)}
      state={state}
      mode={mode}
      learnerNames={
        parent
          ? data.enrollments
              .filter((item) => item.cohortId === session.cohortId && item.status === 'active')
              .map((item) => item.learnerName || 'Vaga sem criança escolhida')
          : []
      }
    />
  )
  return (
    <div className="space-y-10">
      {error ? (
        <p role="alert" className="rounded-2xl bg-destructive/10 p-4 font-semibold">
          {error}
        </p>
      ) : null}
      {parent ? (
        <LiveParentReservations catalog={data} onAssigned={() => setReload((value) => value + 1)} />
      ) : null}
      {next && !parent ? (
        <NextHero
          session={next.session}
          cohort={cohortOf(next.session)}
          state={next.state}
          mode={mode}
        />
      ) : null}
      {parent && sessions.length ? <ParentPreparation prepareHref={prepareHref} /> : null}
      {(parent ? ahead : upcoming).length ? (
        <section aria-labelledby="live-ahead" className="space-y-4">
          <h2 id="live-ahead" className="sz-display text-2xl">
            {parent ? 'Próximos encontros da família' : 'Próximos encontros'}
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {(parent ? ahead : upcoming).map(({ session, state }) => card(session, state))}
          </div>
        </section>
      ) : null}
      {past.length ? (
        <section aria-labelledby="live-past" className="space-y-4">
          <h2 id="live-past" className="sz-display text-2xl">
            Já aconteceram
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {past.map(({ session, state }) => card(session, state))}
          </div>
        </section>
      ) : null}
      {data.nextCursor ? (
        <Button
          variant="outline"
          className="min-h-11"
          disabled={loadingMore}
          onClick={() => void loadMore()}
        >
          {loadingMore ? 'Carregando…' : 'Ver mais encontros'}
        </Button>
      ) : null}
      {mode === 'learner' && explore.length ? (
        <section aria-labelledby="live-explore" className="space-y-4">
          <h2 id="live-explore" className="sz-display text-2xl">
            Conheça as oficinas
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {explore.map((program) => (
              <article key={program.id} className="kids-carta space-y-3 p-6">
                <span className="grid size-11 place-items-center rounded-2xl bg-primary/10 text-primary">
                  <Users className="size-5" aria-hidden />
                </span>
                <h3 className="sz-display text-xl">{program.title}</h3>
                <p className="whitespace-pre-wrap font-medium text-muted-foreground">
                  {program.description}
                </p>
                <p className="font-semibold text-sm">
                  Quer participar? Peça para um adulto da sua casa.
                </p>
              </article>
            ))}
          </div>
        </section>
      ) : null}
      {!sessions.length && !(mode === 'learner' && explore.length)
        ? (empty ?? (
            <p className="kids-carta p-6 font-semibold">
              {parent
                ? 'Quando uma criança da família tiver vaga numa oficina, os encontros aparecem aqui.'
                : 'Sua próxima oficina vai aparecer aqui.'}
            </p>
          ))
        : null}
    </div>
  )
}

function roomHref(mode: 'learner' | 'parent' | 'teacher', session: LiveSessionSummary) {
  return mode === 'teacher'
    ? `/admin/professor/ao-vivo/${session.id}`
    : `/oficinas/aulas/${session.id}`
}

/** A próxima oficina, em destaque. A entrada é navegação COMPLETA (`<a>`): ver `SessionCard`. */
function NextHero({
  session,
  cohort,
  state,
  mode,
}: {
  session: LiveSessionSummary
  cohort?: LiveCohort
  state: LiveScheduleState
  mode: 'learner' | 'parent' | 'teacher'
}) {
  const zone = cohort?.timeZone ?? 'America/Sao_Paulo'
  const start = session.occurrenceStartsAt ?? session.startsAt
  const teacher = teacherOf(cohort)
  const duration = durationLabel(start, session.occurrenceEndsAt ?? session.endsAt)
  const left = countdown(start, zone)
  const now = state === 'live' || state === 'soon' || state === 'today'
  return (
    <section
      aria-labelledby="live-next"
      className="kids-marca flex flex-col gap-6 rounded-[1.75rem] p-7 md:flex-row md:items-end md:justify-between md:p-9"
    >
      <div className="min-w-0 space-y-2">
        <p className="inline-flex flex-wrap items-center gap-2 font-extrabold text-sm uppercase tracking-wide">
          {state === 'live' ? (
            <span className="inline-flex items-center gap-2 rounded-full bg-destructive px-3 py-1 text-white">
              <span className="size-2 rounded-full bg-white" aria-hidden />
              Ao vivo agora
            </span>
          ) : (
            <span className="opacity-90">Sua próxima oficina</span>
          )}
          {state !== 'live' && left ? <span className="opacity-90">· {left}</span> : null}
        </p>
        <h2 id="live-next" className="sz-display text-[clamp(1.75rem,3vw,2.5rem)] leading-tight">
          {session.title}
        </h2>
        <p className="font-semibold text-lg opacity-95">
          {friendlyWhen(start, zone)}
          {duration ? ` · ${duration}` : ''}
        </p>
        <p className="font-medium opacity-90">
          {cohort?.title}
          {teacher ? ` · com a professora ${teacher}` : ''}
        </p>
      </div>
      {/* Navegação completa: a sala libera câmera e o jogo isolado pelos cabeçalhos DELA. */}
      <a
        href={roomHref(mode, session)}
        className="sz-btn-inverso inline-flex min-h-12 shrink-0 rounded-full items-center justify-center gap-2 px-7 font-extrabold text-lg"
      >
        {now ? 'Entrar na oficina' : 'Ver o encontro'}
        <ArrowRight className="size-5" aria-hidden />
      </a>
    </section>
  )
}

function SessionCard({
  session,
  cohort,
  state,
  mode,
  learnerNames,
}: {
  session: LiveSessionSummary
  cohort?: LiveCohort
  state: LiveScheduleState
  mode: 'learner' | 'parent' | 'teacher'
  learnerNames: string[]
}) {
  const zone = cohort?.timeZone ?? 'America/Sao_Paulo'
  const start = session.occurrenceStartsAt ?? session.startsAt
  const teacher = teacherOf(cohort)
  const duration = durationLabel(start, session.occurrenceEndsAt ?? session.endsAt)
  const closed = state === 'expired' || state === 'cancelled'
  const tone =
    state === 'live'
      ? 'bg-destructive text-white'
      : state === 'soon' || state === 'today'
        ? 'bg-(--sz-kids-amarelo,#fde68a) text-(--sz-kids-tinta,#1f2937)'
        : closed
          ? 'bg-muted text-muted-foreground'
          : 'bg-primary/10 text-primary'
  const content = (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className={`rounded-full px-3 py-1 font-extrabold text-xs ${tone}`}>
          {STATE_LABEL[state]}
        </span>
        <span className="font-bold text-primary text-sm">{cohort?.title}</span>
      </div>
      <h3 className="sz-display text-xl leading-snug">{session.title}</h3>
      <p className="flex items-center gap-2 font-semibold">
        <CalendarDays className="size-4 shrink-0 text-primary" aria-hidden />
        {friendlyWhen(start, zone)}
        {duration ? ` · ${duration}` : ''}
      </p>
      {teacher ? (
        <p className="font-medium text-muted-foreground text-sm">Com a professora {teacher}</p>
      ) : null}
      {mode === 'parent' && learnerNames.length ? (
        <p className="font-semibold text-sm">Participa: {learnerNames.join(', ')}</p>
      ) : null}
      {state === 'ended' ? (
        <p className="flex items-center gap-2 font-medium text-muted-foreground text-sm">
          <Clock3 className="size-4 shrink-0" aria-hidden />
          {mode === 'parent'
            ? 'Dá para rever e continuar até '
            : 'Você pode rever e continuar até '}
          {friendlyDay(session.accessEndsAt, zone)}
        </p>
      ) : null}
      {state === 'expired' ? (
        <p className="font-medium text-muted-foreground text-sm">
          O prazo terminou em {friendlyDay(session.accessEndsAt, zone)}.
        </p>
      ) : null}
      {mode === 'teacher' ? (
        <p className="text-muted-foreground text-xs">{liveDate(start, zone)}</p>
      ) : null}
    </>
  )
  // A família só acompanha: o cartão não leva à sala da criança.
  if (mode === 'parent' || closed)
    return (
      <article className={`kids-carta flex flex-col gap-2.5 p-5 ${closed ? 'opacity-80' : ''}`}>
        {content}
      </article>
    )
  // ⚠️ `<a>` e não `<Link>`: a sala libera câmera, microfone e o quadro isolado do jogo pelos
  // cabeçalhos da PRÓPRIA rota, e a navegação do Next manteria os desta página (full review).
  return (
    <a
      href={roomHref(mode, session)}
      className="kids-carta flex flex-col gap-2.5 p-5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
    >
      {content}
      <span className="mt-1 inline-flex items-center gap-1.5 font-extrabold text-primary">
        {state === 'ended' ? 'Rever e continuar' : 'Ver o encontro'}
        <ArrowRight className="size-4" aria-hidden />
      </span>
    </a>
  )
}

function ParentPreparation({ prepareHref }: { prepareHref?: string }) {
  return (
    <section aria-labelledby="live-prepare" className="kids-carta space-y-4 p-6">
      <h2 id="live-prepare" className="sz-display text-2xl">
        Antes do primeiro encontro
      </h2>
      <ol className="grid gap-4 md:grid-cols-3">
        <li className="space-y-2">
          <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
            <Laptop className="size-5" aria-hidden />
          </span>
          <p className="font-bold">Um computador com Chrome ou Edge</p>
          <p className="text-muted-foreground text-sm">
            É onde a criança cria o jogo e acompanha a professora. No celular dá para assistir, mas
            não para criar do mesmo jeito.
          </p>
        </li>
        <li className="space-y-2">
          <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
            <Users className="size-5" aria-hidden />
          </span>
          <p className="font-bold">O acesso da criança preparado nesse computador</p>
          <p className="text-muted-foreground text-sm">
            Assim ela entra sozinha no dia.{' '}
            {prepareHref ? (
              <a href={prepareHref} className="font-bold text-primary underline">
                Preparar o acesso
              </a>
            ) : null}
          </p>
        </li>
        <li className="space-y-2">
          <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
            <Headphones className="size-5" aria-hidden />
          </span>
          <p className="font-bold">Um fone de ouvido</p>
          <p className="text-muted-foreground text-sm">
            Evita que o som da turma volte pelo microfone. Na sala, a criança pode testar a câmera e
            o microfone antes de entrar.
          </p>
        </li>
      </ol>
    </section>
  )
}
