import { describe, expect, mock, test } from 'bun:test'
import { JOURNEY_LEVEL_SLUGS } from '@sistemazero/core/journey'
import {
  ArquipelagoReadsService,
  lugarNoCurriculo,
} from '../../src/application/arquipelago/arquipelago-reads.service'

const A = '00000000-0000-4000-8000-00000000000a'
const B = '00000000-0000-4000-8000-00000000000b'
const C = '00000000-0000-4000-8000-00000000000c'
const D = '00000000-0000-4000-8000-00000000000d'
const vazio = {
  base2dCourseId: null,
  base3dCourseId: null,
  missionCourseId: null,
  powers: [],
  extras: [],
}
// Só o que `creatorJourneyCoursePlacements` lê: a trilha de cada posto e as Maestrias.
const curriculo = {
  stages: [
    { ...vazio, level: 'coder', base2dCourseId: A },
    { ...vazio, level: 'hacker', powers: [{ mechanicId: 'm', courseIds: [A, B] }] },
    { ...vazio, level: 'explorer', extras: [{ courseId: C }] },
  ],
  masteries: [],
} as never

const curso = (id: string, over: Record<string, unknown> = {}) => ({
  id,
  title: `Curso ${id.slice(-1)}`,
  slug: `curso-${id.slice(-1)}`,
  modality: 'recorded',
  metadata: { studioUnlockBlocks: ['move_right', 'move_right', 'jump'] },
  ...over,
})

function servico(over: Partial<Record<string, unknown>> = {}) {
  return new ArquipelagoReadsService({
    kidsJourney: {
      get: mock(async () => ({ earned: { level: 'hacker' } })),
      publishedCurriculum: mock(async () => ({ version: 5, curriculum: curriculo })),
    },
    adultJourney: {
      get: mock(async () => ({
        configured: true,
        stages: [
          { id: 'a', title: 'A', completed: true },
          { id: 'b', title: 'B', completed: false },
        ],
      })),
      policy: mock(async () => ({ version: 2, policy: { stages: [] } })),
    },
    unlocks: { read: mock(async () => ({ blocks: ['move_right'] })) },
    courses: {
      listPublishedCourses: mock(async () => [
        curso(A),
        curso(B),
        curso(C, { modality: 'live' }),
        curso(D, { metadata: {} }),
      ]),
    },
    ...over,
  } as never)
}

describe('jogador', () => {
  test('Kids: posição do posto conquistado e os blocos (leitura sem congelar)', async () => {
    const s = servico()
    expect(await s.jogador({ userId: A, accountId: B, audience: 'kids' })).toEqual({
      posicao: JOURNEY_LEVEL_SLUGS.indexOf('hacker') + 1,
      total: 8,
      blocos: ['move_right'],
      cursosBase: [],
    })
  })

  test('cursos-base concluídos (A3): os postos com o 2D da trilha concluído, nos dois públicos', async () => {
    const trilha = {
      stages: [
        { level: 'coder', base2d: { state: 'completed' } },
        { level: 'hacker', base2d: { state: 'available' } },
        { level: 'explorer', base2d: { state: 'completed' } },
      ],
    }
    const s = servico({
      kidsJourney: {
        get: mock(async () => ({ earned: { level: 'explorer' }, curriculum: trilha })),
        publishedCurriculum: mock(),
      },
      adultJourney: {
        get: mock(async () => ({ configured: true, stages: [], curriculum: trilha })),
        policy: mock(),
      },
    })
    expect((await s.jogador({ userId: A, accountId: B, audience: 'kids' })).cursosBase).toEqual([
      'coder',
      'explorer',
    ])
    expect((await s.jogador({ userId: A, accountId: A, audience: 'adult' })).cursosBase).toEqual([
      'coder',
      'explorer',
    ])
  })

  test('adulto sem currículo: os cursos-base saem das etapas (lacunas, 01/11/2026)', async () => {
    const pede = (courseId: string) => ({ courseId, milestone: 'complete' as const })
    const s = servico({
      adultJourney: {
        get: mock(async () => ({
          configured: true,
          stages: [
            { id: 'a', title: 'A', completed: true, requirements: [pede(A)], missing: [] },
            {
              id: 'b',
              title: 'B',
              completed: false,
              requirements: [pede(B), pede(C)],
              missing: [pede(C)],
            },
            { id: 'c', title: 'C', completed: false, requirements: [pede(D)], missing: [pede(D)] },
          ],
        })),
        policy: mock(async () => ({
          version: 3,
          policy: {
            stages: [
              { id: 'a', requirements: [pede(A)] },
              { id: 'b', requirements: [{ courseId: C, milestone: 'showcase' }, pede(B)] },
            ],
          },
        })),
      },
    })
    // A etapa 1 (posto 1) concluiu o curso dela; na 2, o curso-base (B) está feito e só falta outro.
    expect((await s.jogador({ userId: A, accountId: A, audience: 'adult' })).cursosBase).toEqual([
      JOURNEY_LEVEL_SLUGS[0],
      JOURNEY_LEVEL_SLUGS[1],
    ])
    // O catálogo dos cursos-base: o primeiro curso concluído pedido por etapa, se publicado.
    expect((await s.curriculoDeBlocos('adult')).cursosBase).toEqual([
      { posto: JOURNEY_LEVEL_SLUGS[0], courseId: A, titulo: 'Curso a', slug: 'curso-a' },
      { posto: JOURNEY_LEVEL_SLUGS[1], courseId: B, titulo: 'Curso b', slug: 'curso-b' },
    ])
  })

  test('adulto: posição da etapa (a primeira não concluída)', async () => {
    const r = await servico().jogador({ userId: A, accountId: A, audience: 'adult' })
    expect(r.posicao).toBe(2)
    expect(r.total).toBe(3)
  })
})

