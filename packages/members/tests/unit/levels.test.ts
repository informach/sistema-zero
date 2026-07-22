import { describe, expect, test } from 'bun:test'
import {
  COURSE_TIERS,
  computeStudentLevel,
  courseTier,
  emptyQualifyingByTier,
  type QualifyingByTier,
  STUDENT_LEVELS,
} from '../../src/domain/gamification/levels'

const slots = (count: number): number[] => Array.from({ length: count }, (_, index) => index + 1)
const q = (
  partial: Partial<Record<(typeof COURSE_TIERS)[number], readonly number[]>>,
): QualifyingByTier => {
  const result = emptyQualifyingByTier()
  for (const tier of COURSE_TIERS) result[tier] = [...(partial[tier] ?? [])]
  return result
}

describe('courseTier', () => {
  test('compõe dificuldade e eixo', () => {
    expect(courseTier('iniciante', '2d')).toBe('iniciante-2d')
    expect(courseTier('avancado', '3d')).toBe('avancado-3d')
  })
})

describe('computeStudentLevel por slots obrigatórios', () => {
  test('sem curso-base permanece Faísca, mesmo com outros cursos', () => {
    const result = computeStudentLevel(q({ 'iniciante-2d': [2, 3, 4, 5, 6] }))
    expect(result.slug).toBe('noob')
    expect(result.next).toBe('coder')
    expect(result.remaining?.['iniciante-2d']).toBe(1)
  })

  test('slot 1 do Iniciante 2D libera Construtor', () => {
    const result = computeStudentLevel(q({ 'iniciante-2d': [1] }))
    expect(result.slug).toBe('coder')
    expect(result.remaining?.['iniciante-2d']).toBe(5)
  })

  test('slot repetido e bônus não substituem slots faltantes', () => {
    expect(computeStudentLevel(q({ 'iniciante-2d': [1, 1, 2, 3, 4, 99] })).slug).toBe('coder')
  })

  test('cada etapa completa libera o nível seguinte', () => {
    expect(computeStudentLevel(q({ 'iniciante-2d': slots(6) })).slug).toBe('hacker')
    expect(
      computeStudentLevel(q({ 'iniciante-2d': slots(6), 'iniciante-3d': slots(5) })).slug,
    ).toBe('explorer')
    expect(
      computeStudentLevel(
        q({
          'iniciante-2d': slots(6),
          'iniciante-3d': slots(5),
          'intermediario-2d': slots(5),
        }),
      ).slug,
    ).toBe('elite')
  })

  test('escada completa chega à Lenda', () => {
    const result = computeStudentLevel(
      q({
        'iniciante-2d': slots(6),
        'iniciante-3d': slots(5),
        'intermediario-2d': slots(5),
        'intermediario-3d': slots(5),
        'avancado-2d': slots(5),
        'avancado-3d': slots(5),
      }),
    )
    expect(result.slug).toBe('god')
    expect(result.next).toBeNull()
    expect(result.remaining).toBeNull()
  })

  test('catálogo permanece monotônico', () => {
    for (const level of STUDENT_LEVELS.slice(1)) {
      expect(computeStudentLevel(q(level.tiers)).slug).toBe(level.slug)
    }
    expect(COURSE_TIERS).toHaveLength(6)
  })
})
