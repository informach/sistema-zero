import { describe, expect, test } from 'bun:test'
import {
  calendarDaysBetween,
  countdown,
  durationLabel,
  friendlyWhen,
  liveHour,
  liveScheduleState,
} from '../src/lib/live/schedule'

// Sábado, 17/10/2026, 10h em São Paulo (13h UTC).
const now = new Date('2026-10-17T13:00:00Z')
const zone = 'America/Sao_Paulo'

describe('datas como a criança lê', () => {
  test('hora redonda e com minutos', () => {
    expect(liveHour(new Date('2026-10-17T18:00:00Z'), zone)).toBe('15h')
    expect(liveHour(new Date('2026-10-17T18:30:00Z'), zone)).toBe('15h30')
  })
  test('hoje, amanhã e um dia da semana com data', () => {
    expect(friendlyWhen('2026-10-17T18:00:00Z', zone, now)).toBe('Hoje, às 15h')
    expect(friendlyWhen('2026-10-18T12:00:00Z', zone, now)).toBe('Amanhã, às 9h')
    expect(friendlyWhen('2026-10-24T18:00:00Z', zone, now)).toBe('Sábado, 24 de outubro, às 15h')
  })
  test('a virada do dia segue o fuso da turma, não o UTC', () => {
    // 23h30 de sábado em São Paulo já é domingo em UTC.
    expect(friendlyWhen('2026-10-18T02:30:00Z', zone, now)).toBe('Hoje, às 23h30')
    expect(calendarDaysBetween(now, new Date('2026-10-18T02:30:00Z'), zone)).toBe(0)
  })
  test('contagem regressiva', () => {
    expect(countdown('2026-10-24T18:00:00Z', zone, now)).toBe('Faltam 7 dias')
    expect(countdown('2026-10-18T18:00:00Z', zone, now)).toBe('Falta 1 dia')
    expect(countdown('2026-10-17T15:30:00Z', zone, now)).toBe('Começa em 2 horas')
    expect(countdown('2026-10-17T13:10:00Z', zone, now)).toBe('Começa em 10 minutos')
    expect(countdown('2026-10-17T12:00:00Z', zone, now)).toBeNull()
  })
  test('duração', () => {
    expect(durationLabel('2026-10-17T18:00:00Z', '2026-10-17T19:15:00Z')).toBe('1h15')
    expect(durationLabel('2026-10-17T18:00:00Z', '2026-10-17T19:00:00Z')).toBe('1h')
    expect(durationLabel('2026-10-17T18:00:00Z', '2026-10-17T18:45:00Z')).toBe('45 min')
    expect(durationLabel('2026-10-17T18:00:00Z', null)).toBeNull()
  })
})

describe('estado do encontro na agenda', () => {
  const base = { startsAt: '2026-10-17T18:00:00Z', accessEndsAt: '2026-11-17T18:00:00Z' }
  test('mais tarde hoje × outro dia', () => {
    expect(liveScheduleState(base, zone, now)).toBe('today')
    expect(liveScheduleState({ ...base, startsAt: '2026-10-24T18:00:00Z' }, zone, now)).toBe(
      'upcoming',
    )
  })
  test('15 min antes a sala pode estar abrindo', () => {
    expect(liveScheduleState(base, zone, new Date('2026-10-17T17:50:00Z'))).toBe('soon')
  })
  test('passou do horário sem a professora abrir: nunca "ao vivo" de mentira', () => {
    expect(
      liveScheduleState(
        { ...base, occurrenceState: 'scheduled' },
        zone,
        new Date('2026-10-17T18:05:00Z'),
      ),
    ).toBe('soon')
  })
  test('ao vivo, encerrado, cancelado e vencido', () => {
    expect(liveScheduleState({ ...base, occurrenceState: 'live' }, zone, now)).toBe('live')
    expect(liveScheduleState({ ...base, occurrenceState: 'ended' }, zone, now)).toBe('ended')
    expect(liveScheduleState({ ...base, occurrenceState: 'cancelled' }, zone, now)).toBe(
      'cancelled',
    )
    expect(liveScheduleState(base, zone, new Date('2026-11-18T00:00:00Z'))).toBe('expired')
  })
  test('sem o estado do servidor, o horário decide', () => {
    const window = { ...base, occurrenceEndsAt: '2026-10-17T19:15:00Z' }
    expect(liveScheduleState(window, zone, new Date('2026-10-17T18:30:00Z'))).toBe('live')
    expect(liveScheduleState(window, zone, new Date('2026-10-17T20:00:00Z'))).toBe('ended')
  })
})
