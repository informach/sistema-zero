import { describe, expect, test } from 'bun:test'
import type { LiveCatalogView, LiveCohort, LiveSessionSummary } from '@sistemazero/core/live'
import { liveCalendarFile } from '../src/lib/live/calendar'
import {
  isRescheduled,
  liveTimeline,
  pickLiveToday,
  reviewDeadlineLabel,
} from '../src/lib/live/journey'

const ZONE = 'America/Sao_Paulo'
// Sábado, 24 de outubro de 2026, às 15h em São Paulo.
const START = '2026-10-24T18:00:00.000Z'
const ACCESS_END = '2026-11-23T18:00:00.000Z'

const statuses = (state: Parameters<typeof liveTimeline>[1], recordingPublished = false) =>
  liveTimeline({ start: START, accessEndsAt: ACCESS_END, recordingPublished }, state, ZONE)?.map(
    (step) => `${step.key}:${step.status}`,
  )

describe('a linha do tempo do encontro', () => {
  test('diz os horários como a pessoa lê: a sala abre 15 minutos antes', () => {
    const steps = liveTimeline({ start: START, accessEndsAt: ACCESS_END }, 'upcoming', ZONE)
    expect(steps?.map((step) => step.label)).toEqual([
      'Marcado',
      'Sala abre às 14h45',
      'Ao vivo às 15h',
      'Gravação',
      'Rever até 23 de novembro',
    ])
  })

  test('marca o passo atual pelo estado da agenda', () => {
    expect(statuses('upcoming')).toEqual([
      'scheduled:current',
      'lobby:next',
      'live:next',
      'recording:next',
      'deadline:next',
    ])
    expect(statuses('soon')?.slice(0, 2)).toEqual(['scheduled:done', 'lobby:current'])
    expect(statuses('live')?.[2]).toBe('live:current')
    // Terminou sem gravação publicada: ela é o passo de agora. Com ela, o prazo.
    expect(statuses('ended')?.[3]).toBe('recording:current')
    expect(statuses('ended', true)?.slice(3)).toEqual(['recording:done', 'deadline:current'])
    expect(statuses('expired')?.every((item) => item.endsWith(':done'))).toBe(true)
  })

  test('encontro cancelado não tem linha do tempo', () => {
    expect(liveTimeline({ start: START, accessEndsAt: ACCESS_END }, 'cancelled', ZONE)).toBeNull()
  })
})

describe('o selo de prazo perto do fim', () => {
  test('só na última semana, contando dias de calendário no fuso da turma', () => {
    expect(reviewDeadlineLabel(ACCESS_END, ZONE, new Date('2026-11-10T15:00:00Z'))).toBeNull()
    expect(reviewDeadlineLabel(ACCESS_END, ZONE, new Date('2026-11-18T15:00:00Z'))).toBe(
      'Faltam 5 dias para rever',
    )
    expect(reviewDeadlineLabel(ACCESS_END, ZONE, new Date('2026-11-22T15:00:00Z'))).toBe(
      'Falta 1 dia para rever',
    )
    expect(reviewDeadlineLabel(ACCESS_END, ZONE, new Date('2026-11-23T12:00:00Z'))).toBe(
      'Último dia para rever',
    )
  })

  test('depois do prazo, ou com data inválida, nada', () => {
    expect(reviewDeadlineLabel(ACCESS_END, ZONE, new Date('2026-11-23T18:00:00Z'))).toBeNull()
    expect(reviewDeadlineLabel('não é data', ZONE)).toBeNull()
  })
})

test('a reposição aparece quando a ocorrência atual saiu do horário original', () => {
  expect(isRescheduled({ startsAt: START, occurrenceStartsAt: START })).toBe(false)
  expect(isRescheduled({ startsAt: START })).toBe(false)
  expect(isRescheduled({ startsAt: START, occurrenceStartsAt: '2026-10-28T20:00:00.000Z' })).toBe(
    true,
  )
})

describe('o arquivo de agenda do encontro', () => {
  test('vai em UTC, com lembrete de 15 minutos e o texto escapado', () => {
    const file = liveCalendarFile(
      {
        id: 'abc',
        title: 'Encontro 2: o herói, a fase',
        startsAt: START,
        endsAt: '2026-10-24T19:30:00.000Z',
        url: 'https://kids.exemplo/oficinas/aulas/abc',
        description: 'Turma Cometa; com Lia.',
      },
      new Date('2026-10-23T12:00:00Z'),
    )
    expect(file).toContain('DTSTART:20261024T180000Z')
    expect(file).toContain('DTEND:20261024T193000Z')
    expect(file).toContain('SUMMARY:Encontro 2: o herói\\, a fase')
    expect(file).toContain('DESCRIPTION:Turma Cometa\\; com Lia.')
    expect(file).toContain('TRIGGER:-PT15M')
    expect(file.split('\r\n')[0]).toBe('BEGIN:VCALENDAR')
  })

  test('sem fim conhecido, o encontro dura uma hora e meia', () => {
    const file = liveCalendarFile(
      { id: 'x', title: 'Encontro', startsAt: START, url: 'https://x', description: '' },
      new Date(START),
    )
    expect(file).toContain('DTEND:20261024T193000Z')
  })
})

describe('o encontro de hoje na Início do Kids', () => {
  const cohort = { id: 'turma', timeZone: ZONE } as LiveCohort
  const session = (id: string, startsAt: string, extra: Partial<LiveSessionSummary> = {}) =>
    ({
      id,
      cohortId: 'turma',
      startsAt,
      endsAt: startsAt,
      accessEndsAt: ACCESS_END,
      title: id,
      ...extra,
    }) as LiveSessionSummary
  const view = (sessions: LiveSessionSummary[]) =>
    ({ cohorts: [cohort], sessions, enrollments: [], programs: [] }) as LiveCatalogView

  test('escolhe o de hoje, e o que está ao vivo vem antes', () => {
    const now = new Date('2026-10-24T13:00:00Z')
    const today = session('tarde', START)
    const live = session('agora', '2026-10-24T12:30:00.000Z', { occurrenceState: 'live' })
    expect(pickLiveToday(view([today]), now)?.session.id).toBe('tarde')
    expect(pickLiveToday(view([today, live]), now)?.session.id).toBe('agora')
  })

  test('sem encontro hoje (ou de outra turma), nenhum cartão', () => {
    const now = new Date('2026-10-24T13:00:00Z')
    expect(pickLiveToday(view([session('semana', '2026-10-31T18:00:00.000Z')]), now)).toBeNull()
    const orphan = { ...session('outra', START), cohortId: 'sem-turma' }
    expect(pickLiveToday(view([orphan]), now)).toBeNull()
  })
})
