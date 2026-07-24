import { describe, expect, test } from 'bun:test'
import {
  CREATOR_CAREER_LEVELS,
  computeCareerLevelSlug,
  creatorCareerLevel,
  meetsCareerLevel,
  missingCareerSlots,
  resolveCareerCourseLock,
} from '../src/career'

describe('catálogo da Carreira do Criador', () => {
  test('exige o curso-base específico para virar Construtor', () => {
    expect(computeCareerLevelSlug({ 'iniciante-2d': [2, 3, 4, 5, 6] })).toBe('noob')
    expect(computeCareerLevelSlug({ 'iniciante-2d': [1] })).toBe('coder')
  })

  test('curso bônus ou slot repetido não substitui slot obrigatório', () => {
    expect(computeCareerLevelSlug({ 'iniciante-2d': [1, 1, 2, 3, 4, 99] })).toBe('coder')
    expect(computeCareerLevelSlug({ 'iniciante-2d': [1, 2, 3, 4, 5, 6] })).toBe('hacker')
  })

  test('a escada completa termina na Lenda', () => {
    const all = {
      'iniciante-2d': [1, 2, 3, 4, 5, 6],
      'iniciante-3d': [1, 2, 3, 4, 5],
      'intermediario-2d': [1, 2, 3, 4, 5],
      'intermediario-3d': [1, 2, 3, 4, 5],
      'avancado-2d': [1, 2, 3, 4, 5],
      'avancado-3d': [1, 2, 3, 4, 5],
    } as const
    expect(computeCareerLevelSlug(all)).toBe('god')
    expect(meetsCareerLevel(all, creatorCareerLevel('god'))).toBe(true)
  })

  test('informa exatamente quais slots faltam', () => {
    expect(missingCareerSlots({ 'iniciante-2d': [1, 3, 6] }, creatorCareerLevel('hacker'))).toEqual(
      { 'iniciante-2d': [2, 4, 5] },
    )
  })

  test('recompensas seguem aprender primeiro, liberar depois', () => {
    expect(creatorCareerLevel('noob').reward.freeStudio).toBe(false)
    expect(creatorCareerLevel('coder').reward.blockProfileId).toBe('2d-essential')
    expect(creatorCareerLevel('hacker').reward.blockLevel).toBe('iniciante-2d')
    expect(creatorCareerLevel('champion').reward.pro).toBe(false)
    expect(creatorCareerLevel('god').reward.pro).toBe(true)
  })

  test('catálogo é monotônico', () => {
    for (let index = 1; index < CREATOR_CAREER_LEVELS.length; index++) {
      const level = CREATOR_CAREER_LEVELS[index]!
      const qualified = level.requiredSlots
      expect(computeCareerLevelSlug(qualified)).toBe(level.slug)
    }
  })

  test('curso-base abre primeiro e depois libera os pares da etapa', () => {
    const none = {}
    expect(resolveCareerCourseLock(none, 'iniciante-2d', 1)).toEqual({ locked: false })
    // foundation-first NÃO carrega requiredLevel: a chave é o curso-base, não um
    // nível (o 1º nível com este learningTier seria `noob` — dado sem sentido).
    expect(resolveCareerCourseLock(none, 'iniciante-2d', 2)).toEqual({
      locked: true,
      reason: 'foundation-first',
      requiredTier: 'iniciante-2d',
    })
    expect(resolveCareerCourseLock({ 'iniciante-2d': [1] }, 'iniciante-2d', 2)).toEqual({
      locked: false,
    })
  })

  test('etapas futuras ficam bloqueadas e etapas anteriores são revisáveis', () => {
    const qualified = { 'iniciante-2d': [1, 2, 3, 4, 5, 6] }
    expect(resolveCareerCourseLock(qualified, 'iniciante-2d', 4)).toEqual({ locked: false })
    expect(resolveCareerCourseLock(qualified, 'iniciante-3d', 1)).toEqual({ locked: false })
    expect(resolveCareerCourseLock(qualified, 'intermediario-2d', 1)).toMatchObject({
      locked: true,
      reason: 'future-tier',
      requiredLevel: 'explorer',
    })
  })

  test('curso bônus não participa da trava', () => {
    expect(resolveCareerCourseLock({}, 'avancado-3d', null)).toEqual({ locked: false })
  })

  test('sem curso-base publicado na etapa, foundation-first falha ABERTA', () => {
    // A posição 2 travaria (foundation-first) por padrão…
    expect(resolveCareerCourseLock({}, 'iniciante-2d', 2)).toMatchObject({
      locked: true,
      reason: 'foundation-first',
    })
    // …mas sem base alcançável (foundationAvailable=false) não pode prender o aluno.
    expect(resolveCareerCourseLock({}, 'iniciante-2d', 2, false)).toEqual({ locked: false })
    // future-tier NÃO é afetado pelo fail-open (a base da etapa futura é irrelevante).
    expect(resolveCareerCourseLock({}, 'intermediario-2d', 2, false)).toMatchObject({
      locked: true,
      reason: 'future-tier',
    })
  })
})
