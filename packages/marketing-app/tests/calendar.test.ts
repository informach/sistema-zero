import { describe, expect, it } from 'bun:test'
import {
  addDaysToKey,
  addMonths,
  dayOfMonth,
  monthGrid,
  monthLabel,
  moveIsoToDayKeepingTime,
  weekDays,
} from '../src/lib/calendar'

describe('calendar (grade mensal pura)', () => {
  it('sempre 42 células, começando no domingo', () => {
    // Julho/2026 começa numa quarta-feira.
    const grid = monthGrid(2026, 6, '2026-07-07')
    expect(grid).toHaveLength(42)
    expect(grid[0]?.dayKey).toBe('2026-06-28') // domingo anterior
    expect(grid.filter((c) => c.inMonth)).toHaveLength(31)
    expect(grid.find((c) => c.isToday)?.dayKey).toBe('2026-07-07')
  })

  it('mês que começa no domingo abre a grade no dia 1', () => {
    // Março/2026 começa num domingo.
    const grid = monthGrid(2026, 2, '2026-07-07')
    expect(grid[0]?.dayKey).toBe('2026-03-01')
    expect(grid[0]?.inMonth).toBe(true)
  })

  it('fevereiro bissexto tem 29 células no mês', () => {
    const grid = monthGrid(2028, 1, '2026-07-07')
    expect(grid.filter((c) => c.inMonth)).toHaveLength(29)
    expect(grid.some((c) => c.dayKey === '2028-02-29')).toBe(true)
  })

  it('weekDays cobre a virada de mês/ano', () => {
    // 2026-01-01 é quinta — a semana começa em 2025-12-28 (domingo).
    const week = weekDays('2026-01-01', '2026-07-07')
    expect(week).toHaveLength(7)
    expect(week[0]?.dayKey).toBe('2025-12-28')
    expect(week[6]?.dayKey).toBe('2026-01-03')
  })

  it('addMonths normaliza a virada de ano (pra frente e pra trás)', () => {
    expect(addMonths(2026, 11, 1)).toEqual({ year: 2027, month0: 0 })
    expect(addMonths(2026, 0, -1)).toEqual({ year: 2025, month0: 11 })
    expect(addMonths(2026, 6, -18)).toEqual({ year: 2025, month0: 0 })
  })

  it('addDaysToKey e dayOfMonth', () => {
    expect(addDaysToKey('2026-07-31', 1)).toBe('2026-08-01')
    expect(addDaysToKey('2026-01-01', -1)).toBe('2025-12-31')
    expect(dayOfMonth('2026-07-09')).toBe(9)
  })

  it('monthLabel em PT', () => {
    expect(monthLabel(2026, 6)).toBe('Julho de 2026')
  })

  describe('moveIsoToDayKeepingTime (drag do calendário)', () => {
    it('muda o dia e PRESERVA a hora de SP', () => {
      // 15:30 em SP = 18:30Z.
      const iso = '2026-07-10T18:30:00.000Z'
      const moved = moveIsoToDayKeepingTime(iso, '2026-07-20')
      expect(moved).toBe('2026-07-20T18:30:00.000Z')
    })
    it('preserva a hora na virada de dia UTC (23h SP = 02hZ do dia seguinte)', () => {
      // 23:00 de 10/07 em SP = 02:00Z de 11/07.
      const iso = '2026-07-11T02:00:00.000Z'
      const moved = moveIsoToDayKeepingTime(iso, '2026-07-20')
      // 23:00 de 20/07 em SP = 02:00Z de 21/07.
      expect(moved).toBe('2026-07-21T02:00:00.000Z')
    })
  })
})
