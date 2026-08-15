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

/** O curso de ENTRADA concluído e publicado — a régua do Construtor(a) desde 14/08. */
const ENTRADA = { 'primeiros-passos-2d': [1] } as const

describe('courseTier', () => {
  test('compõe dificuldade e eixo', () => {
    expect(courseTier('iniciante', '2d')).toBe('iniciante-2d')
    expect(courseTier('avancado', '3d')).toBe('avancado-3d')
    expect(courseTier('primeiros-passos', '2d')).toBe('primeiros-passos-2d')
  })

  test('par que não é degrau da carreira devolve null, não uma etapa inventada', () => {
    // Só existe `primeiros-passos-2d`. Sem o guard, `primeiros-passos-3d` viraria chave
    // fantasma no mapa de slots e o marco sumiria em silêncio.
    expect(courseTier('primeiros-passos', '3d')).toBeNull()
  })
})

describe('computeStudentLevel por slots obrigatórios', () => {
  test('sem o curso de ENTRADA permanece Faísca, mesmo com outros cursos', () => {
    const result = computeStudentLevel(q({ 'iniciante-2d': slots(8) }))
    expect(result.slug).toBe('noob')
    expect(result.next).toBe('coder')
    expect(result.remaining?.['primeiros-passos-2d']).toBe(1)
  })

  test('o curso de ENTRADA libera Construtor', () => {
    const result = computeStudentLevel(q(ENTRADA))
    expect(result.slug).toBe('coder')
    // Faltam as 8 posições do Iniciante 2D p/ virar Inventor(a): são 9 cursos de Faísca até
    // lá (1 + 8), desde que a usuária desfez o encolhimento do degrau em 15/08.
    expect(result.remaining?.['iniciante-2d']).toBe(8)
    expect(result.remaining?.['primeiros-passos-2d']).toBe(0)
  })

  test('slot repetido e bônus não substituem slots faltantes', () => {
    expect(computeStudentLevel(q({ 'primeiros-passos-2d': [1, 1, 99] })).slug).toBe('coder')
  })

  test('cada etapa completa libera o nível seguinte', () => {
    expect(computeStudentLevel(q({ ...ENTRADA, 'iniciante-2d': slots(8) })).slug).toBe('hacker')
    expect(
      computeStudentLevel(q({ ...ENTRADA, 'iniciante-2d': slots(8), 'iniciante-3d': slots(8) }))
        .slug,
    ).toBe('explorer')
    expect(
      computeStudentLevel(
        q({
          ...ENTRADA,
          'iniciante-2d': slots(8),
          'iniciante-3d': slots(8),
          'intermediario-2d': slots(8),
        }),
      ).slug,
    ).toBe('elite')
  })

  test('escada completa chega à Lenda', () => {
    const result = computeStudentLevel(
      q({
        ...ENTRADA,
        'iniciante-2d': slots(8),
        'iniciante-3d': slots(8),
        'intermediario-2d': slots(8),
        'intermediario-3d': slots(8),
        'avancado-2d': slots(8),
        'avancado-3d': slots(8),
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
    expect(COURSE_TIERS).toHaveLength(7)
  })

  test('o `remaining` traz TODOS os degraus, inclusive o de entrada', () => {
    // A forma do `remaining` mudou de 6 para 7 chaves: members e kids sobem no MESMO trem.
    const result = computeStudentLevel(emptyQualifyingByTier())
    for (const tier of COURSE_TIERS) {
      expect(result.remaining?.[tier]).toBeDefined()
    }
    expect(Object.keys(result.remaining ?? {})).toHaveLength(COURSE_TIERS.length + 1)
  })
})
