import { describe, expect, test } from 'bun:test'
import { COURSE_TIER_LABELS, COURSE_TIERS, courseTierOf } from '../src/lib/course-tier'

describe('course-tier — degrau (dificuldade × eixo) compartilhado dos apps de aluno', () => {
  test('a escada tem 6 degraus na ordem 2D-antes-de-3D (mesma do studio/members)', () => {
    expect(COURSE_TIERS).toEqual([
      'iniciante-2d',
      'iniciante-3d',
      'intermediario-2d',
      'intermediario-3d',
      'avancado-2d',
      'avancado-3d',
    ])
  })

  test('todo degrau tem rótulo de exibição', () => {
    for (const tier of COURSE_TIERS) {
      expect(COURSE_TIER_LABELS[tier]).toBeTruthy()
    }
    expect(COURSE_TIER_LABELS['iniciante-2d']).toBe('Iniciante 2D')
    expect(COURSE_TIER_LABELS['avancado-3d']).toBe('Avançado 3D')
  })

  test('courseTierOf compõe o par; track ausente (members antigo) cai em 2d', () => {
    expect(courseTierOf('iniciante', '3d')).toBe('iniciante-3d')
    expect(courseTierOf('avancado', '2d')).toBe('avancado-2d')
    expect(courseTierOf('intermediario')).toBe('intermediario-2d')
    expect(courseTierOf(undefined, '3d')).toBeUndefined()
  })
})
