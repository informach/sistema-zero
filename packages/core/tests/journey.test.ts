import { describe, expect, test } from 'bun:test'
import {
  CREATOR_JOURNEY_LEVELS,
  computeJourneyLevelSlug,
  creatorJourneyLevel,
  isJourneyCourseTier,
  JOURNEY_COURSE_TIERS,
  JOURNEY_LEVEL_SLUGS,
  JOURNEY_SLOT_MAX,
  journeyLevelAtLeast,
  journeySlotsForTier,
  meetsJourneyLevel,
  missingJourneySlots,
  resolveJourneyCourseLock,
} from '../src/journey'

describe('journeyLevelAtLeast', () => {
  test('compara pela posição na jornada e falha fechado para slugs inválidos', () => {
    expect(journeyLevelAtLeast('coder', 'hacker')).toBe(false)
    expect(journeyLevelAtLeast('hacker', 'hacker')).toBe(true)
    expect(journeyLevelAtLeast('god', 'hacker')).toBe(true)
    for (const slug of [undefined, null, '', 'inventor']) {
      expect(journeyLevelAtLeast(slug, 'hacker')).toBe(false)
    }
  })

  test('todo degrau satisfaz a si mesmo e ao primeiro degrau', () => {
    for (const slug of JOURNEY_LEVEL_SLUGS) {
      expect(journeyLevelAtLeast(slug, slug)).toBe(true)
      expect(journeyLevelAtLeast(slug, JOURNEY_LEVEL_SLUGS[0])).toBe(true)
    }
  })
})

