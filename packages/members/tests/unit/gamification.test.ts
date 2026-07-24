import { describe, expect, test } from 'bun:test'
import {
  advanceStreak,
  avatarStyleBadgeSlugs,
  challengeBadgeSlugs,
  courseBadgeSlugs,
  effectiveStreak,
  localDateSaoPaulo,
  muralCommenterBadgeSlugs,
  playsBadgeSlugs,
  previousDay,
  quizPassedXp,
  quizPerfectBadgeSlugs,
  remixBadgeSlugs,
  roomDecoratorBadgeSlugs,
  streakBadgeSlugs,
  XP_VALUES,
} from '../../src/domain/gamification/gamification'
import { studioPublishDaySourceId } from '../../src/domain/gamification/source-id'

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
    ).toEqual({ current: 1, best: 1, extended: true, freezesConsumed: 0 })
  })

  test('mesmo dia → mantém, NÃO extended', () => {
    expect(
      advanceStreak(
        { streakCurrent: 3, streakBest: 5, lastActivityDate: '2026-06-11' },
        '2026-06-11',
      ),
    ).toEqual({ current: 3, best: 5, extended: false, freezesConsumed: 0 })
  })

  test('ontem → +1, extended; best acompanha o máximo', () => {
    expect(
      advanceStreak(
        { streakCurrent: 5, streakBest: 5, lastActivityDate: '2026-06-10' },
        '2026-06-11',
      ),
    ).toEqual({ current: 6, best: 6, extended: true, freezesConsumed: 0 })
  })

  test('gap SEM freeze → recomeça em 1 com best PRESERVADO', () => {
    expect(
      advanceStreak(
        { streakCurrent: 9, streakBest: 12, lastActivityDate: '2026-06-08' },
        '2026-06-11',
      ),
    ).toEqual({ current: 1, best: 12, extended: true, freezesConsumed: 0 })
  })

  test('gap COBERTO por freeze → +1 e consome 1 por dia perdido', () => {
    // 08→11: faltaram 09 e 10 (2 dias). Com 2 freezes, mantém e consome 2.
    expect(
      advanceStreak(
        { streakCurrent: 9, streakBest: 12, lastActivityDate: '2026-06-08', freezes: 2 },
        '2026-06-11',
      ),
    ).toEqual({ current: 10, best: 12, extended: true, freezesConsumed: 2 })
  })

  test('gap com dias dentro das FÉRIAS não consome freeze', () => {
    // 09 e 10 dentro das férias → 0 freezes necessários, mantém a sequência.
    expect(
      advanceStreak(
        {
          streakCurrent: 9,
          streakBest: 12,
          lastActivityDate: '2026-06-08',
          freezes: 0,
          vacationFrom: '2026-06-09',
          vacationTo: '2026-06-10',
        },
        '2026-06-11',
      ),
    ).toEqual({ current: 10, best: 12, extended: true, freezesConsumed: 0 })
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

describe('playsBadgeSlugs (jogadas recebidas — retenção pós-cursos 07/2026)', () => {
  test('1º jogo com 10 plays → plays-10; 1º com 100 → plays-100; independentes', () => {
    expect(playsBadgeSlugs(0, 0)).toEqual([])
    expect(playsBadgeSlugs(1, 0)).toEqual(['plays-10'])
    expect(playsBadgeSlugs(3, 0)).toEqual(['plays-10'])
    expect(playsBadgeSlugs(1, 1)).toEqual(['plays-10', 'plays-100'])
    // Teórico (marco de 100 sem o de 10 no ledger): ainda destrava a de 100.
    expect(playsBadgeSlugs(0, 1)).toEqual(['plays-100'])
  })
})

describe('badges do full review 24/07 (remix/decorador/estilo/comentarista/desafiante)', () => {
  test('remix-first destrava no 1º remix', () => {
    expect(remixBadgeSlugs(0)).toEqual([])
    expect(remixBadgeSlugs(1)).toEqual(['remix-first'])
    expect(remixBadgeSlugs(5)).toEqual(['remix-first'])
  })
  test('room-decorator-5 e avatar-style-5 destravam no 5º item/peça', () => {
    expect(roomDecoratorBadgeSlugs(4)).toEqual([])
    expect(roomDecoratorBadgeSlugs(5)).toEqual(['room-decorator-5'])
    expect(avatarStyleBadgeSlugs(4)).toEqual([])
    expect(avatarStyleBadgeSlugs(5)).toEqual(['avatar-style-5'])
  })
  test('mural-commenter-10 destrava no 10º comentário aprovado', () => {
    expect(muralCommenterBadgeSlugs(9)).toEqual([])
    expect(muralCommenterBadgeSlugs(10)).toEqual(['mural-commenter-10'])
  })
  test('challenge: 1ª participação = challenge-first; 3ª soma challenge-3', () => {
    expect(challengeBadgeSlugs(0)).toEqual([])
    expect(challengeBadgeSlugs(1)).toEqual(['challenge-first'])
    expect(challengeBadgeSlugs(3)).toEqual(['challenge-first', 'challenge-3'])
  })
})

describe('studioPublishDaySourceId (XP diário de publicar — 1×/dia)', () => {
  test('determinístico por dia; dias diferentes → ids diferentes; formato uuid', () => {
    const a = studioPublishDaySourceId('2026-07-07')
    expect(studioPublishDaySourceId('2026-07-07')).toBe(a)
    expect(studioPublishDaySourceId('2026-07-08')).not.toBe(a)
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
  })
})
