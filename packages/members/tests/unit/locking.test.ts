import { describe, expect, test } from 'bun:test'
import { isLessonLocked, lockedLessonIds } from '../../src/domain/progress/locking'

const ORDERED = ['a', 'b', 'c', 'd']

describe('isLessonLocked (trava sequencial)', () => {
  test('a 1ª aula publicada nunca trava (sem anterior)', () => {
    expect(isLessonLocked(ORDERED, 'a', [])).toBe(false)
  })

  test('trava enquanto a anterior não está concluída', () => {
    expect(isLessonLocked(ORDERED, 'b', [])).toBe(true)
    expect(isLessonLocked(ORDERED, 'c', ['a'])).toBe(true)
  })

  test('libera quando TODAS as anteriores estão concluídas', () => {
    expect(isLessonLocked(ORDERED, 'b', ['a'])).toBe(false)
    expect(isLessonLocked(ORDERED, 'c', ['a', 'b'])).toBe(false)
  })

  test('aula JÁ concluída nunca trava, mesmo com uma anterior reaberta', () => {
    // 'b' concluída mas 'a' não → ainda assim liberada (nunca regride).
    expect(isLessonLocked(ORDERED, 'b', ['b'])).toBe(false)
  })

  test('aceita Set ou array de concluídas (mesma resposta)', () => {
    expect(isLessonLocked(ORDERED, 'c', new Set(['a', 'b']))).toBe(false)
    expect(isLessonLocked(ORDERED, 'c', new Set(['a']))).toBe(true)
  })

  test('id fora da lista cai no fallback conservador (todas as outras = anteriores)', () => {
    expect(isLessonLocked(ORDERED, 'x', [])).toBe(true)
    expect(isLessonLocked(ORDERED, 'x', ['a', 'b', 'c', 'd'])).toBe(false)
  })
})

describe('lockedLessonIds (lote)', () => {
  test('nada concluído → tudo travado menos a 1ª', () => {
    expect(lockedLessonIds(ORDERED, [])).toEqual(new Set(['b', 'c', 'd']))
  })

  test('1ª concluída → libera a 2ª, trava o resto', () => {
    expect(lockedLessonIds(ORDERED, ['a'])).toEqual(new Set(['c', 'd']))
  })

  test('conclusão com BURACO: a concluída não trava, mas não destrava as posteriores', () => {
    // 'a' e 'c' feitas, 'b' não → 'b' liberada (é a próxima), 'c' não trava (feita),
    // 'd' trava (sua anterior 'b' está pendente).
    expect(lockedLessonIds(ORDERED, ['a', 'c'])).toEqual(new Set(['d']))
  })

  test('tudo concluído → nada travado', () => {
    expect(lockedLessonIds(ORDERED, ['a', 'b', 'c', 'd'])).toEqual(new Set())
  })
})
