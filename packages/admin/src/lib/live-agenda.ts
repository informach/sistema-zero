import type {
  LiveCohort,
  LiveOccurrenceState,
  LiveRecordingState,
  LiveSessionSummary,
} from '@sistemazero/core/live'

/**
 * TODO contrato do servidor: o resumo do encontro passa a trazer o estado da chamada e o da
 * gravação. Enquanto não vierem, a agenda deduz o estado pelo horário e não mostra o selo de
 * gravação (nunca inventa um "para revisar").
 */
export type LiveAgendaSession = LiveSessionSummary & {
  occurrenceState?: LiveOccurrenceState
  recording?: { state: LiveRecordingState; published: boolean } | null
}

/** `missed`: ficou "marcado" depois do fim (não aconteceu). `in-time`: no horário, sem estado do servidor. */
export type AgendaState = LiveOccurrenceState | 'missed' | 'in-time'

export interface AgendaItem {
  session: LiveAgendaSession
  cohort: LiveCohort | undefined
  state: AgendaState
  startsAt: string
  endsAt: string
  recordingToReview: boolean
}

export interface AgendaGroups {
  today: AgendaItem[]
  upcoming: AgendaItem[]
  past: AgendaItem[]
}

export const AGENDA_STATE_LABEL: Record<AgendaState, string> = {
  scheduled: 'Marcado',
  'in-time': 'No horário',
  lobby: 'Recepção aberta',
  live: 'Ao vivo',
  ended: 'Encerrado',
  cancelled: 'Cancelado',
  missed: 'Não aconteceu',
}

const startOf = (session: LiveSessionSummary) => session.occurrenceStartsAt ?? session.startsAt
const endOf = (session: LiveSessionSummary) => session.occurrenceEndsAt ?? session.endsAt

export function agendaState(session: LiveAgendaSession, now: number): AgendaState {
  const known = session.occurrenceState
  if (known === 'lobby' || known === 'live' || known === 'ended' || known === 'cancelled')
    return known
  const start = Date.parse(startOf(session))
  const end = Date.parse(endOf(session))
  if (now >= end) return known === 'scheduled' ? 'missed' : 'ended'
  if (!known && now >= start) return 'in-time'
  return 'scheduled'
}

/** "2026-10-14" no fuso de quem olha: é o "hoje" da professora, não o do servidor. */
export function agendaDayKey(value: string | number, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value))
}

/**
 * Hoje (o que acontece agora ou mais tarde hoje), Próximos e Encerrados. Hoje e Próximos em
 * ordem de horário; Encerrados do mais recente para o mais antigo.
 */
export function groupLiveAgenda(
  sessions: readonly LiveAgendaSession[],
  cohorts: readonly LiveCohort[],
  now: number,
  timeZone: string = Intl.DateTimeFormat().resolvedOptions().timeZone,
): AgendaGroups {
  const today = agendaDayKey(now, timeZone)
  const groups: AgendaGroups = { today: [], upcoming: [], past: [] }
  for (const session of sessions) {
    const state = agendaState(session, now)
    const item: AgendaItem = {
      session,
      cohort: cohorts.find((cohort) => cohort.id === session.cohortId),
      state,
      startsAt: startOf(session),
      endsAt: endOf(session),
      recordingToReview:
        !!session.recording &&
        !session.recording.published &&
        (session.recording.state === 'review' || session.recording.state === 'ready'),
    }
    if (state === 'lobby' || state === 'live' || state === 'in-time') groups.today.push(item)
    else if (state === 'ended' || state === 'cancelled' || state === 'missed')
      groups.past.push(item)
    else if (agendaDayKey(item.startsAt, timeZone) <= today) groups.today.push(item)
    else groups.upcoming.push(item)
  }
  const ascending = (a: AgendaItem, b: AgendaItem) =>
    Date.parse(a.startsAt) - Date.parse(b.startsAt) || a.session.id.localeCompare(b.session.id)
  groups.today.sort(ascending)
  groups.upcoming.sort(ascending)
  groups.past.sort((a, b) => ascending(b, a))
  return groups
}

/** O texto do botão diz o que a professora vai fazer lá dentro. */
export function agendaActionLabel(item: AgendaItem, group: keyof AgendaGroups): string {
  if (item.state === 'live' || item.state === 'lobby') return 'Entrar na sala'
  if (group === 'today') return 'Preparar sala'
  if (group === 'upcoming') return 'Preparar encontro'
  if (item.recordingToReview) return 'Revisar gravação'
  return 'Ver encontro'
}

/**
 * ⚠️ A sala da professora precisa de navegação COMPLETA (`<a href>`): câmera, microfone e o
 * frame da prévia são liberados por cabeçalho da rota, e a navegação do Next mantém os
 * cabeçalhos do primeiro documento carregado.
 */
export function roomHref(sessionId: string): string {
  return `/admin/professor/ao-vivo/${encodeURIComponent(sessionId)}`
}

/** "sáb., 18 de out. · 15:00 às 16:30", no fuso da turma. */
export function agendaWhen(startsAt: string, endsAt: string, timeZone: string): string {
  const day = new Intl.DateTimeFormat('pt-BR', {
    timeZone,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(new Date(startsAt))
  const time = new Intl.DateTimeFormat('pt-BR', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
  })
  return `${day} · ${time.format(new Date(startsAt))} às ${time.format(new Date(endsAt))}`
}
