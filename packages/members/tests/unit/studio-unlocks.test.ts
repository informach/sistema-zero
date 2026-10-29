import { describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { ForbiddenError } from '@sistemazero/core/http'
import { initialKidsJourneyPolicy, projectKidsJourney } from '@sistemazero/core/journey'
import { FreeStudioAccessService } from '../../src/application/studio/free-studio-access.service'
import { GetStudioUnlocksService } from '../../src/application/studio-unlocks/get-studio-unlocks.service'
import type { Course } from '../../src/domain/course/course'
import { studioUnlockRevision } from '../../src/domain/gamification/studio-unlock-revision'
import {
  InMemoryCourseRepository,
  InMemoryEntitlementRepository,
  InMemoryGamificationRepository,
  InMemoryStudioUnlockRepository,
  silentLogger,
} from '../fakes/in-memory'

/**
 * A paleta do Estúdio livre passou a vir do CURRÍCULO: cada curso declara o que libera
 * e o aluno tem a união dos cursos elegíveis: a conclusão da modalidade correta
 * libera os blocos, inclusive nos cursos arquivados que continuam acessíveis.
 *
 * O teste que mais importa é o da REGRA DA USUÁRIA: **bloco liberado não é revogado**.
 * A união ao vivo sozinha não garante isso — editar o JSON, despublicar ou apagar o curso
 * tiraria a ferramenta da mão de quem já a tinha. Quem segura é o snapshot, e é ele que
 * os casos "removeu"/"apagou" abaixo cobrem.
 */

function makeCourse(
  unlockBlocks?: string[],
  options: { audience?: Course['audience']; careerSlot?: number | null } = {},
): Course {
  const now = new Date('2026-08-13T12:00:00.000Z')
  return {
    id: randomUUID(),
    version: 0,
    slug: `curso-${randomUUID().slice(0, 8)}`,
    title: 'Curso',
    subtitle: null,
    description: null,
    coverImageUrl: null,
    status: 'published',
    audience: options.audience ?? 'kids',
    level: 'iniciante',
    track: '2d',
    careerSlot: options.careerSlot === undefined ? 1 : options.careerSlot,
    sequentialLock: true,
    videoBeforeActivity: false,
    modality: 'recorded',
    metadata: unlockBlocks ? { studioUnlockBlocks: unlockBlocks } : null,
    createdAt: now,
    updatedAt: now,
  } as Course
}

function setup() {
  const courses = new InMemoryCourseRepository()
  const entitlements = new InMemoryEntitlementRepository()
  const unlocks = new InMemoryStudioUnlockRepository()
  const gamification = new InMemoryGamificationRepository({
    entitlements,
    courses,
    studioUnlocks: unlocks,
  })
  const service = new GetStudioUnlocksService(gamification, unlocks, silentLogger)
  const userId = randomUUID()
  const accountId = randomUUID()

  /** Marca o curso como CONCLUÍDO e/ou PUBLICADO no ledger. */
  const mark = (
    courseId: string,
    opts: { audience?: Course['audience']; completed?: boolean; showcased?: boolean },
  ) => {
    const audience: Course['audience'] = opts.audience ?? 'kids'
    const base = {
      userId,
      audience,
      amount: 0,
      createdAt: new Date(),
    }
    if (opts.completed !== false)
      gamification.events.push({
        ...base,
        sourceType: 'course_complete',
        sourceId: courseId,
      } as never)
    if (opts.showcased !== false)
      gamification.events.push({
        ...base,
        sourceType: 'course_showcased',
        sourceId: courseId,
      } as never)
  }

  return { courses, gamification, unlocks, service, userId, accountId, mark }
}

describe('GetStudioUnlocksService', () => {
  test('read: a mesma união (congelada + atual) sem congelar nada', async () => {
    const { courses, unlocks, service, userId, accountId, mark } = setup()
    const course = makeCourse(['sz_g2d_create_ship'])
    courses.courses.push(course)
    mark(course.id, {})
    await unlocks.freezeGrants({ userId, accountId }, 'kids', [
      { courseId: randomUUID(), blocks: ['sz_py_pass'] },
    ])
    const antes = await unlocks.listGrants(userId, 'kids')
    expect((await service.read(userId, 'kids')).blocks.sort()).toEqual(
      ['sz_g2d_create_ship', 'sz_py_pass'].sort(),
    )
    expect(await unlocks.listGrants(userId, 'kids')).toEqual(antes)
  })

  for (const audience of ['kids', 'adult'] as const) {
    test(`LIVE ${audience}: completion unlocks literal JS/Python rewards without Mural`, async () => {
      const { courses, gamification, service, userId, accountId } = setup()
      const course = makeCourse(['sz_g2d_create_ship', 'sz_py_pass'], {
        audience,
        careerSlot: null,
      })
      course.modality = 'live'
      courses.courses.push(course)
      const before = await gamification.getStudioUnlockRevision(userId, audience)
      await gamification.award({
        userId,
        accountId,
        audience,
        privileged: false,
        now: new Date('2026-10-22T12:00:00Z'),
        today: '2026-10-22',
        events: [{ sourceType: 'live_course_complete', sourceId: course.id, amount: 0 }],
      })
      expect(await service.execute(userId, audience, accountId)).toEqual({
        blocks: ['sz_g2d_create_ship', 'sz_py_pass'],
      })
      expect(await gamification.getStudioUnlockRevision(userId, audience)).not.toBe(before)
      expect(await service.execute(randomUUID(), audience, accountId)).toEqual({ blocks: [] })
      expect(
        await service.execute(userId, audience === 'kids' ? 'adult' : 'kids', accountId),
      ).toEqual({ blocks: [] })
    })
  }

  test('completion events must match the current course modality; presence cannot replace completion', async () => {
    const { courses, gamification, service, userId, accountId, mark } = setup()
    const live = makeCourse(['sz_py_pass'], { careerSlot: null })
    live.modality = 'live'
    const recorded = makeCourse(['sz_g2d_create_ship'], { careerSlot: null })
    courses.courses.push(live, recorded)
    mark(live.id, {})
    await gamification.award({
      userId,
      accountId,
      audience: 'kids',
      privileged: false,
      now: new Date(),
      today: '2026-10-22',
      events: [
        { sourceType: 'live_course_complete', sourceId: recorded.id, amount: 0 },
        { sourceType: 'live_encounter', sourceId: live.id, amount: 0 },
      ],
    })
    expect(await service.execute(userId, 'kids', accountId)).toEqual({ blocks: [] })
    expect(await gamification.getStudioUnlockRevision(userId, 'kids')).toBe(
      studioUnlockRevision([]),
    )
  })

  test('LIVE replay freezes additions before any GET; later product access uses the same earned union', async () => {
    const { courses, gamification, unlocks, service, userId, accountId } = setup()
    const course = makeCourse(['sz_py_pass'], { careerSlot: null })
    course.modality = 'live'
    courses.courses.push(course)
    const award = () =>
      gamification.award({
        userId,
        accountId,
        audience: 'kids',
        privileged: false,
        now: new Date('2026-10-22T12:00:00Z'),
        today: '2026-10-22',
        events: [{ sourceType: 'live_course_complete', sourceId: course.id, amount: 0 }],
      })
    await award()
    expect(await unlocks.listGrants(userId, 'kids')).toEqual([
      { courseId: course.id, blocks: ['sz_py_pass'] },
    ])
    course.metadata = { studioUnlockBlocks: ['sz_py_pass', 'sz_g2d_create_ship'] }
    await award()
    expect(gamification.events.filter((e) => e.sourceType === 'live_course_complete')).toHaveLength(
      1,
    )
    expect(await unlocks.listGrants(userId, 'kids')).toEqual([
      { courseId: course.id, blocks: ['sz_py_pass', 'sz_g2d_create_ship'] },
    ])
    courses.courses = []
    let ownsProduct = false
    let journeyAllowsStudio = false
    const access = new FreeStudioAccessService(
      {
        async execute() {
          return {
            grants: [],
            communities: ownsProduct ? ['estudio-completo'] : [],
            hasMaster: false,
            hasMasterKids: false,
          }
        },
      },
      service,
      {
        async get() {
          return projectKidsJourney({
            policy: initialKidsJourneyPolicy(),
            policyVersion: 1,
            catalog: [],
            milestones: [],
            earned: {
              level: 'noob',
              capabilities: journeyAllowsStudio ? ['studio'] : [],
              courseAccess: { entry: [], expanded: [], reward: [] },
            },
          })
        },
        async staffPreview() {
          throw new Error('Student must not use staff preview')
        },
      },
    )
    const actor = {
      userId,
      accountId,
      audience: 'kids' as const,
      privileged: false,
      readOnly: false,
    }
    await expect(access.execute(actor)).rejects.toThrow('Você não tem acesso')
    ownsProduct = true
    await expect(access.execute(actor)).rejects.toThrow('Seu nível ainda não libera')
    // Independent existing authorities are now satisfied; this test does not award journey milestones.
    journeyAllowsStudio = true
    expect(await access.execute(actor)).toEqual({
      blocks: ['sz_py_pass', 'sz_g2d_create_ship'],
      pro: false,
      modes: ['blocks'],
    })
    await expect(access.execute(actor, 'existing-pro', 'python')).rejects.toThrow('Pro')
    await expect(access.execute({ ...actor, readOnly: true })).rejects.toThrow('suporte')
    expect(await gamification.listQualifyingJourneySlots(userId, 'kids')).toEqual(
      expect.objectContaining({ 'iniciante-2d': [] }),
    )
  })

  test('LIVE unpublished course or mismatched event audience cannot enter the current or frozen curriculum', async () => {
    const { courses, gamification, unlocks, service, userId, accountId } = setup()
    const draft = makeCourse(['sz_py_pass'], { careerSlot: null })
    draft.modality = 'live'
    draft.status = 'draft'
    const adult = makeCourse(['sz_g2d_create_ship'], { audience: 'adult', careerSlot: null })
    adult.modality = 'live'
    courses.courses.push(draft, adult)
    await gamification.award({
      userId,
      accountId,
      audience: 'kids',
      privileged: false,
      now: new Date(),
      today: '2026-10-22',
      events: [draft, adult].map(({ id }) => ({
        sourceType: 'live_course_complete',
        sourceId: id,
        amount: 0,
      })),
    })
    expect(await unlocks.listGrants(userId, 'kids')).toEqual([])
    expect(await service.execute(userId, 'kids', accountId)).toEqual({ blocks: [] })
    expect(await service.execute(userId, 'adult', accountId)).toEqual({ blocks: [] })
  })

  test('sem curso qualificado, a paleta vem vazia (o Estúdio livre fica trancado)', async () => {
    const { service, userId, accountId } = setup()
    expect(await service.execute(userId, 'kids', accountId)).toEqual({ blocks: [] })
  })

  test('curso Kids com posição: concluir libera os blocos sem publicar no Mural', async () => {
    const { courses, service, userId, accountId, mark } = setup()
    const course = makeCourse(['sz_g2d_create_ship'])
    courses.courses.push(course)
    mark(course.id, { showcased: false })
    expect(await service.execute(userId, 'kids', accountId)).toEqual({
      blocks: ['sz_g2d_create_ship'],
    })
  })

  test('curso Kids bônus: concluir libera sem publicação no Mural', async () => {
    const { courses, service, userId, accountId, mark } = setup()
    const course = makeCourse(['sz_g2d_create_ship'], { careerSlot: null })
    courses.courses.push(course)
    mark(course.id, { showcased: false })
    expect(await service.execute(userId, 'kids', accountId)).toEqual({
      blocks: ['sz_g2d_create_ship'],
    })
  })

  test('publicar SEM concluir também não libera', async () => {
    const { courses, service, userId, accountId, mark } = setup()
    const course = makeCourse(['sz_g2d_create_ship'])
    courses.courses.push(course)
    mark(course.id, { completed: false })
    expect(await service.execute(userId, 'kids', accountId)).toEqual({ blocks: [] })
  })

  test('curso Kids bônus: publicar SEM concluir também não libera', async () => {
    const { courses, service, userId, accountId, mark } = setup()
    const course = makeCourse(['sz_g2d_create_ship'], { careerSlot: null })
    courses.courses.push(course)
    mark(course.id, { completed: false })
    expect(await service.execute(userId, 'kids', accountId)).toEqual({ blocks: [] })
  })

  test('curso Kids bônus: publicar depois da conclusão não duplica o grant', async () => {
    const { courses, unlocks, service, userId, accountId, mark } = setup()
    const course = makeCourse(['sz_g2d_create_ship'], { careerSlot: null })
    courses.courses.push(course)
    mark(course.id, { showcased: false })
    await service.execute(userId, 'kids', accountId)

    mark(course.id, { completed: false })
    expect(await service.execute(userId, 'kids', accountId)).toEqual({
      blocks: ['sz_g2d_create_ship'],
    })
    expect(unlocks.grants).toHaveLength(1)
  })

  test('concluir + publicar libera os blocos do curso', async () => {
    const { courses, service, userId, accountId, mark } = setup()
    const course = makeCourse(['sz_g2d_create_ship', 'sz_g2d_arrows_x'])
    courses.courses.push(course)
    mark(course.id, {})
    const { blocks } = await service.execute(userId, 'kids', accountId)
    expect(blocks.sort()).toEqual(['sz_g2d_arrows_x', 'sz_g2d_create_ship'])
  })

  test('dois cursos somam (sem repetir o bloco em comum)', async () => {
    const { courses, service, userId, accountId, mark } = setup()
    const a = makeCourse(['sz_g2d_create_ship', 'sz_val_number'])
    const b = makeCourse(['sz_g2d_on_key', 'sz_val_number'])
    courses.courses.push(a, b)
    mark(a.id, {})
    mark(b.id, {})
    const { blocks } = await service.execute(userId, 'kids', accountId)
    // `sz_val_number` está nos DOIS cursos e aparece uma vez só.
    expect(blocks.sort()).toEqual(['sz_g2d_create_ship', 'sz_g2d_on_key', 'sz_val_number'])
  })

  test('⭐⭐ ROLLOUT: curso já no ar e concluído ANTES de existir currículo — cadastrar libera sozinho', async () => {
    // O caso real da virada: o curso-base está publicado há tempo, crianças já o
    // concluíram e publicaram, e só AGORA a professora cadastra as ferramentas. Elas
    // recebem na próxima tela que carregar, sem backfill e sem refazer o curso — é a
    // metade "ao vivo" da união que garante isso.
    const { courses, service, userId, accountId, mark } = setup()
    const course = makeCourse() // sem currículo nenhum no metadata
    courses.courses.push(course)
    mark(course.id, {})
    expect(await service.execute(userId, 'kids', accountId)).toEqual({ blocks: [] })

    course.metadata = { studioUnlockBlocks: ['sz_g2d_create_ship', 'sz_g2d_on_key'] }
    const depois = await service.execute(userId, 'kids', accountId)
    expect(depois.blocks.sort()).toEqual(['sz_g2d_create_ship', 'sz_g2d_on_key'])
  })

  test('⭐ bloco ACRESCENTADO ao JSON chega em quem já concluiu o curso', async () => {
    const { courses, service, userId, accountId, mark } = setup()
    const course = makeCourse(['sz_g2d_create_ship'])
    courses.courses.push(course)
    mark(course.id, {})
    await service.execute(userId, 'kids', accountId)
    course.metadata = { studioUnlockBlocks: ['sz_g2d_create_ship', 'sz_g2d_explode'] }
    const { blocks } = await service.execute(userId, 'kids', accountId)
    expect(blocks.sort()).toEqual(['sz_g2d_create_ship', 'sz_g2d_explode'])
  })

  test('⭐⭐ bloco REMOVIDO do JSON NÃO é revogado de quem já o tinha', async () => {
    const { courses, service, userId, accountId, mark } = setup()
    const course = makeCourse(['sz_g2d_create_ship', 'sz_g2d_explode'])
    courses.courses.push(course)
    mark(course.id, {})
    // 1ª visita ao Estúdio: congela o que foi servido.
    expect((await service.execute(userId, 'kids', accountId)).blocks.sort()).toEqual([
      'sz_g2d_create_ship',
      'sz_g2d_explode',
    ])
    // A professora tira um bloco do currículo do curso.
    course.metadata = { studioUnlockBlocks: ['sz_g2d_create_ship'] }
    const { blocks } = await service.execute(userId, 'kids', accountId)
    expect(blocks.sort()).toEqual(['sz_g2d_create_ship', 'sz_g2d_explode'])
  })

  test('⭐⭐ curso APAGADO não tira a ferramenta de quem já o concluiu', async () => {
    const { courses, service, userId, accountId, mark } = setup()
    const course = makeCourse(['sz_g2d_create_ship'])
    courses.courses.push(course)
    mark(course.id, {})
    await service.execute(userId, 'kids', accountId)
    courses.courses.length = 0
    expect(await service.execute(userId, 'kids', accountId)).toEqual({
      blocks: ['sz_g2d_create_ship'],
    })
  })

  test('só congela quando a união CRESCE (abrir o Estúdio não vira UPDATE por visita)', async () => {
    const { courses, unlocks, service, userId, accountId, mark } = setup()
    const course = makeCourse(['sz_g2d_create_ship'])
    courses.courses.push(course)
    mark(course.id, {})
    await service.execute(userId, 'kids', accountId)
    const snapshot = JSON.stringify(unlocks.grants)
    let writes = 0
    const original = unlocks.saveGrants.bind(unlocks)
    unlocks.saveGrants = async (...args) => {
      writes += 1
      return original(...args)
    }
    await service.execute(userId, 'kids', accountId)
    expect(writes).toBe(0)
    expect(JSON.stringify(unlocks.grants)).toBe(snapshot)
  })

  test('falhar ao congelar NÃO nega a paleta de agora', async () => {
    const { courses, unlocks, service, userId, accountId, mark } = setup()
    const course = makeCourse(['sz_g2d_create_ship'])
    courses.courses.push(course)
    mark(course.id, {})
    unlocks.saveGrants = async () => {
      throw new Error('banco fora')
    }
    expect(await service.execute(userId, 'kids', accountId)).toEqual({
      blocks: ['sz_g2d_create_ship'],
    })
  })

  test('fence de exclusão recusa a leitura e recebe o owner autenticado', async () => {
    const { courses, unlocks, service, userId, accountId, mark } = setup()
    const course = makeCourse(['sz_g2d_create_ship'])
    courses.courses.push(course)
    mark(course.id, {})
    unlocks.freezeGrants = async (owner) => {
      expect(owner).toEqual({ userId, accountId })
      throw new ForbiddenError('Esta conta foi excluída.')
    }
    await expect(service.execute(userId, 'kids', accountId)).rejects.toBeInstanceOf(ForbiddenError)
    expect(unlocks.grants).toEqual([])
  })

  test('bônus reclassificado para jornada preserva ferramenta já servida', async () => {
    const { courses, service, userId, accountId, mark } = setup()
    const course = makeCourse(['sz_g2d_create_ship'], { careerSlot: null })
    courses.courses.push(course)
    mark(course.id, { showcased: false })
    await service.execute(userId, 'kids', accountId)

    course.careerSlot = 2
    expect(await service.execute(userId, 'kids', accountId)).toEqual({
      blocks: ['sz_g2d_create_ship'],
    })
  })

  test('bônus reclassificado antes da primeira leitura mantém liberação por conclusão', async () => {
    const { courses, service, userId, accountId, mark } = setup()
    const course = makeCourse(['sz_g2d_create_ship'], { careerSlot: null })
    courses.courses.push(course)
    mark(course.id, { showcased: false })

    course.careerSlot = 2
    expect(await service.execute(userId, 'kids', accountId)).toEqual({
      blocks: ['sz_g2d_create_ship'],
    })
  })

  test('curso da jornada reclassificado como bônus reconhece a conclusão anterior', async () => {
    const { courses, service, userId, accountId, mark } = setup()
    const course = makeCourse(['sz_g2d_create_ship'])
    courses.courses.push(course)
    mark(course.id, { showcased: false })
    expect(await service.execute(userId, 'kids', accountId)).toEqual({
      blocks: ['sz_g2d_create_ship'],
    })

    course.careerSlot = null
    expect(await service.execute(userId, 'kids', accountId)).toEqual({
      blocks: ['sz_g2d_create_ship'],
    })
  })

  test('curso movido de Kids para Adult não vira bônus na vitrine Kids', async () => {
    const { courses, gamification, service, userId, accountId, mark } = setup()
    const course = makeCourse(['sz_g2d_create_ship'])
    courses.courses.push(course)
    mark(course.id, { showcased: false })

    course.audience = 'adult'
    course.careerSlot = null

    expect(await service.execute(userId, 'kids', accountId)).toEqual({ blocks: [] })
    expect(await gamification.getStudioUnlockRevision(userId, 'kids')).toBe(
      studioUnlockRevision([]),
    )
  })

  test('curso arquivado ainda acessível libera os blocos na primeira leitura', async () => {
    const { courses, gamification, service, userId, accountId, mark } = setup()
    const course = makeCourse(['sz_g2d_create_ship'])
    courses.courses.push(course)
    mark(course.id, {})

    course.status = 'archived'

    expect(await service.execute(userId, 'kids', accountId)).toEqual({
      blocks: ['sz_g2d_create_ship'],
    })
    expect(await gamification.getStudioUnlockRevision(userId, 'kids')).not.toBe(
      studioUnlockRevision([]),
    )
  })

  test('curso adulto libera paleta por conclusão; publicar sozinho não substitui conclusão', async () => {
    const { courses, service, userId, accountId, mark } = setup()
    const course = makeCourse(['sz_g2d_create_ship'], { audience: 'adult', careerSlot: null })
    courses.courses.push(course)
    mark(course.id, { audience: 'adult', completed: false })
    expect(await service.execute(userId, 'adult', accountId)).toEqual({ blocks: [] })

    mark(course.id, { audience: 'adult', showcased: false })
    expect(await service.execute(userId, 'adult', accountId)).toEqual({
      blocks: ['sz_g2d_create_ship'],
    })
  })

  test('a vitrine segrega: curso kids não vaza para a paleta do adulto', async () => {
    const { courses, service, userId, accountId, mark } = setup()
    const course = makeCourse(['sz_g2d_create_ship'])
    courses.courses.push(course)
    mark(course.id, {})
    expect(await service.execute(userId, 'adult', accountId)).toEqual({ blocks: [] })
  })
})
