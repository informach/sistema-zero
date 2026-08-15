import { describe, expect, test } from 'bun:test'
import {
  CAREER_COURSE_TIERS,
  CAREER_LEVEL_SLUGS,
  CAREER_SLOT_MAX,
  CREATOR_CAREER_LEVELS,
  careerLevelAtLeast,
  careerSlotsForTier,
  computeCareerLevelSlug,
  creatorCareerLevel,
  isCareerCourseTier,
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
  test('cada degrau tem o seu número de posições, derivado da Lenda', () => {
    // UMA exceção ao 8: o degrau de ENTRADA tem 1 (o curso que a Faísca faz). O Iniciante 2D
    // chegou a ter 7 entre 14/08 e 15/08 e a usuária desfez — todo degrau que não é a entrada
    // tem 8. O members (validação + CHECK) e o admin (conformance) derivam daqui; divergir é
    // quebrar o elo canônico.
    const god = CREATOR_CAREER_LEVELS.at(-1)
    expect(god?.slug).toBe('god')
    expect(careerSlotsForTier('primeiros-passos-2d')).toBe(1)
    for (const tier of CAREER_COURSE_TIERS.slice(1)) {
      expect(careerSlotsForTier(tier)).toBe(8)
    }
    // A Lenda é a fonte: o helper e o catálogo não podem divergir.
    for (const tier of CAREER_COURSE_TIERS) {
      const slots = god?.requiredSlots[tier] ?? []
      expect(slots.length).toBe(careerSlotsForTier(tier))
      expect(Math.max(...slots)).toBe(careerSlotsForTier(tier))
      expect(careerSlotsForTier(tier)).toBeLessThanOrEqual(CAREER_SLOT_MAX)
    }
    // O total e 49 (1 + 8x6). Era 48 enquanto o Iniciante 2D tinha 7; a usuaria trocou o
    // total redondo pela regra uniforme, de proposito.
    const total = CAREER_COURSE_TIERS.reduce((sum, tier) => sum + careerSlotsForTier(tier), 0)
    expect(total).toBe(49)
  })

  test('degrau desconhecido não tem posição e não passa por degrau de carreira', () => {
    for (const tier of ['lenda-2d', 'iniciante-4d', '']) {
      expect(careerSlotsForTier(tier)).toBe(0)
      expect(isCareerCourseTier(tier)).toBe(false)
    }
    expect(isCareerCourseTier('primeiros-passos-2d')).toBe(true)
  })

  test('exige o curso de ENTRADA (Primeiros Passos) para virar Construtor', () => {
    // Mudou em 14/08: o curso-base saiu do Iniciante 2D e virou o degrau de entrada.
    // Fechar cursos do Iniciante 2D sem ter feito a entrada nao promove ninguem.
    expect(computeCareerLevelSlug({ 'iniciante-2d': [1, 2, 3, 4, 5, 6, 7, 8] })).toBe('noob')
    expect(computeCareerLevelSlug({ 'primeiros-passos-2d': [1] })).toBe('coder')
  })

  test('curso bônus ou slot repetido não substitui slot obrigatório', () => {
    expect(computeCareerLevelSlug({ 'primeiros-passos-2d': [1, 1, 99] })).toBe('coder')
    expect(
      computeCareerLevelSlug({
        'primeiros-passos-2d': [1],
        'iniciante-2d': [1, 2, 3, 4, 5, 6, 7, 8],
      }),
    ).toBe('hacker')
    // Buraco no meio nao promove, por mais que a CONTAGEM pareca suficiente: a regua e por
    // POSICAO, nao por quantidade. Aqui faltam a 7 (e o 99 e bonus, fora da carreira).
    expect(
      computeCareerLevelSlug({
        'primeiros-passos-2d': [1],
        'iniciante-2d': [1, 2, 3, 4, 5, 6, 8, 99],
      }),
    ).toBe('coder')
  })

  test('a escada completa termina na Lenda', () => {
    const all = {
      'primeiros-passos-2d': [1],
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
      {
        'primeiros-passos-2d': [1],
        'iniciante-2d': [2, 4, 5, 7, 8],
      },
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

  /** Só o curso de entrada concluído e publicado: a criança é Construtor(a). */
  const ENTRADA = { 'primeiros-passos-2d': [1] } as const

  test('a Faísca estuda o degrau de ENTRADA, e o Iniciante 2D ainda é futuro para ela', () => {
    const none = {}
    expect(resolveCareerCourseLock(none, 'primeiros-passos-2d', 1)).toEqual({ locked: false })
    // Consequencia de 14/08: para quem ainda nao fez a entrada, os cursos do Construtor(a)
    // sao degrau FUTURO (antes eram `foundation-first` no mesmo degrau).
    expect(resolveCareerCourseLock(none, 'iniciante-2d', 1)).toMatchObject({
      locked: true,
      reason: 'future-tier',
      requiredLevel: 'coder',
    })
  })

  test('curso-base abre primeiro e depois libera os pares da etapa', () => {
    expect(resolveCareerCourseLock(ENTRADA, 'iniciante-2d', 1)).toEqual({ locked: false })
    // foundation-first NÃO carrega requiredLevel: a chave é o curso-base, não um
    // nível (o 1º nível com este learningTier seria `noob` — dado sem sentido).
    expect(resolveCareerCourseLock(ENTRADA, 'iniciante-2d', 2)).toEqual({
      locked: true,
      reason: 'foundation-first',
      requiredTier: 'iniciante-2d',
    })
    expect(resolveCareerCourseLock({ ...ENTRADA, 'iniciante-2d': [1] }, 'iniciante-2d', 2)).toEqual(
      {
        locked: false,
      },
    )
  })

  test('etapas futuras ficam bloqueadas e etapas anteriores são revisáveis', () => {
    const qualified = { ...ENTRADA, 'iniciante-2d': [1, 2, 3, 4, 5, 6, 7, 8] }
    expect(resolveCareerCourseLock(qualified, 'primeiros-passos-2d', 1)).toEqual({ locked: false })
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
    // O bonus da FAISCA agora existe: e a recompensa do degrau de entrada, e abre no
    // Construtor(a) - que e exatamente "depois que o curso base foi concluido".
    expect(resolveCareerCourseLock({}, 'primeiros-passos-2d', null)).toEqual({
      locked: true,
      reason: 'tier-reward',
      requiredLevel: 'coder',
      requiredTier: 'primeiros-passos-2d',
    })
    expect(resolveCareerCourseLock(ENTRADA, 'primeiros-passos-2d', null)).toEqual({ locked: false })
    // Etapa completa (learningTier passou dela) → recompensa GANHA.
    expect(
      resolveCareerCourseLock(
        { ...ENTRADA, 'iniciante-2d': [1, 2, 3, 4, 5, 6, 7, 8] },
        'iniciante-2d',
        null,
      ),
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
      'primeiros-passos-2d': [1],
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
    expect(resolveCareerCourseLock(ENTRADA, 'iniciante-2d', 2)).toMatchObject({
      locked: true,
      reason: 'foundation-first',
    })
    // …mas sem base alcançável (foundationAvailable=false) não pode prender o aluno.
    expect(resolveCareerCourseLock(ENTRADA, 'iniciante-2d', 2, false)).toEqual({ locked: false })
    // future-tier NÃO é afetado pelo fail-open (a base da etapa futura é irrelevante).
    expect(resolveCareerCourseLock(ENTRADA, 'intermediario-2d', 2, false)).toMatchObject({
      locked: true,
      reason: 'future-tier',
    })
  })
})
