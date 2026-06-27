import { describe, expect, test } from 'bun:test'
import type { ModuleWithLessons } from '../../src/domain/course/course'
import { computeProgress, resolveContinueLesson } from '../../src/domain/progress/progress'

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

describe('resolveContinueLesson', () => {
  const lesson = (id: string, sortOrder: number) => ({
    id,
    moduleId: 'm1',
    courseId: 'c1',
    slug: id,
    title: id,
    sortOrder,
    estimatedMinutes: null,
    isPublished: true,
  })
  const outline: ModuleWithLessons[] = [
    {
      id: 'm1',
      courseId: 'c1',
      title: 'Módulo 1',
      summary: null,
      sortOrder: 0,
      lessons: [lesson('a1', 0), lesson('a2', 1), lesson('a3', 2)],
    },
  ]

  test('última acessada não concluída vence', () => {
    expect(resolveContinueLesson(outline, new Set(['a1']), 'a3')).toBe('a3')
  })

  test('última acessada concluída → primeira não concluída', () => {
    expect(resolveContinueLesson(outline, new Set(['a1']), 'a1')).toBe('a2')
  })

  test('sem acesso prévio → primeira não concluída', () => {
    expect(resolveContinueLesson(outline, new Set(), null)).toBe('a1')
    expect(resolveContinueLesson(outline, new Set(['a1', 'a2']), null)).toBe('a3')
  })

  test('tudo concluído → primeira aula (revisão)', () => {
    expect(resolveContinueLesson(outline, new Set(['a1', 'a2', 'a3']), null)).toBe('a1')
  })

  test('última acessada fora do outline é ignorada', () => {
    expect(resolveContinueLesson(outline, new Set(), 'aula-removida')).toBe('a1')
  })

  test('última acessada travada é ignorada e cai na primeira pendente liberada', () => {
    expect(resolveContinueLesson(outline, new Set(), 'a3', new Set(['a2', 'a3']))).toBe('a1')
  })

  test('curso sem aulas → null', () => {
    expect(resolveContinueLesson([], new Set(), null)).toBeNull()
  })
})
