import { describe, expect, test } from 'bun:test'
import { computeAiCredits } from '../../src/domain/ai-usage/ai-credits'

const base = { usedDay: 0, usedMonth: 0, dailyLimit: 50, monthlyLimit: 500, unlimited: false }

describe('computeAiCredits', () => {
  test('devolve o que resta de cada teto', () => {
    const credits = computeAiCredits({
      ...base,
      now: new Date('2026-08-06T15:00:00Z'),
      usedDay: 37,
      usedMonth: 180,
    })
    expect(credits.dayLimit).toBe(50)
    expect(credits.dayRemaining).toBe(13)
    expect(credits.monthLimit).toBe(500)
    expect(credits.monthRemaining).toBe(320)
  })

  test('nunca devolve negativo (equipe consome acima do teto)', () => {
    const credits = computeAiCredits({
      ...base,
      now: new Date('2026-08-06T15:00:00Z'),
      usedDay: 73,
      usedMonth: 640,
      unlimited: true,
    })
    expect(credits.dayRemaining).toBe(0)
    expect(credits.monthRemaining).toBe(0)
    expect(credits.unlimited).toBe(true)
  })

  test('sem privilégio o campo unlimited nem aparece', () => {
    const credits = computeAiCredits({ ...base, now: new Date('2026-08-06T15:00:00Z') })
    expect(credits.unlimited).toBeUndefined()
  })

  test('o mês renova no dia 1 do mês seguinte, em data CIVIL de São Paulo', () => {
    const credits = computeAiCredits({ ...base, now: new Date('2026-08-06T15:00:00Z') })
    expect(credits.monthRenewsOn).toBe('2026-09-01')
  })

  test('dezembro renova em janeiro do ano seguinte', () => {
    const credits = computeAiCredits({ ...base, now: new Date('2026-12-20T15:00:00Z') })
    expect(credits.monthRenewsOn).toBe('2027-01-01')
  })

  test('02:59Z ainda é o mês do dia ANTERIOR em SP (a virada é 03:00Z)', () => {
    // 2026-09-01T02:59Z = 31/08 23:59 em São Paulo: o mês corrente ainda é agosto,
    // então o "renova" é o 1º de setembro que está a 1 minuto de distância.
    const credits = computeAiCredits({ ...base, now: new Date('2026-09-01T02:59:00Z') })
    expect(credits.monthRenewsOn).toBe('2026-09-01')
  })

  test('03:00Z abre o mês novo e o renova salta para o mês seguinte', () => {
    const credits = computeAiCredits({ ...base, now: new Date('2026-09-01T03:00:00Z') })
    expect(credits.monthRenewsOn).toBe('2026-10-01')
  })
})
