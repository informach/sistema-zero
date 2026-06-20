import { describe, expect, test } from 'bun:test'
import {
  applyDailyCap,
  COIN_VALUES,
  DAILY_COIN_CAP,
  quizPassedCoins,
  streakMilestoneCoins,
} from '../../src/domain/gamification/coins'

describe('coins — quizPassedCoins', () => {
  test('base + bônus proporcional à nota (cap +5)', () => {
    expect(quizPassedCoins(0)).toBe(COIN_VALUES.QUIZ_PASSED_BASE)
    expect(quizPassedCoins(100)).toBe(
      COIN_VALUES.QUIZ_PASSED_BASE + COIN_VALUES.QUIZ_SCORE_BONUS_MAX,
    )
    expect(quizPassedCoins(50)).toBe(COIN_VALUES.QUIZ_PASSED_BASE + 3) // round(50/20)=3
    expect(quizPassedCoins(40)).toBe(COIN_VALUES.QUIZ_PASSED_BASE + 2) // round(40/20)=2
  })
})

describe('coins — streakMilestoneCoins', () => {
  test('só os marcos alcançados; acumulam em ordem', () => {
    expect(streakMilestoneCoins(6)).toEqual([])
    expect(streakMilestoneCoins(7)).toEqual([{ sourceId: 'streak:7', amount: 20 }])
    expect(streakMilestoneCoins(30).map((m) => m.sourceId)).toEqual(['streak:7', 'streak:30'])
    expect(streakMilestoneCoins(365).reduce((sum, m) => sum + m.amount, 0)).toBe(
      20 + 50 + 80 + 150 + 300,
    )
  })
})

describe('coins — applyDailyCap', () => {
  test('abaixo do teto → concede integral', () => {
    const r = applyDailyCap([5, 15], 0, DAILY_COIN_CAP)
    expect(r.granted).toEqual([5, 15])
    expect(r.totalGranted).toBe(20)
    expect(r.capped).toBe(false)
  })

  test('corta no teto, descartando o excedente em ordem', () => {
    const r = applyDailyCap([5, 15], 95, 100) // só 5 de espaço
    expect(r.granted).toEqual([5, 0])
    expect(r.totalGranted).toBe(5)
    expect(r.capped).toBe(true)
  })

  test('teto já atingido → tudo zero', () => {
    const r = applyDailyCap([5], 100, 100)
    expect(r.granted).toEqual([0])
    expect(r.totalGranted).toBe(0)
    expect(r.capped).toBe(true)
  })

  test('corte parcial de um único candidato', () => {
    const r = applyDailyCap([15], 90, 100) // espaço 10
    expect(r.granted).toEqual([10])
    expect(r.capped).toBe(true)
  })
})
