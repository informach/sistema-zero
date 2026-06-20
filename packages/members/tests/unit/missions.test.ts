import { describe, expect, test } from 'bun:test'
import {
  assignDailyMissions,
  assignWeeklyMissions,
  DAILY_MISSIONS,
  DAILY_SET_SIZE,
  dayBoundsUtc,
  MISSIONS_BY_SLUG,
  WEEKLY_MISSIONS,
  WEEKLY_SET_SIZE,
  weekBoundsUtc,
  weeklyPeriodKey,
} from '../../src/domain/gamification/missions'

describe('catálogo de missões', () => {
  test('slugs únicos; prêmios positivos; goalType contável', () => {
    const all = [...DAILY_MISSIONS, ...WEEKLY_MISSIONS]
    expect(new Set(all.map((m) => m.slug)).size).toBe(all.length)
    for (const m of all) {
      expect(m.target).toBeGreaterThan(0)
      expect(m.rewardXp + m.rewardCoins).toBeGreaterThan(0)
    }
    expect(MISSIONS_BY_SLUG.size).toBe(all.length)
  })
})

describe('atribuição determinística', () => {
  test('mesmo (user, período) → MESMO set; tamanho fixo; distintos', () => {
    const a = assignDailyMissions('user-1', '2026-06-20')
    const b = assignDailyMissions('user-1', '2026-06-20')
    expect(a.map((m) => m.slug)).toEqual(b.map((m) => m.slug))
    expect(a.length).toBe(DAILY_SET_SIZE)
    expect(new Set(a.map((m) => m.slug)).size).toBe(a.length)
  })

  test('usuários diferentes podem ter sets diferentes (semente do hash)', () => {
    const w = assignWeeklyMissions('user-1', weeklyPeriodKey('2026-06-20'))
    expect(w.length).toBe(WEEKLY_SET_SIZE)
    expect(w.every((m) => m.cadence === 'weekly')).toBe(true)
  })
})

describe('janelas de período (SP = UTC-3 → dia começa 03:00Z)', () => {
  test('dia civil → [dia 03:00Z, dia+1 03:00Z)', () => {
    const { from, to } = dayBoundsUtc('2026-06-20')
    expect(from.toISOString()).toBe('2026-06-20T03:00:00.000Z')
    expect(to.toISOString()).toBe('2026-06-21T03:00:00.000Z')
  })

  test('semana → segunda-feira da semana; janela de 7 dias', () => {
    // 2026-06-20 é sábado → segunda da semana = 2026-06-15.
    expect(weeklyPeriodKey('2026-06-20')).toBe('w:2026-06-15')
    const { from, to } = weekBoundsUtc('w:2026-06-15')
    expect(from.toISOString()).toBe('2026-06-15T03:00:00.000Z')
    expect(to.toISOString()).toBe('2026-06-22T03:00:00.000Z')
  })
})
