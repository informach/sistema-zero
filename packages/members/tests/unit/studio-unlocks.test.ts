import { describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
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
 * e o aluno tem a união dos cursos elegíveis (bônus Kids: conclusão; demais:
 * conclusão + Mural).
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
    metadata: unlockBlocks ? { studioUnlockBlocks: unlockBlocks } : null,
    createdAt: now,
    updatedAt: now,
  } as Course
}

function setup() {
  const courses = new InMemoryCourseRepository()
  const entitlements = new InMemoryEntitlementRepository()
  const gamification = new InMemoryGamificationRepository({ entitlements, courses })
  const unlocks = new InMemoryStudioUnlockRepository()
  const service = new GetStudioUnlocksService(gamification, unlocks, silentLogger)
  const userId = randomUUID()

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

  return { courses, gamification, unlocks, service, userId, mark }
}

describe('GetStudioUnlocksService', () => {
  test('sem curso qualificado, a paleta vem vazia (o tier cai no perfil do nível)', async () => {
    const { service, userId } = setup()
    expect(await service.execute(userId, 'kids')).toEqual({ blocks: [] })
  })

  test('curso Kids com posição: concluir SEM publicar no Mural não libera nada', async () => {
    const { courses, service, userId, mark } = setup()
    const course = makeCourse(['sz_g2d_create_ship'])
    courses.courses.push(course)
    mark(course.id, { showcased: false })
    expect(await service.execute(userId, 'kids')).toEqual({ blocks: [] })
  })

  test('curso Kids bônus: concluir libera sem publicação no Mural', async () => {
    const { courses, service, userId, mark } = setup()
    const course = makeCourse(['sz_g2d_create_ship'], { careerSlot: null })
    courses.courses.push(course)
    mark(course.id, { showcased: false })
    expect(await service.execute(userId, 'kids')).toEqual({ blocks: ['sz_g2d_create_ship'] })
  })

  test('publicar SEM concluir também não libera', async () => {
    const { courses, service, userId, mark } = setup()
    const course = makeCourse(['sz_g2d_create_ship'])
    courses.courses.push(course)
    mark(course.id, { completed: false })
    expect(await service.execute(userId, 'kids')).toEqual({ blocks: [] })
  })

  test('curso Kids bônus: publicar SEM concluir também não libera', async () => {
    const { courses, service, userId, mark } = setup()
    const course = makeCourse(['sz_g2d_create_ship'], { careerSlot: null })
    courses.courses.push(course)
    mark(course.id, { completed: false })
    expect(await service.execute(userId, 'kids')).toEqual({ blocks: [] })
  })

  test('curso Kids bônus: publicar depois da conclusão não duplica o grant', async () => {
    const { courses, unlocks, service, userId, mark } = setup()
    const course = makeCourse(['sz_g2d_create_ship'], { careerSlot: null })
    courses.courses.push(course)
    mark(course.id, { showcased: false })
    await service.execute(userId, 'kids')

    mark(course.id, { completed: false })
    expect(await service.execute(userId, 'kids')).toEqual({ blocks: ['sz_g2d_create_ship'] })
    expect(unlocks.grants).toHaveLength(1)
  })

  test('concluir + publicar libera os blocos do curso', async () => {
    const { courses, service, userId, mark } = setup()
    const course = makeCourse(['sz_g2d_create_ship', 'sz_g2d_arrows_x'])
    courses.courses.push(course)
    mark(course.id, {})
    const { blocks } = await service.execute(userId, 'kids')
    expect(blocks.sort()).toEqual(['sz_g2d_arrows_x', 'sz_g2d_create_ship'])
  })

  test('dois cursos somam (sem repetir o bloco em comum)', async () => {
    const { courses, service, userId, mark } = setup()
    const a = makeCourse(['sz_g2d_create_ship', 'sz_val_number'])
    const b = makeCourse(['sz_g2d_on_key', 'sz_val_number'])
    courses.courses.push(a, b)
    mark(a.id, {})
    mark(b.id, {})
    const { blocks } = await service.execute(userId, 'kids')
    // `sz_val_number` está nos DOIS cursos e aparece uma vez só.
    expect(blocks.sort()).toEqual(['sz_g2d_create_ship', 'sz_g2d_on_key', 'sz_val_number'])
  })

  test('⭐⭐ ROLLOUT: curso já no ar e concluído ANTES de existir currículo — cadastrar libera sozinho', async () => {
    // O caso real da virada: o curso-base está publicado há tempo, crianças já o
    // concluíram e publicaram, e só AGORA a professora cadastra as ferramentas. Elas
    // recebem na próxima tela que carregar, sem backfill e sem refazer o curso — é a
    // metade "ao vivo" da união que garante isso.
    const { courses, service, userId, mark } = setup()
    const course = makeCourse() // sem currículo nenhum no metadata
    courses.courses.push(course)
    mark(course.id, {})
    expect(await service.execute(userId, 'kids')).toEqual({ blocks: [] })

    course.metadata = { studioUnlockBlocks: ['sz_g2d_create_ship', 'sz_g2d_on_key'] }
    const depois = await service.execute(userId, 'kids')
    expect(depois.blocks.sort()).toEqual(['sz_g2d_create_ship', 'sz_g2d_on_key'])
  })

  test('⭐ bloco ACRESCENTADO ao JSON chega em quem já concluiu o curso', async () => {
    const { courses, service, userId, mark } = setup()
    const course = makeCourse(['sz_g2d_create_ship'])
    courses.courses.push(course)
    mark(course.id, {})
    await service.execute(userId, 'kids')
    course.metadata = { studioUnlockBlocks: ['sz_g2d_create_ship', 'sz_g2d_explode'] }
    const { blocks } = await service.execute(userId, 'kids')
    expect(blocks.sort()).toEqual(['sz_g2d_create_ship', 'sz_g2d_explode'])
  })

  test('⭐⭐ bloco REMOVIDO do JSON NÃO é revogado de quem já o tinha', async () => {
    const { courses, service, userId, mark } = setup()
    const course = makeCourse(['sz_g2d_create_ship', 'sz_g2d_explode'])
    courses.courses.push(course)
    mark(course.id, {})
    // 1ª visita ao Estúdio: congela o que foi servido.
    expect((await service.execute(userId, 'kids')).blocks.sort()).toEqual([
      'sz_g2d_create_ship',
      'sz_g2d_explode',
    ])
    // A professora tira um bloco do currículo do curso.
    course.metadata = { studioUnlockBlocks: ['sz_g2d_create_ship'] }
    const { blocks } = await service.execute(userId, 'kids')
    expect(blocks.sort()).toEqual(['sz_g2d_create_ship', 'sz_g2d_explode'])
  })

  test('⭐⭐ curso APAGADO não tira a ferramenta de quem já o concluiu', async () => {
    const { courses, service, userId, mark } = setup()
    const course = makeCourse(['sz_g2d_create_ship'])
    courses.courses.push(course)
    mark(course.id, {})
    await service.execute(userId, 'kids')
    courses.courses.length = 0
    expect(await service.execute(userId, 'kids')).toEqual({ blocks: ['sz_g2d_create_ship'] })
  })

  test('só congela quando a união CRESCE (abrir o Estúdio não vira UPDATE por visita)', async () => {
    const { courses, unlocks, service, userId, mark } = setup()
    const course = makeCourse(['sz_g2d_create_ship'])
    courses.courses.push(course)
    mark(course.id, {})
    await service.execute(userId, 'kids')
    const snapshot = JSON.stringify(unlocks.grants)
    let writes = 0
    const original = unlocks.saveGrants.bind(unlocks)
    unlocks.saveGrants = async (...args) => {
      writes += 1
      return original(...args)
    }
    await service.execute(userId, 'kids')
    expect(writes).toBe(0)
    expect(JSON.stringify(unlocks.grants)).toBe(snapshot)
  })

  test('falhar ao congelar NÃO nega a paleta de agora', async () => {
    const { courses, unlocks, service, userId, mark } = setup()
    const course = makeCourse(['sz_g2d_create_ship'])
    courses.courses.push(course)
    mark(course.id, {})
    unlocks.saveGrants = async () => {
      throw new Error('banco fora')
    }
    expect(await service.execute(userId, 'kids')).toEqual({ blocks: ['sz_g2d_create_ship'] })
  })

  test('bônus reclassificado para carreira preserva ferramenta já servida', async () => {
    const { courses, service, userId, mark } = setup()
    const course = makeCourse(['sz_g2d_create_ship'], { careerSlot: null })
    courses.courses.push(course)
    mark(course.id, { showcased: false })
    await service.execute(userId, 'kids')

    course.careerSlot = 2
    expect(await service.execute(userId, 'kids')).toEqual({ blocks: ['sz_g2d_create_ship'] })
  })

  test('bônus reclassificado antes da primeira leitura passa a exigir o Mural', async () => {
    const { courses, service, userId, mark } = setup()
    const course = makeCourse(['sz_g2d_create_ship'], { careerSlot: null })
    courses.courses.push(course)
    mark(course.id, { showcased: false })

    course.careerSlot = 2
    expect(await service.execute(userId, 'kids')).toEqual({ blocks: [] })
  })

  test('curso da carreira reclassificado como bônus reconhece a conclusão anterior', async () => {
    const { courses, service, userId, mark } = setup()
    const course = makeCourse(['sz_g2d_create_ship'])
    courses.courses.push(course)
    mark(course.id, { showcased: false })
    expect(await service.execute(userId, 'kids')).toEqual({ blocks: [] })

    course.careerSlot = null
    expect(await service.execute(userId, 'kids')).toEqual({ blocks: ['sz_g2d_create_ship'] })
  })

  test('curso movido de Kids para Adult não vira bônus na vitrine Kids', async () => {
    const { courses, gamification, service, userId, mark } = setup()
    const course = makeCourse(['sz_g2d_create_ship'])
    courses.courses.push(course)
    mark(course.id, { showcased: false })

    course.audience = 'adult'
    course.careerSlot = null

    expect(await service.execute(userId, 'kids')).toEqual({ blocks: [] })
    expect(await gamification.getStudioUnlockRevision(userId, 'kids')).toBe(
      studioUnlockRevision([]),
    )
  })

  test('curso arquivado antes da primeira leitura não funciona como fonte viva', async () => {
    const { courses, gamification, service, userId, mark } = setup()
    const course = makeCourse(['sz_g2d_create_ship'])
    courses.courses.push(course)
    mark(course.id, {})

    course.status = 'archived'

    expect(await service.execute(userId, 'kids')).toEqual({ blocks: [] })
    expect(await gamification.getStudioUnlockRevision(userId, 'kids')).toBe(
      studioUnlockRevision([]),
    )
  })

  test('curso Adult sem posição preserva a exigência de conclusão E Mural', async () => {
    const { courses, service, userId, mark } = setup()
    const course = makeCourse(['sz_g2d_create_ship'], { audience: 'adult', careerSlot: null })
    courses.courses.push(course)
    mark(course.id, { audience: 'adult', showcased: false })
    expect(await service.execute(userId, 'adult')).toEqual({ blocks: [] })

    mark(course.id, { audience: 'adult', completed: false })
    expect(await service.execute(userId, 'adult')).toEqual({ blocks: ['sz_g2d_create_ship'] })
  })

  test('a vitrine segrega: curso kids não vaza para a paleta do adulto', async () => {
    const { courses, service, userId, mark } = setup()
    const course = makeCourse(['sz_g2d_create_ship'])
    courses.courses.push(course)
    mark(course.id, {})
    expect(await service.execute(userId, 'adult')).toEqual({ blocks: [] })
  })
})
