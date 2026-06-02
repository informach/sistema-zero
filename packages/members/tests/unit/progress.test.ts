import { describe, expect, test } from 'bun:test'
import { computeProgress } from '../../src/domain/progress/progress'

describe('computeProgress', () => {
  test('curso vazio → 0% (sem divisão por zero)', () => {
    expect(computeProgress(0, 0)).toEqual({ completedLessons: 0, totalLessons: 0, percent: 0 })
  })

  test('parcial arredonda', () => {
    expect(computeProgress(1, 3)).toEqual({ completedLessons: 1, totalLessons: 3, percent: 33 })
  })

  test('tudo concluído → 100%', () => {
    expect(computeProgress(4, 4)).toEqual({ completedLessons: 4, totalLessons: 4, percent: 100 })
  })

  test('clampa completas acima do total', () => {
    expect(computeProgress(9, 4).percent).toBe(100)
    expect(computeProgress(9, 4).completedLessons).toBe(4)
  })
})
