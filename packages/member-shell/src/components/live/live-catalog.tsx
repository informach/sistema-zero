'use client'

import type {
  LiveCatalogView,
  LiveCohort,
  LiveCourseSummary,
  LiveSessionSummary,
} from '@sistemazero/core/live'
import { Button } from '@sistemazero/ui'
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Headphones,
  Laptop,
  PlayCircle,
  Users,
} from 'lucide-react'
import { createContext, type ReactNode, useContext, useEffect, useState } from 'react'
import { liveDate, liveRequest } from '../../lib/live/client'
import { devicesPassed } from '../../lib/live/device-check'
import { isRescheduled, liveTimeline, reviewDeadlineLabel } from '../../lib/live/journey'
import {
  countdown,
  durationLabel,
  friendlyDay,
  friendlyWhen,
  type LiveScheduleState,
  liveScheduleState,
} from '../../lib/live/schedule'
import {
  AddToCalendarButton,
  LiveTimeline,
  ReviewDeadlineChip,
  useDeviceCheck,
} from './live-journey'
import { LiveParentReservations } from './live-parent-reservations'

/**
 * A pele dos cartões: a carta do Kids ou o cartão sóbrio da comunidade adulta, que não carrega as
 * classes do Kids (`skin="adult"`, 14/10/2026).
 */
const SKINS = {
  kids: {
    adult: false,
    card: 'kids-carta',
    hero: 'kids-marca',
    heroAction: 'sz-btn-inverso',
    // O botão secundário de um cartão (a agenda na área dos pais).
    cardAction:
      'kids-3d kids-3d--carta inline-flex min-h-11 items-center gap-2 self-start rounded-full border bg-card px-4 font-bold',
  },
  // A pele adulta segue a direção de arte de 18/10/2026: o cartão branco de borda fina, a próxima
  // oficina na âncora escura da barra do topo e o botão branco retangular.
  adult: {
    adult: true,
    card: 'sz-card-sm',
    hero: 'bg-(--topo) text-(--sz-community-on-action)',
    heroAction: 'rounded-[0.6rem]! bg-card text-foreground hover:bg-muted',
    cardAction:
      'inline-flex min-h-12 items-center gap-2 self-start rounded-[0.6rem] border-2 border-foreground bg-card px-5 font-bold',
  },
} as const
const SkinContext = createContext<(typeof SKINS)[keyof typeof SKINS]>(SKINS.kids)

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
  skin = 'kids',
}: {
  mode?: 'learner' | 'parent' | 'teacher'
  /** Estado vazio da área (com o Zappy, no Kids). */
  empty?: ReactNode
  /** Área dos pais: onde se prepara o acesso da criança no computador. */
  prepareHref?: string
  /** A comunidade adulta não tem as classes do Kids. */
  skin?: 'kids' | 'adult'
}) {
  return (
    <SkinContext.Provider value={SKINS[skin]}>
      <Catalog mode={mode} empty={empty} prepareHref={prepareHref} />
    </SkinContext.Provider>
  )
}

