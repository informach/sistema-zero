import { describe, expect, test } from 'bun:test'
import {
  CAREER_LEVEL_SLUGS,
  CAREER_SLOT_MAX,
  CREATOR_CAREER_LEVELS,
  careerLevelAtLeast,
  computeCareerLevelSlug,
  creatorCareerLevel,
  meetsCareerLevel,
  missingCareerSlots,
  resolveCareerCourseLock,
} from '../src/career'

describe('careerLevelAtLeast', () => {
  test('compara pela posição na carreira e falha fechado para slugs inválidos', () => {
    expect(careerLevelAtLeast('coder', 'hacker')).toBe(false)
    expect(careerLevelAtLeast('hacker', 'hacker')).toBe(true)
    expect(careerLevelAtLeast('god', 'hacker')).toBe(true)
    for (const slug of [undefined, null, '', 'inventor']) {
      expect(careerLevelAtLeast(slug, 'hacker')).toBe(false)
    }
  })

  test('todo degrau satisfaz a si mesmo e ao primeiro degrau', () => {
    for (const slug of CAREER_LEVEL_SLUGS) {
      expect(careerLevelAtLeast(slug, slug)).toBe(true)
      expect(careerLevelAtLeast(slug, CAREER_LEVEL_SLUGS[0])).toBe(true)
    }
  })
})

describe('catálogo da Carreira do Criador', () => {
  test('CAREER_SLOT_MAX é a fonte única do teto de posições por degrau', () => {
    // Toda etapa exige exatamente as posições 1..CAREER_SLOT_MAX na Lenda — o
    // members (validação + CHECK da migration 0053) e o admin (conformance)
    // espelham este valor; divergir aqui é quebrar o elo canônico.
    const god = CREATOR_CAREER_LEVELS.at(-1)
    expect(god?.slug).toBe('god')
    const tiers = Object.values(god?.requiredSlots ?? {})
    expect(tiers.length).toBeGreaterThan(0)
    for (const slots of tiers) {
      expect(slots.length).toBe(CAREER_SLOT_MAX)
      expect(Math.max(...slots)).toBe(CAREER_SLOT_MAX)
    }
  })
  test('exige o curso-base específico para virar Construtor', () => {
    expect(computeCareerLevelSlug({ 'iniciante-2d': [2, 3, 4, 5, 6] })).toBe('noob')
    expect(computeCareerLevelSlug({ 'iniciante-2d': [1] })).toBe('coder')
  })

  test('curso bônus ou slot repetido não substitui slot obrigatório', () => {
    expect(computeCareerLevelSlug({ 'iniciante-2d': [1, 1, 2, 3, 4, 99] })).toBe('coder')
    expect(computeCareerLevelSlug({ 'iniciante-2d': [1, 2, 3, 4, 5, 6, 7, 8] })).toBe('hacker')
  })

  test('a escada completa termina na Lenda', () => {
    const all = {
      'iniciante-2d': [1, 2, 3, 4, 5, 6, 7, 8],
      'iniciante-3d': [1, 2, 3, 4, 5, 6, 7, 8],
      'intermediario-2d': [1, 2, 3, 4, 5, 6, 7, 8],
      'intermediario-3d': [1, 2, 3, 4, 5, 6, 7, 8],
      'avancado-2d': [1, 2, 3, 4, 5, 6, 7, 8],
      'avancado-3d': [1, 2, 3, 4, 5, 6, 7, 8],
    } as const
    expect(computeCareerLevelSlug(all)).toBe('god')
    expect(meetsCareerLevel(all, creatorCareerLevel('god'))).toBe(true)
  })

  test('informa exatamente quais slots faltam', () => {
    expect(missingCareerSlots({ 'iniciante-2d': [1, 3, 6] }, creatorCareerLevel('hacker'))).toEqual(
      { 'iniciante-2d': [2, 4, 5, 7, 8] },
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
    const qualified = { 'iniciante-2d': [1, 2, 3, 4, 5, 6, 7, 8] }
    expect(resolveCareerCourseLock(qualified, 'iniciante-2d', 4)).toEqual({ locked: false })
    expect(resolveCareerCourseLock(qualified, 'iniciante-3d', 1)).toEqual({ locked: false })
    expect(resolveCareerCourseLock(qualified, 'intermediario-2d', 1)).toMatchObject({
      locked: true,
      reason: 'future-tier',
      requiredLevel: 'explorer',
    })
  })

  test('curso bônus é RECOMPENSA da etapa: abre quando ela completa', () => {
    // Etapa atual incompleta → travado como recompensa, apontando o nível-alvo
    // (o que o aluno vira ao completar a etapa).
    expect(resolveCareerCourseLock({}, 'iniciante-2d', null)).toEqual({
      locked: true,
      reason: 'tier-reward',
      requiredLevel: 'hacker',
      requiredTier: 'iniciante-2d',
    })
    // Etapa completa (learningTier passou dela) → recompensa GANHA.
    expect(
      resolveCareerCourseLock({ 'iniciante-2d': [1, 2, 3, 4, 5, 6, 7, 8] }, 'iniciante-2d', null),
    ).toEqual({ locked: false })
    // Bônus de etapa FUTURA é recompensa DELA (não `future-tier`).
    expect(resolveCareerCourseLock({}, 'avancado-3d', null)).toMatchObject({
      locked: true,
      reason: 'tier-reward',
      requiredLevel: 'god',
    })
    // Etapa sem curso-base publicado não tem o que completar → fail-open
    // (também é o que protege o rollout de um catálogo todo-bônus).
    expect(resolveCareerCourseLock({}, 'iniciante-2d', null, false)).toEqual({ locked: false })
    // Lenda: tudo aberto.
    const all = {
      'iniciante-2d': [1, 2, 3, 4, 5, 6, 7, 8],
      'iniciante-3d': [1, 2, 3, 4, 5, 6, 7, 8],
      'intermediario-2d': [1, 2, 3, 4, 5, 6, 7, 8],
      'intermediario-3d': [1, 2, 3, 4, 5, 6, 7, 8],
      'avancado-2d': [1, 2, 3, 4, 5, 6, 7, 8],
      'avancado-3d': [1, 2, 3, 4, 5, 6, 7, 8],
    } as const
    expect(resolveCareerCourseLock(all, 'avancado-3d', null)).toEqual({ locked: false })
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
