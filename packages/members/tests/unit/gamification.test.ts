import { describe, expect, test } from 'bun:test'
import {
  advanceStreak,
  courseBadgeSlugs,
  effectiveStreak,
  localDateSaoPaulo,
  previousDay,
  quizPassedXp,
  quizPerfectBadgeSlugs,
  streakBadgeSlugs,
  XP_VALUES,
} from '../../src/domain/gamification/gamification'

describe('localDateSaoPaulo', () => {
  test('vira o dia à meia-noite de SÃO PAULO (UTC-3), não de UTC', () => {
    // 02:59Z ainda é 23:59 do dia anterior em SP; 03:00Z é a meia-noite local.
    expect(localDateSaoPaulo(new Date('2026-06-11T02:59:00.000Z'))).toBe('2026-06-10')
    expect(localDateSaoPaulo(new Date('2026-06-11T03:00:00.000Z'))).toBe('2026-06-11')
    expect(localDateSaoPaulo(new Date('2026-06-11T12:00:00.000Z'))).toBe('2026-06-11')
  })
})

describe('previousDay', () => {
  test('aritmética de calendário (mês/ano)', () => {
    expect(previousDay('2026-06-11')).toBe('2026-06-10')
    expect(previousDay('2026-06-01')).toBe('2026-05-31')
    expect(previousDay('2026-01-01')).toBe('2025-12-31')
    expect(previousDay('2026-03-01')).toBe('2026-02-28')
  })
})

describe('advanceStreak', () => {
  test('1ª atividade → streak 1, extended', () => {
    expect(
      advanceStreak({ streakCurrent: 0, streakBest: 0, lastActivityDate: null }, '2026-06-11'),
    ).toEqual({ current: 1, best: 1, extended: true })
  })

  test('mesmo dia → mantém, NÃO extended', () => {
    expect(
      advanceStreak(
        { streakCurrent: 3, streakBest: 5, lastActivityDate: '2026-06-11' },
        '2026-06-11',
      ),
    ).toEqual({ current: 3, best: 5, extended: false })
  })

  test('ontem → +1, extended; best acompanha o máximo', () => {
    expect(
      advanceStreak(
        { streakCurrent: 5, streakBest: 5, lastActivityDate: '2026-06-10' },
        '2026-06-11',
      ),
    ).toEqual({ current: 6, best: 6, extended: true })
  })

  test('gap → recomeça em 1 com best PRESERVADO', () => {
    expect(
      advanceStreak(
        { streakCurrent: 9, streakBest: 12, lastActivityDate: '2026-06-08' },
        '2026-06-11',
      ),
    ).toEqual({ current: 1, best: 12, extended: true })
  })
})

describe('effectiveStreak', () => {
  test('nunca ativo → 0', () => {
    expect(
      effectiveStreak({ streakCurrent: 0, streakBest: 0, lastActivityDate: null }, '2026-06-11'),
    ).toBe(0)
  })

  test('última atividade hoje ou ontem → valor armazenado', () => {
    const state = { streakCurrent: 4, streakBest: 9, lastActivityDate: '2026-06-11' }
    expect(effectiveStreak(state, '2026-06-11')).toBe(4)
    expect(effectiveStreak({ ...state, lastActivityDate: '2026-06-10' }, '2026-06-11')).toBe(4)
  })

  test('última atividade antes de ontem → quebrado (0)', () => {
    expect(
      effectiveStreak(
        { streakCurrent: 4, streakBest: 9, lastActivityDate: '2026-06-09' },
        '2026-06-11',
      ),
    ).toBe(0)
  })
})

describe('quizPassedXp', () => {
  test('base 20 + bônus proporcional à nota, cap em +10', () => {
    expect(quizPassedXp(100)).toBe(30)
    expect(quizPassedXp(75)).toBe(28)
    expect(quizPassedXp(60)).toBe(26)
    expect(quizPassedXp(0)).toBe(XP_VALUES.QUIZ_PASSED_BASE)
  })
})

describe('streakBadgeSlugs', () => {
  test('limiares 7/30/60/180/365 (acumulativos)', () => {
    expect(streakBadgeSlugs(6)).toEqual([])
    expect(streakBadgeSlugs(7)).toEqual(['streak-7'])
    expect(streakBadgeSlugs(29)).toEqual(['streak-7'])
    expect(streakBadgeSlugs(30)).toEqual(['streak-7', 'streak-30'])
    expect(streakBadgeSlugs(59)).toEqual(['streak-7', 'streak-30'])
    expect(streakBadgeSlugs(60)).toEqual(['streak-7', 'streak-30', 'streak-60'])
    expect(streakBadgeSlugs(180)).toEqual(['streak-7', 'streak-30', 'streak-60', 'streak-180'])
    expect(streakBadgeSlugs(365)).toEqual([
      'streak-7',
      'streak-30',
      'streak-60',
      'streak-180',
      'streak-365',
    ])
  })
})

describe('quizPerfectBadgeSlugs', () => {
  test('marcos de 1/10/30 notas mil', () => {
    expect(quizPerfectBadgeSlugs(0)).toEqual([])
    expect(quizPerfectBadgeSlugs(1)).toEqual(['quiz-perfect'])
    expect(quizPerfectBadgeSlugs(9)).toEqual(['quiz-perfect'])
    expect(quizPerfectBadgeSlugs(10)).toEqual(['quiz-perfect', 'quiz-perfect-10'])
    expect(quizPerfectBadgeSlugs(30)).toEqual([
      'quiz-perfect',
      'quiz-perfect-10',
      'quiz-perfect-30',
    ])
  })
})

describe('courseBadgeSlugs', () => {
  test('marcos de 1/2/3 cursos concluídos', () => {
    expect(courseBadgeSlugs(0)).toEqual([])
    expect(courseBadgeSlugs(1)).toEqual(['course-complete'])
    expect(courseBadgeSlugs(2)).toEqual(['course-complete', 'course-complete-2'])
    expect(courseBadgeSlugs(3)).toEqual([
      'course-complete',
      'course-complete-2',
      'course-complete-3',
    ])
    // Acima de 3 não há marco novo (cap do catálogo v1).
    expect(courseBadgeSlugs(7)).toEqual([
      'course-complete',
      'course-complete-2',
      'course-complete-3',
    ])
  })
})
