import type { LiveCatalogView, LiveCohort, LiveSessionSummary } from '@sistemazero/core/live'
import {
  calendarDaysBetween,
  friendlyDay,
  type LiveScheduleState,
  liveHour,
  liveScheduleState,
} from './schedule'

/**
 * A jornada de um encontro em réguas puras (proposta de 23/10/2026): a linha do tempo dos
 * cartões e da sala, o selo de prazo perto do fim e o pedido para o player abrir a parte da
 * turma. Tudo sai do que a agenda e a sala já recebem; nada aqui pede dado novo ao servidor.
 */

export type LiveTimelineStatus = 'done' | 'current' | 'next'
export interface LiveTimelineStep {
  key: 'scheduled' | 'lobby' | 'live' | 'recording' | 'deadline'
  label: string
  status: LiveTimelineStatus
}

/** Os 15 minutos em que a sala abre antes do horário (a regra do Members). */
export const LIVE_LOBBY_MINUTES = 15

/**
 * "Marcado · Sala abre às 14h45 · Ao vivo às 15h · Gravação · Rever até 23 de novembro", com o
 * passo atual. Cancelado não tem linha do tempo (o cartão diz o que aconteceu).
 */
export function liveTimeline(
  session: { start: string; accessEndsAt: string; recordingPublished?: boolean },
  state: LiveScheduleState,
  timeZone: string,
): LiveTimelineStep[] | null {
  if (state === 'cancelled') return null
  const start = new Date(session.start)
  const lobby = new Date(start.getTime() - LIVE_LOBBY_MINUTES * 60_000)
  const order: LiveTimelineStep['key'][] = ['scheduled', 'lobby', 'live', 'recording', 'deadline']
  const current: LiveTimelineStep['key'] | null =
    state === 'upcoming' || state === 'today'
      ? 'scheduled'
      : state === 'soon'
        ? 'lobby'
        : state === 'live'
          ? 'live'
          : state === 'ended'
            ? session.recordingPublished
              ? 'deadline'
              : 'recording'
            : null
  const at = current ? order.indexOf(current) : order.length
  const labels: Record<LiveTimelineStep['key'], string> = {
    scheduled: 'Marcado',
    lobby: `Sala abre às ${liveHour(lobby, timeZone)}`,
    live: `Ao vivo às ${liveHour(start, timeZone)}`,
    recording: 'Gravação',
    deadline: `Rever até ${friendlyDay(session.accessEndsAt, timeZone)}`,
  }
  return order.map((key, index) => ({
    key,
    label: labels[key],
    status: index < at ? 'done' : index === at ? 'current' : 'next',
  }))
}

/**
 * O selo da última semana para rever: "Faltam 5 dias para rever", "Falta 1 dia para rever",
 * "Último dia para rever". Fora da última semana (ou sem prazo), nada.
 */
export function reviewDeadlineLabel(
  accessEndsAt: string,
  timeZone: string,
  now = new Date(),
): string | null {
  const end = new Date(accessEndsAt)
  if (!Number.isFinite(end.getTime()) || end.getTime() <= now.getTime()) return null
  // O prazo vence no instante `accessEndsAt`; o último dia é o anterior a ele no fuso da turma.
  const lastDay = new Date(end.getTime() - 1)
  const days = calendarDaysBetween(now, lastDay, timeZone)
  if (days > 7) return null
  if (days <= 0) return 'Último dia para rever'
  return days === 1 ? 'Falta 1 dia para rever' : `Faltam ${days} dias para rever`
}

/** O encontro foi remarcado (reposição): a ocorrência atual não está no horário original. */
export function isRescheduled(session: { startsAt: string; occurrenceStartsAt?: string }): boolean {
  return Boolean(
    session.occurrenceStartsAt &&
      Date.parse(session.occurrenceStartsAt) !== Date.parse(session.startsAt),
  )
}

/**
 * "Ir junto": a sala pede ao player da aula que abra a parte da turma. Um evento de janela, e
 * não uma propriedade nova do `LessonSections`, para a aula memorizada não re-renderizar.
 */
export const LIVE_FOLLOW_SECTION_EVENT = 'sz:live-follow-section'

export function followLiveSection(sectionId: string) {
  window.dispatchEvent(new CustomEvent(LIVE_FOLLOW_SECTION_EVENT, { detail: { sectionId } }))
}

export interface LiveTodayView {
  session: LiveSessionSummary
  cohort: LiveCohort
  state: Extract<LiveScheduleState, 'live' | 'soon' | 'today'>
}

const TODAY = new Set<LiveScheduleState>(['live', 'soon', 'today'])

/** O encontro de hoje mais próximo: ao vivo e sala abrindo antes, depois o horário. */
export function pickLiveToday(view: LiveCatalogView, now = new Date()): LiveTodayView | null {
  const rank = { live: 0, soon: 1, today: 2 } as const
  const found = view.sessions
    .map((session) => {
      const cohort = view.cohorts.find((item) => item.id === session.cohortId)
      const state = cohort ? liveScheduleState(session, cohort.timeZone, now) : null
      return cohort && state && TODAY.has(state)
        ? { session, cohort, state: state as LiveTodayView['state'] }
        : null
    })
    .filter((item): item is LiveTodayView => item !== null)
    .sort(
      (a, b) =>
        rank[a.state] - rank[b.state] ||
        Date.parse(a.session.occurrenceStartsAt ?? a.session.startsAt) -
          Date.parse(b.session.occurrenceStartsAt ?? b.session.startsAt),
    )
  return found[0] ?? null
}
