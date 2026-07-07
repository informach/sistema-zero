import { describe, expect, it } from 'bun:test'
import {
  datetimeLocalToIso,
  formatShortSp,
  formatTimeSp,
  isoToDatetimeLocalSp,
  isoToSaoPauloDayKey,
  spDayWindow,
  todayDayKeySp,
} from '../src/lib/dates'

describe('dates (SP, offset fixo -03:00)', () => {
  it('datetime-local ↔ ISO roundtrip', () => {
    const iso = datetimeLocalToIso('2026-07-10T15:30')
    expect(iso).toBe('2026-07-10T18:30:00.000Z')
    expect(isoToDatetimeLocalSp(iso ?? '')).toBe('2026-07-10T15:30')
  })

  it('datetime-local inválido → null', () => {
    expect(datetimeLocalToIso('lixo')).toBeNull()
    expect(datetimeLocalToIso('2026-07-10')).toBeNull()
  })

  it('isoToSaoPauloDayKey na virada de dia UTC', () => {
    // 02:59Z de 11/07 ainda é 23:59 de 10/07 em SP.
    expect(isoToSaoPauloDayKey('2026-07-11T02:59:00Z')).toBe('2026-07-10')
    // 03:00Z de 11/07 já é 00:00 de 11/07 em SP.
    expect(isoToSaoPauloDayKey('2026-07-11T03:00:00Z')).toBe('2026-07-11')
  })

  it('spDayWindow devolve [início, início do dia seguinte)', () => {
    const window = spDayWindow('2026-07-10')
    expect(window.fromIso).toBe('2026-07-10T03:00:00.000Z')
    expect(window.toIso).toBe('2026-07-11T03:00:00.000Z')
  })

  it('todayDayKeySp segue o dia civil de SP', () => {
    expect(todayDayKeySp(new Date('2026-07-11T02:00:00Z'))).toBe('2026-07-10')
    expect(todayDayKeySp(new Date('2026-07-11T12:00:00Z'))).toBe('2026-07-11')
  })

  it('formatShortSp e formatTimeSp', () => {
    expect(formatShortSp('2026-07-10T18:30:00Z')).toBe('10/07 15:30')
    expect(formatTimeSp('2026-07-10T18:30:00Z')).toBe('15:30')
    expect(formatShortSp('lixo')).toBe('')
  })
})
