import { describe, expect, test } from 'bun:test'
import {
  COURSE_TIERS,
  computeStudentLevel,
  courseTier,
  emptyQualifyingByTier,
  type QualifyingByTier,
  STUDENT_LEVELS,
} from '../../src/domain/gamification/levels'

const q = (partial: Partial<QualifyingByTier>): QualifyingByTier => ({
  ...emptyQualifyingByTier(),
  ...partial,
})

describe('courseTier', () => {
  test('compõe (dificuldade, eixo) → degrau', () => {
    expect(courseTier('iniciante', '2d')).toBe('iniciante-2d')
    expect(courseTier('avancado', '3d')).toBe('avancado-3d')
  })
})

describe('computeStudentLevel (escada de 8)', () => {
  test('sem cursos qualificados → Noob (Faísca); falta 1 p/ Coder', () => {
    const r = computeStudentLevel(emptyQualifyingByTier())
    expect(r.slug).toBe('noob')
    expect(r.next).toBe('coder')
    expect(r.remaining).toEqual({ any: 1, ...emptyQualifyingByTier() })
  })

  test('1 curso qualificado (qualquer degrau) → Coder; faltam 5 iniciante-2d p/ Hacker', () => {
    expect(computeStudentLevel(q({ 'intermediario-3d': 1 })).slug).toBe('coder')
    const r = computeStudentLevel(q({ 'iniciante-2d': 1 }))
    expect(r.slug).toBe('coder')
    expect(r.next).toBe('hacker')
    // Piso do Hacker = 6 iniciante-2d: feito 1 (virou Coder), faltam 5.
    expect(r.remaining).toEqual({ any: 0, ...q({ 'iniciante-2d': 5 }) })
  })

  test('6 iniciante-2d → Hacker (Inventor); faltam 5 iniciante-3d p/ Explorer', () => {
    const r = computeStudentLevel(q({ 'iniciante-2d': 6 }))
    expect(r.slug).toBe('hacker')
    expect(r.next).toBe('explorer')
    expect(r.remaining).toEqual({ any: 0, ...q({ 'iniciante-3d': 5 }) })
  })

  test('5 iniciante-2d (ainda não 6) → Coder, mesmo com muitos degraus acima', () => {
    expect(
      computeStudentLevel(q({ 'iniciante-2d': 5, 'intermediario-2d': 9, 'avancado-3d': 9 })).slug,
    ).toBe('coder')
  })

  test('6 ini-2d + 5 ini-3d → Explorer (Explorador de Mundos)', () => {
    const r = computeStudentLevel(q({ 'iniciante-2d': 6, 'iniciante-3d': 5 }))
    expect(r.slug).toBe('explorer')
    expect(r.next).toBe('elite')
    expect(r.remaining).toEqual({ any: 0, ...q({ 'intermediario-2d': 5 }) })
  })

  test('o degrau 3D é obrigatório: 6 ini-2d + 5 int-2d SEM ini-3d fica em Hacker', () => {
    // Regressão deliberada da reforma: a escada é sequencial — sem os 5 cursos
    // Iniciante 3D o aluno não passa de Inventor, mesmo com intermediários prontos.
    expect(computeStudentLevel(q({ 'iniciante-2d': 6, 'intermediario-2d': 5 })).slug).toBe('hacker')
  })

  test('+5 int-2d → Elite (Mestre dos Jogos)', () => {
    expect(
      computeStudentLevel(q({ 'iniciante-2d': 6, 'iniciante-3d': 5, 'intermediario-2d': 5 })).slug,
    ).toBe('elite')
  })

  test('+5 int-3d → Architect (Arquiteto de Mundos)', () => {
    expect(
      computeStudentLevel(
        q({ 'iniciante-2d': 6, 'iniciante-3d': 5, 'intermediario-2d': 5, 'intermediario-3d': 5 }),
      ).slug,
    ).toBe('architect')
  })

  test('+5 av-2d → Champion (Gênio da Criação)', () => {
    expect(
      computeStudentLevel(
        q({
          'iniciante-2d': 6,
          'iniciante-3d': 5,
          'intermediario-2d': 5,
          'intermediario-3d': 5,
          'avancado-2d': 5,
        }),
      ).slug,
    ).toBe('champion')
  })

  test('escada completa (6/5/5/5/5/5) → God (Lenda, topo sem próximo)', () => {
    const r = computeStudentLevel(
      q({
        'iniciante-2d': 6,
        'iniciante-3d': 5,
        'intermediario-2d': 5,
        'intermediario-3d': 5,
        'avancado-2d': 5,
        'avancado-3d': 5,
      }),
    )
    expect(r.slug).toBe('god')
    expect(r.next).toBeNull()
    expect(r.remaining).toBeNull()
  })

  test('contagens acima do piso não regridem o nível', () => {
    const maxed = q(Object.fromEntries(COURSE_TIERS.map((t) => [t, 20])))
    expect(computeStudentLevel(maxed).slug).toBe('god')
  })

  test('INVARIANTE: a escada é monotônica (cumprir um nível implica cumprir os anteriores)', () => {
    // computeStudentLevel PARA no 1º degrau que falha — um requisito que afrouxasse
    // no meio da escada tornaria níveis altos inalcançáveis. Trava o catálogo:
    // as contagens MÍNIMAS que cumprem o nível N têm que devolver exatamente N
    // (a varredura passou por todos os anteriores sem falhar).
    for (let i = 1; i < STUDENT_LEVELS.length; i++) {
      const curr = STUDENT_LEVELS[i]
      if (!curr) throw new Error('escada rasgada')
      const minimal = q(curr.tiers)
      // Cobre o requisito `any` (total mínimo) sem tocar os pisos por degrau.
      const total = COURSE_TIERS.reduce((sum, tier) => sum + minimal[tier], 0)
      if (total < curr.any) minimal['avancado-3d'] += curr.any - total
      expect(computeStudentLevel(minimal).slug).toBe(curr.slug)
    }
  })
})