function Catalog({
  mode,
  empty,
  prepareHref,
}: {
  mode: 'learner' | 'parent' | 'teacher'
  empty?: ReactNode
  prepareHref?: string
}) {
  const { card: cardSkin } = useContext(SkinContext)
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
              courses: merge(previous.courses ?? [], next.courses ?? []),
              programs: merge(previous.programs ?? [], next.programs ?? []),
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
      <div role="alert" className={`${cardSkin} space-y-3 p-6`}>
        <p className="font-semibold">{error}</p>
        <Button className="min-h-11" onClick={() => setReload((value) => value + 1)}>
          Tentar de novo
        </Button>
      </div>
    )
  if (!data)
    return (
      <p role="status" className={`${cardSkin} p-6 font-semibold`}>
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
  // "Conheça as oficinas" é do roteiro antigo: os cursos ao vivo só aparecem para quem tem vaga
  // (nada de divulgação, decisão de 14/10/2026), então não há o que explorar entre eles.
  const explore = (data.programs ?? []).filter((program) => !enrolledPrograms.has(program.id))
  // As turmas de CURSO ao vivo da criança, uma por curso (a mesma criança pode estar em duas).
  const myCourses = (data.courses ?? [])
    .map((course) => ({
      course,
      cohorts: data.cohorts.filter((cohort) => cohort.courseId === course.id),
    }))
    .filter((item) => item.cohorts.length > 0)
  const [next, ...upcoming] = ahead
  const parent = mode === 'parent'
  const unassigned = data.enrollments.some((item) => item.status === 'active' && !item.learnerId)
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
      {parent && data.enrollments.some((item) => item.status === 'active') ? (
        <ParentSteps
          pending={
            data.enrollments.filter((item) => item.status === 'active' && !item.learnerId).length
          }
          next={next ? { session: next.session, zone: zoneOf(next.session) } : null}
        />
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
      {myCourses.length && !parent ? (
        <section aria-labelledby="live-courses" className="space-y-4">
          <h2 id="live-courses" className="sz-display text-2xl">
            Suas oficinas
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {myCourses.map(({ course, cohorts }) => (
              <CourseCard
                key={course.id}
                course={course}
                cohorts={cohorts}
                sessions={sessions.filter((session) =>
                  cohorts.some((cohort) => cohort.id === session.cohortId),
                )}
              />
            ))}
          </div>
        </section>
      ) : null}
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
              <article key={program.id} className={`${cardSkin} space-y-3 p-6`}>
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
      {/* A família com vaga sem criança escolhida já vê o "Quem vai participar?": o recado de
          vazio diria o contrário logo embaixo. */}
      {!sessions.length && !(mode === 'learner' && explore.length) && !(parent && unassigned)
        ? (empty ?? (
            <p className={`${cardSkin} p-6 font-semibold`}>
              {parent
                ? 'Quando uma criança da família tiver vaga numa oficina, os encontros aparecem aqui.'
                : 'Sua próxima oficina vai aparecer aqui.'}
            </p>
          ))
        : null}
    </div>
  )
}

/**
 * Uma oficina (curso ao vivo) da criança: os encontros da turma dela, quanto já aconteceu e as
 * gravações para rever no prazo. A entrada de cada encontro é pelo cartão do encontro.
 */
function CourseCard({
  course,
  cohorts,
  sessions,
}: {
  course: LiveCourseSummary
  cohorts: LiveCohort[]
  sessions: LiveSessionSummary[]
}) {
  const teacher = teacherOf(cohorts[0])
  const zone = cohorts[0]?.timeZone ?? 'America/Sao_Paulo'
  const states = sessions.map((session) => liveScheduleState(session, zone))
  const done = states.filter((state) => state === 'ended' || state === 'expired').length
  const recordings = sessions.filter((session) => session.recordingPublished).length
  const next = sessions.find((_, index) =>
    ['live', 'soon', 'today', 'upcoming'].includes(states[index]!),
  )
  const { card } = useContext(SkinContext)
  return (
    <article className={`${card} flex flex-col gap-3 overflow-hidden p-0`}>
      {course.coverImageUrl ? (
        // Capa da autoria (URL externa arbitrária), como nos cartões de curso.
        <img src={course.coverImageUrl} alt="" className="aspect-[16/7] w-full object-cover" />
      ) : null}
      <div className="flex flex-col gap-2.5 p-5 pt-2">
        <p className="font-bold text-primary text-sm">
          {cohorts.map((item) => item.title).join(' · ')}
        </p>
        <h3 className="sz-display text-xl leading-snug">{course.title}</h3>
        {course.description ? (
          <p className="line-clamp-3 font-medium text-muted-foreground">{course.description}</p>
        ) : null}
        <p className="flex items-center gap-2 font-semibold text-sm">
          <Users className="size-4 shrink-0 text-primary" aria-hidden />
          {sessions.length === 1 ? '1 encontro' : `${sessions.length} encontros`}
          {done ? ` · ${done} já aconteceu${done === 1 ? '' : 'ram'}` : ''}
          {teacher ? ` · com ${teacher}` : ''}
        </p>
        {next ? (
          <p className="flex items-center gap-2 font-semibold text-sm">
            <CalendarDays className="size-4 shrink-0 text-primary" aria-hidden />
            Próximo: {friendlyWhen(next.occurrenceStartsAt ?? next.startsAt, zone)}
          </p>
        ) : null}
        {recordings ? (
          <p className="flex items-center gap-2 font-semibold text-sm">
            <PlayCircle className="size-4 shrink-0 text-primary" aria-hidden />
            {recordings === 1 ? '1 gravação para rever' : `${recordings} gravações para rever`}
          </p>
        ) : null}
      </div>
    </article>
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
  // "Entrar" só quando a sala abre (15 min antes ou ao vivo): de manhã, num encontro da tarde,
  // o botão prometia uma sala que ainda estava fechada.
  const now = state === 'live' || state === 'soon'
  const { adult, hero, heroAction } = useContext(SkinContext)
  const steps = liveTimeline(
    { start, accessEndsAt: session.accessEndsAt, recordingPublished: session.recordingPublished },
    state,
    zone,
  )
  const check = useDeviceCheck()
  return (
    <section
      aria-labelledby="live-next"
      className={`${hero} flex flex-col gap-6 rounded-[1.75rem] p-7 md:p-9`}
    >
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
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
            {teacher ? ` · com ${teacher}` : ''}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-stretch gap-3 md:items-end">
          {/* Navegação completa: a sala libera câmera e o jogo isolado pelos cabeçalhos DELA. */}
          <a
            href={roomHref(mode, session)}
            className={`${heroAction} inline-flex min-h-12 shrink-0 rounded-full items-center justify-center gap-2 px-7 font-extrabold text-lg`}
          >
            {now ? 'Entrar na sala' : 'Ver o encontro'}
            <ArrowRight className="size-5" aria-hidden />
          </a>
          {/* A agenda é de quem organiza o próprio tempo: o adulto (a família tem a dela). */}
          {adult && mode === 'learner' && !now ? (
            <AddToCalendarButton
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[0.6rem] px-6 font-bold text-lg shadow-[inset_0_0_0_2px_var(--sz-community-action-light)]"
              event={calendarEvent(session, cohort, mode)}
            />
          ) : null}
          {now && check && devicesPassed(check) ? (
            <p className="inline-flex items-center gap-2 font-bold text-sm">
              <CheckCircle2 className="size-4 shrink-0" aria-hidden />
              Seu computador já passou no teste
            </p>
          ) : null}
        </div>
      </div>
      {steps ? <LiveTimeline steps={steps} onDark /> : null}
    </section>
  )
}

/** O lembrete do encontro na agenda de quem baixa: o horário atual (uma reposição muda a data). */
function calendarEvent(
  session: LiveSessionSummary,
  cohort: LiveCohort | undefined,
  mode: 'learner' | 'parent' | 'teacher',
) {
  const teacher = teacherOf(cohort)
  return {
    id: session.id,
    title: session.title,
    startsAt: session.occurrenceStartsAt ?? session.startsAt,
    endsAt: session.occurrenceEndsAt ?? session.endsAt,
    path: roomHref(mode, session),
    description: `${cohort?.title ?? 'Oficina ao vivo'}${teacher ? `, com ${teacher}` : ''}. A sala abre 15 minutos antes.`,
  }
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
  const { card, cardAction } = useContext(SkinContext)
  const deadline = state === 'ended' ? reviewDeadlineLabel(session.accessEndsAt, zone) : null
  const rescheduled = !closed && state !== 'ended' && isRescheduled(session)
  const tone =
    state === 'live'
      ? 'bg-destructive text-white'
      : state === 'soon' || state === 'today'
        ? 'bg-[var(--sz-kids-amarelo,var(--aviso-tint,#fde68a))] text-[var(--sz-kids-tinta,var(--aviso-texto,#1f2937))]'
        : closed
          ? 'bg-muted text-muted-foreground'
          : 'bg-primary/10 text-primary'
  const content = (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex flex-wrap items-center gap-1.5">
          <span className={`rounded-full px-3 py-1 font-extrabold text-xs ${tone}`}>
            {STATE_LABEL[state]}
          </span>
          {/* A reposição: a data do cartão já é a nova, e o selo diz que ela mudou. */}
          {rescheduled ? (
            <span className="rounded-full bg-[var(--sz-kids-menta-bg,var(--sucesso-tint,#dcf0e4))] px-3 py-1 font-extrabold text-foreground text-xs">
              Data nova
            </span>
          ) : null}
          {deadline ? <ReviewDeadlineChip label={deadline} /> : null}
        </span>
        <span className="font-bold text-primary text-sm">{cohort?.title}</span>
      </div>
      <h3 className="sz-display text-xl leading-snug">{session.title}</h3>
      <p className="flex items-center gap-2 font-semibold">
        <CalendarDays className="size-4 shrink-0 text-primary" aria-hidden />
        {friendlyWhen(start, zone)}
        {duration ? ` · ${duration}` : ''}
      </p>
      {teacher ? <p className="font-medium text-muted-foreground text-sm">Com {teacher}</p> : null}
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
      <article className={`${card} flex flex-col gap-2.5 p-5 ${closed ? 'opacity-80' : ''}`}>
        {content}
        {mode === 'parent' && ['upcoming', 'today', 'soon'].includes(state) ? (
          <AddToCalendarButton
            className={`${cardAction} mt-1`}
            event={calendarEvent(session, cohort, mode)}
          />
        ) : null}
      </article>
    )
  // ⚠️ `<a>` e não `<Link>`: a sala libera câmera, microfone e o quadro isolado do jogo pelos
  // cabeçalhos da PRÓPRIA rota, e a navegação do Next manteria os desta página (full review).
  return (
    <a
      href={roomHref(mode, session)}
      className={`${card} flex flex-col gap-2.5 p-5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring`}
    >
      {content}
      <span className="mt-1 inline-flex items-center gap-1.5 font-extrabold text-primary">
        {state === 'ended'
          ? 'Rever e continuar'
          : state === 'live' || state === 'soon'
            ? 'Entrar na sala'
            : 'Ver o encontro'}
        <ArrowRight className="size-4" aria-hidden />
      </span>
    </a>
  )
}

function ParentPreparation({ prepareHref }: { prepareHref?: string }) {
  const { card } = useContext(SkinContext)
  return (
    <section aria-labelledby="live-prepare" className={`${card} space-y-4 p-6`}>
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
            É onde a criança cria o jogo e acompanha o encontro. No celular dá para assistir, mas
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

/**
 * A vaga em três passos na área dos pais (proposta de 23/10/2026): escolher a criança, preparar
 * o computador e o dia do encontro, com o passo em que a família está em destaque.
 */
function ParentSteps({
  pending,
  next,
}: {
  pending: number
  next: { session: LiveSessionSummary; zone: string } | null
}) {
  const steps = [
    {
      title: 'Escolher a criança',
      text: pending
        ? pending === 1
          ? '1 vaga esperando'
          : `${pending} vagas esperando`
        : 'Cada vaga já tem a sua criança',
      done: pending === 0,
    },
    {
      title: 'Preparar o computador',
      text: 'O acesso da criança e o teste',
      done: false,
    },
    {
      title: 'No dia, ela entra sozinha',
      text: next
        ? friendlyWhen(next.session.occurrenceStartsAt ?? next.session.startsAt, next.zone)
        : 'Os encontros aparecem aqui embaixo',
      done: false,
    },
  ]
  const current = steps.findIndex((step) => !step.done)
  return (
    <ol aria-label="O caminho da vaga" className="grid gap-3 md:grid-cols-3">
      {steps.map((step, index) => {
        const active = index === current
        return (
          <li
            key={step.title}
            aria-current={active ? 'step' : undefined}
            className={`flex items-center gap-3 rounded-[1.25rem] p-4 ${active ? 'kids-marca' : 'bg-card'}`}
          >
            <span
              className={`grid size-8 shrink-0 place-items-center rounded-full font-extrabold ${active ? 'bg-card text-primary' : step.done ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
            >
              {step.done ? <CheckCircle2 className="size-4" aria-label="Feito" /> : index + 1}
            </span>
            <span className="min-w-0">
              <span className="block font-extrabold">{step.title}</span>
              <span
                className={`block text-sm ${active ? 'kids-marca-suave' : 'text-muted-foreground'}`}
              >
                {step.text}
              </span>
            </span>
          </li>
        )
      })}
    </ol>
  )
}