describe('currículo de blocos', () => {
  test('só cursos gravados com blocos, sem repetir bloco, com o posto mais cedo', async () => {
    const r = await servico().curriculoDeBlocos('kids')
    expect(r.versao).toBe(5)
    expect(r.cursos).toEqual([
      {
        courseId: A,
        titulo: 'Curso a',
        slug: 'curso-a',
        posto: 'coder',
        papel: 'base2d',
        blocos: ['move_right', 'jump'],
      },
      {
        courseId: B,
        titulo: 'Curso b',
        slug: 'curso-b',
        posto: 'hacker',
        papel: 'power',
        blocos: ['move_right', 'jump'],
      },
    ])
    // O curso-base de cada posto, publicado (o do explorer não está publicado e fica de fora).
    expect(r.cursosBase).toEqual([
      { posto: 'coder', courseId: A, titulo: 'Curso a', slug: 'curso-a' },
    ])
    expect(r.catalogo.length).toBeGreaterThan(50)
    expect(r.catalogo[0]).toMatchObject({ type: expect.any(String), rotulo: expect.any(String) })
  })

  test('política sem currículo: cursos aparecem sem posto', async () => {
    const r = await servico().curriculoDeBlocos('adult')
    expect(r.cursos.map((c) => c.posto)).toEqual([null, null])
  })

  test('lugar no currículo: o posto mais cedo; curso fora do currículo não tem lugar', () => {
    expect(lugarNoCurriculo(curriculo, A)).toEqual({ posto: 'coder', papel: 'base2d' })
    expect(lugarNoCurriculo(curriculo, C)).toEqual({ posto: 'explorer', papel: 'extra' })
    expect(lugarNoCurriculo(curriculo, D)).toBeNull()
  })
})

describe('comunidade adulta (cartões dos Lumis e desafios com os cursos adultos)', () => {
  test('o jogador adulto lê os blocos do público adulto, sem passar pela jornada Kids', async () => {
    const read = mock(async () => ({ blocks: ['sz_js_repeat'] }))
    const kidsGet = mock(async () => ({ earned: { level: 'hacker' } }))
    const s = servico({
      unlocks: { read },
      kidsJourney: { get: kidsGet, publishedCurriculum: mock() },
    })
    const r = await s.jogador({ userId: A, accountId: A, audience: 'adult' })
    expect(read).toHaveBeenCalledWith(A, 'adult')
    expect(kidsGet).not.toHaveBeenCalled()
    expect(r.blocos).toEqual(['sz_js_repeat'])
  })

  test('o currículo adulto: só cursos adultos, com o posto do currículo adulto', async () => {
    const listPublishedCourses = mock(async () => [curso(A), curso(B)])
    const publishedCurriculum = mock(async () => ({ version: 5, curriculum: curriculo }))
    const s = servico({
      courses: { listPublishedCourses },
      kidsJourney: { get: mock(), publishedCurriculum },
      adultJourney: {
        get: mock(),
        policy: mock(async () => ({
          version: 3,
          policy: {
            stages: [],
            curriculum: {
              stages: [{ ...vazio, level: 'explorer', base2dCourseId: B }],
              masteries: [],
            },
          },
        })),
      },
    })
    const r = await s.curriculoDeBlocos('adult')
    expect(listPublishedCourses).toHaveBeenCalledWith('adult')
    expect(publishedCurriculum).not.toHaveBeenCalled()
    expect(r.versao).toBe(3)
    // O curso B tem posto no currículo adulto; o A, que só está no currículo Kids, fica sem.
    expect(r.cursos.map((c) => [c.courseId, c.posto])).toEqual([
      [A, null],
      [B, 'explorer'],
    ])
  })
})