describe('catálogo da Jornada do Criador', () => {
  test('cada degrau tem o seu número de posições, derivado da Lenda', () => {
    // UMA exceção ao 8: o degrau de ENTRADA tem 1 (o curso que a Faísca faz). O Iniciante 2D
    // chegou a ter 7 entre 14/08 e 15/08 e a usuária desfez — todo degrau que não é a entrada
    // tem 8. O members (validação + CHECK) e o admin (conformance) derivam daqui; divergir é
    // quebrar o elo canônico.
    const god = CREATOR_JOURNEY_LEVELS.at(-1)
    expect(god?.slug).toBe('god')
    expect(journeySlotsForTier('primeiros-passos-2d')).toBe(1)
    for (const tier of JOURNEY_COURSE_TIERS.slice(1)) {
      expect(journeySlotsForTier(tier)).toBe(8)
    }
    // A Lenda é a fonte: o helper e o catálogo não podem divergir.
    for (const tier of JOURNEY_COURSE_TIERS) {
      const slots = god?.requiredSlots[tier] ?? []
      expect(slots.length).toBe(journeySlotsForTier(tier))
      expect(Math.max(...slots)).toBe(journeySlotsForTier(tier))
      expect(journeySlotsForTier(tier)).toBeLessThanOrEqual(JOURNEY_SLOT_MAX)
    }
    // O total e 49 (1 + 8x6). Era 48 enquanto o Iniciante 2D tinha 7; a usuaria trocou o
    // total redondo pela regra uniforme, de proposito.
    const total = JOURNEY_COURSE_TIERS.reduce((sum, tier) => sum + journeySlotsForTier(tier), 0)
    expect(total).toBe(49)
  })

  test('degrau desconhecido não tem posição e não passa por degrau de jornada', () => {
    for (const tier of ['lenda-2d', 'iniciante-4d', '']) {
      expect(journeySlotsForTier(tier)).toBe(0)
      expect(isJourneyCourseTier(tier)).toBe(false)
    }
    expect(isJourneyCourseTier('primeiros-passos-2d')).toBe(true)
  })

  test('exige o curso de ENTRADA (Primeiros Passos) para virar Construtor', () => {
    // Mudou em 14/08: o curso-base saiu do Iniciante 2D e virou o degrau de entrada.
    // Fechar cursos do Iniciante 2D sem ter feito a entrada nao promove ninguem.
    expect(computeJourneyLevelSlug({ 'iniciante-2d': [1, 2, 3, 4, 5, 6, 7, 8] })).toBe('noob')
    expect(computeJourneyLevelSlug({ 'primeiros-passos-2d': [1] })).toBe('coder')
  })

  test('curso bônus ou slot repetido não substitui slot obrigatório', () => {
    expect(computeJourneyLevelSlug({ 'primeiros-passos-2d': [1, 1, 99] })).toBe('coder')
    expect(
      computeJourneyLevelSlug({
        'primeiros-passos-2d': [1],
        'iniciante-2d': [1, 2, 3, 4, 5, 6, 7, 8],
      }),
    ).toBe('hacker')
    // Buraco no meio nao promove, por mais que a CONTAGEM pareca suficiente: a regua e por
    // POSICAO, nao por quantidade. Aqui faltam a 7 (e o 99 e bonus, fora da jornada).
    expect(
      computeJourneyLevelSlug({
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
    expect(computeJourneyLevelSlug(all)).toBe('god')
    expect(meetsJourneyLevel(all, creatorJourneyLevel('god'))).toBe(true)
  })

  test('informa exatamente quais slots faltam', () => {
    expect(
      missingJourneySlots({ 'iniciante-2d': [1, 3, 6] }, creatorJourneyLevel('hacker')),
    ).toEqual({
      'primeiros-passos-2d': [1],
      'iniciante-2d': [2, 4, 5, 7, 8],
    })
  })

  test('recompensas seguem aprender primeiro, liberar depois', () => {
    expect(creatorJourneyLevel('noob').reward.freeStudio).toBe(false)
    expect(creatorJourneyLevel('coder').reward.blockProfileId).toBe('2d-essential')
    expect(creatorJourneyLevel('hacker').reward.blockLevel).toBe('iniciante-2d')
    expect(creatorJourneyLevel('champion').reward.pro).toBe(false)
    expect(creatorJourneyLevel('god').reward.pro).toBe(true)
  })

  test('catálogo é monotônico', () => {
    for (let index = 1; index < CREATOR_JOURNEY_LEVELS.length; index++) {
      const level = CREATOR_JOURNEY_LEVELS[index]!
      const qualified = level.requiredSlots
      expect(computeJourneyLevelSlug(qualified)).toBe(level.slug)
    }
  })

  /** Só o curso de entrada concluído e publicado: a criança é Construtor(a). */
  const ENTRADA = { 'primeiros-passos-2d': [1] } as const

  test('a Faísca estuda o degrau de ENTRADA, e o Iniciante 2D ainda é futuro para ela', () => {
    const none = {}
    expect(resolveJourneyCourseLock(none, 'primeiros-passos-2d', 1)).toEqual({ locked: false })
    // Consequencia de 14/08: para quem ainda nao fez a entrada, os cursos do Construtor(a)
    // sao degrau FUTURO (antes eram `foundation-first` no mesmo degrau).
    expect(resolveJourneyCourseLock(none, 'iniciante-2d', 1)).toMatchObject({
      locked: true,
      reason: 'future-tier',
      requiredLevel: 'coder',
    })
  })

  test('curso-base abre primeiro e depois libera os pares da etapa', () => {
    expect(resolveJourneyCourseLock(ENTRADA, 'iniciante-2d', 1)).toEqual({ locked: false })
    // foundation-first NÃO carrega requiredLevel: a chave é o curso-base, não um
    // nível (o 1º nível com este learningTier seria `noob` — dado sem sentido).
    expect(resolveJourneyCourseLock(ENTRADA, 'iniciante-2d', 2)).toEqual({
      locked: true,
      reason: 'foundation-first',
      requiredTier: 'iniciante-2d',
    })
    expect(
      resolveJourneyCourseLock({ ...ENTRADA, 'iniciante-2d': [1] }, 'iniciante-2d', 2),
    ).toEqual({
      locked: false,
    })
  })

  test('etapas futuras ficam bloqueadas e etapas anteriores são revisáveis', () => {
    const qualified = { ...ENTRADA, 'iniciante-2d': [1, 2, 3, 4, 5, 6, 7, 8] }
    expect(resolveJourneyCourseLock(qualified, 'primeiros-passos-2d', 1)).toEqual({ locked: false })
    expect(resolveJourneyCourseLock(qualified, 'iniciante-2d', 4)).toEqual({ locked: false })
    expect(resolveJourneyCourseLock(qualified, 'iniciante-3d', 1)).toEqual({ locked: false })
    expect(resolveJourneyCourseLock(qualified, 'intermediario-2d', 1)).toMatchObject({
      locked: true,
      reason: 'future-tier',
      requiredLevel: 'explorer',
    })
  })

  test('curso bônus é RECOMPENSA da etapa: abre quando ela completa', () => {
    // Etapa atual incompleta → travado como recompensa, apontando o nível-alvo
    // (o que o aluno vira ao completar a etapa).
    expect(resolveJourneyCourseLock({}, 'iniciante-2d', null)).toEqual({
      locked: true,
      reason: 'tier-reward',
      requiredLevel: 'hacker',
      requiredTier: 'iniciante-2d',
    })
    // O bonus da FAISCA agora existe: e a recompensa do degrau de entrada, e abre no
    // Construtor(a) - que e exatamente "depois que o curso base foi concluido".
    expect(resolveJourneyCourseLock({}, 'primeiros-passos-2d', null)).toEqual({
      locked: true,
      reason: 'tier-reward',
      requiredLevel: 'coder',
      requiredTier: 'primeiros-passos-2d',
    })
    expect(resolveJourneyCourseLock(ENTRADA, 'primeiros-passos-2d', null)).toEqual({
      locked: false,
    })
    // Etapa completa (learningTier passou dela) → recompensa GANHA.
    expect(
      resolveJourneyCourseLock(
        { ...ENTRADA, 'iniciante-2d': [1, 2, 3, 4, 5, 6, 7, 8] },
        'iniciante-2d',
        null,
      ),
    ).toEqual({ locked: false })
    // Bônus de etapa FUTURA é recompensa DELA (não `future-tier`).
    expect(resolveJourneyCourseLock({}, 'avancado-3d', null)).toMatchObject({
      locked: true,
      reason: 'tier-reward',
      requiredLevel: 'god',
    })
    // Etapa sem curso-base publicado não tem o que completar → fail-open
    // (também é o que protege o rollout de um catálogo todo-bônus).
    expect(resolveJourneyCourseLock({}, 'iniciante-2d', null, false)).toEqual({ locked: false })
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
    expect(resolveJourneyCourseLock(all, 'avancado-3d', null)).toEqual({ locked: false })
  })

  test('sem curso-base publicado na etapa, foundation-first falha ABERTA', () => {
    // A posição 2 travaria (foundation-first) por padrão…
    expect(resolveJourneyCourseLock(ENTRADA, 'iniciante-2d', 2)).toMatchObject({
      locked: true,
      reason: 'foundation-first',
    })
    // …mas sem base alcançável (foundationAvailable=false) não pode prender o aluno.
    expect(resolveJourneyCourseLock(ENTRADA, 'iniciante-2d', 2, false)).toEqual({ locked: false })
    // future-tier NÃO é afetado pelo fail-open (a base da etapa futura é irrelevante).
    expect(resolveJourneyCourseLock(ENTRADA, 'intermediario-2d', 2, false)).toMatchObject({
      locked: true,
      reason: 'future-tier',
    })
  })

  test('curso extra ignora a trava da jornada sem abrir o bônus-recompensa', () => {
    expect(resolveJourneyCourseLock({}, 'primeiros-passos-2d', null, true, 'extra')).toEqual({
      locked: false,
    })
    expect(resolveJourneyCourseLock({}, 'iniciante-2d', null, true, 'extra')).toEqual({
      locked: false,
    })
    expect(resolveJourneyCourseLock({}, 'primeiros-passos-2d', null, true, 'reward')).toMatchObject(
      {
        locked: true,
        reason: 'tier-reward',
      },
    )
  })
})
