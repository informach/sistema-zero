import { describe, expect, test } from 'bun:test'
import type { LiveCohort, LiveSessionSummary } from '@sistemazero/core/live'
import {
  agendaActionLabel,
  agendaDayKey,
  agendaState,
  agendaTime,
  agendaWhen,
  agendaZoneNote,
  groupLiveAgenda,
  roomHref,
} from '../src/lib/live-agenda'

const cohort: LiveCohort = {
  id: 'c1',
  programId: 'p1',
  title: 'Turma de sábado',
  timeZone: 'America/Sao_Paulo',
  capacity: 8,
  accessDays: 30,
  teacherIds: ['t1'],
  status: 'open',
  createdAt: '2026-10-01T12:00:00Z',
}
// 14/10/2026, 15:00 em São Paulo (UTC-3).
const NOW = Date.parse('2026-10-14T18:00:00Z')
const TZ = 'America/Sao_Paulo'

function session(
  id: string,
  startsAt: string,
  extra: Partial<LiveSessionSummary> = {},
): LiveSessionSummary {
  const endsAt = new Date(Date.parse(startsAt) + 90 * 60_000).toISOString()
  return {
    id,
    cohortId: 'c1',
    order: 0,
    title: `Encontro ${id}`,
    startsAt,
    endsAt,
    accessEndsAt: '2026-12-01T00:00:00Z',
    occurrenceId: `o-${id}`,
    occurrenceStartsAt: startsAt,
    occurrenceEndsAt: endsAt,
    ...extra,
  }
}

describe('agenda de quem conduz', () => {
  test('separa Hoje, Próximos e Encerrados e ordena por horário', () => {
    const groups = groupLiveAgenda(
      [
        session('amanha', '2026-10-15T18:00:00Z', { occurrenceState: 'scheduled' }),
        session('hoje-noite', '2026-10-14T22:00:00Z', { occurrenceState: 'scheduled' }),
        session('agora', '2026-10-14T17:30:00Z', { occurrenceState: 'live' }),
        session('semana-passada', '2026-10-07T18:00:00Z', { occurrenceState: 'ended' }),
        session('ontem', '2026-10-13T18:00:00Z', { occurrenceState: 'ended' }),
        session('proximo-mes', '2026-11-04T18:00:00Z', { occurrenceState: 'scheduled' }),
      ],
      [cohort],
      NOW,
      TZ,
    )
    expect(groups.today.map((item) => item.session.id)).toEqual(['agora', 'hoje-noite'])
    expect(groups.upcoming.map((item) => item.session.id)).toEqual(['amanha', 'proximo-mes'])
    // Encerrados do mais recente para o mais antigo.
    expect(groups.past.map((item) => item.session.id)).toEqual(['ontem', 'semana-passada'])
    expect(groups.today[0]?.cohort?.title).toBe('Turma de sábado')
  })

  test('a reposição manda: o horário da ocorrência vale mais que o original', () => {
    const replaced = session('reposto', '2026-10-10T18:00:00Z', {
      occurrenceStartsAt: '2026-10-20T18:00:00Z',
      occurrenceEndsAt: '2026-10-20T19:30:00Z',
      occurrenceState: 'scheduled',
    })
    const groups = groupLiveAgenda([replaced], [cohort], NOW, TZ)
    expect(groups.upcoming.map((item) => item.session.id)).toEqual(['reposto'])
  })

  test('"hoje" é o dia de quem olha, no fuso dela', () => {
    // 23:30 em São Paulo ainda é dia 14; em UTC já é dia 15.
    const late = Date.parse('2026-10-15T02:30:00Z')
    expect(agendaDayKey(late, TZ)).toBe('2026-10-14')
    expect(agendaDayKey(late, 'UTC')).toBe('2026-10-15')
  })

  test('encontro marcado que passou do fim não some: vira "Não aconteceu" nos Encerrados', () => {
    const forgotten = session('esquecido', '2026-10-13T18:00:00Z', { occurrenceState: 'scheduled' })
    expect(agendaState(forgotten, NOW)).toBe('missed')
    const groups = groupLiveAgenda([forgotten], [cohort], NOW, TZ)
    expect(groups.past.map((item) => item.state)).toEqual(['missed'])
  })

  test('sem o estado do servidor, deduz pelo horário e nunca inventa gravação', () => {
    expect(agendaState(session('cedo', '2026-10-14T20:00:00Z'), NOW)).toBe('scheduled')
    expect(agendaState(session('no-horario', '2026-10-14T17:30:00Z'), NOW)).toBe('in-time')
    expect(agendaState(session('passou', '2026-10-13T17:30:00Z'), NOW)).toBe('ended')
    const groups = groupLiveAgenda([session('passou', '2026-10-13T17:30:00Z')], [cohort], NOW, TZ)
    expect(groups.past[0]?.recordingPublished).toBe(false)
  })

  test('"Gravação publicada" segue o que o servidor manda', () => {
    const ended = (recordingPublished?: boolean) =>
      groupLiveAgenda(
        [
          session('g', '2026-10-13T18:00:00Z', {
            occurrenceState: 'ended',
            ...(recordingPublished === undefined ? {} : { recordingPublished }),
          }),
        ],
        [cohort],
        NOW,
        TZ,
      ).past[0]!
    expect(ended(true).recordingPublished).toBe(true)
    expect(ended(false).recordingPublished).toBe(false)
    expect(ended().recordingPublished).toBe(false)
    expect(agendaActionLabel(ended(true), 'past')).toBe('Ver encontro')
  })

  test('o botão diz o que quem conduz vai fazer', () => {
    const groups = groupLiveAgenda(
      [
        session('aberta', '2026-10-14T17:50:00Z', { occurrenceState: 'lobby' }),
        session('mais-tarde', '2026-10-14T22:00:00Z', { occurrenceState: 'scheduled' }),
        session('amanha', '2026-10-15T18:00:00Z', { occurrenceState: 'scheduled' }),
      ],
      [cohort],
      NOW,
      TZ,
    )
    expect(groups.today.map((item) => agendaActionLabel(item, 'today'))).toEqual([
      'Entrar na sala',
      'Preparar sala',
    ])
    expect(agendaActionLabel(groups.upcoming[0]!, 'upcoming')).toBe('Ver encontro')
  })

  test('o endereço da sala e a data amigável no fuso da turma', () => {
    expect(roomHref('11111111-1111-4111-8111-111111111111')).toBe(
      '/admin/professor/ao-vivo/11111111-1111-4111-8111-111111111111',
    )
    expect(agendaWhen('2026-10-17T18:00:00Z', '2026-10-17T19:30:00Z', TZ)).toBe(
      'sáb., 17 de out. · 15:00 às 16:30',
    )
  })

  test('o horário grande do cartão e o aviso de fuso em palavras', () => {
    expect(agendaTime('2026-10-17T18:00:00Z', TZ)).toBe('15:00')
    expect(agendaZoneNote(TZ, TZ)).toBeNull()
    expect(agendaZoneNote(undefined, TZ)).toBeNull()
    expect(agendaZoneNote('America/Manaus', TZ)).toBe(
      'Horário da turma (America/Manaus), que é diferente do seu.',
    )
  })
})
