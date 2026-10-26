import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { initialKidsJourneyPolicy } from '@sistemazero/core/journey'
import {
  buildCreatorJourneySeed,
  type CreatorEditorialSpec,
  type CreatorJourneySeedPlan,
} from '../../src/application/creator-journey/creator-journey-seed'
import { creatorSeedRequiredLessonIds } from '../../src/domain/course/creator-seed-metadata'
import { DrizzleContentAdminRepository } from '../../src/infrastructure/persistence/drizzle/content-admin.repository'
import { DrizzleCreatorJourneySeedRepository } from '../../src/infrastructure/persistence/drizzle/creator-journey-seed.repository'
import type { DbConnection } from '../../src/infrastructure/persistence/drizzle/db'
import { kidsJourneyPolicy } from '../../src/infrastructure/persistence/drizzle/schema'
import { openKidsJourneyTestDatabase } from './kids-journey-database'

const target = process.env.CREATOR_JOURNEY_TEST_DATABASE_URL
const spec = JSON.parse(
  readFileSync(
    new URL('../../../../docs/design/jornada-criador-curriculo-2026-10-25.json', import.meta.url),
    'utf8',
  ),
) as CreatorEditorialSpec
describe.skipIf(!target)('creator curriculum editorial seed (real local migrations)', () => {
  let connection: DbConnection
  let plan: CreatorJourneySeedPlan
  let ownedIds: string[] = []
  const existingId = randomUUID()
  beforeAll(async () => {
    connection = await openKidsJourneyTestDatabase(target!)
    const [count] = await connection.sql`select count(*)::int as count from members.courses`
    if (count?.count !== 0)
      throw new Error('This test needs its own empty disposable kids_journey_* database.')
    await connection.sql`insert into members.courses
      (id, slug, title, status, audience, level, track, career_slot, journey_role, metadata, version, created_at, updated_at)
      values (${existingId}, 'desafio-primeiro-jogo', 'Farol existente', 'published', 'kids', 'primeiros-passos', '2d', 1, 'positioned', '{"studioUnlockBlocks":["sz_keep"]}', 7, now(), now())`
    ownedIds.push(existingId)
  }, 60000)
  afterAll(async () => {
    if (!connection) return
    if (ownedIds.length)
      await connection.sql`delete from members.courses where id in ${connection.sql(ownedIds)}`
    await connection.close()
  })
  test('creates unpublished outlines and preserves real existing identity and content; rerun makes no changes', async () => {
    const content = new DrizzleContentAdminRepository(connection.db)
    plan = buildCreatorJourneySeed(
      spec,
      (await content.listCoursesAdmin({ limit: 500, offset: 0 })).items,
    )
    const result = await new DrizzleCreatorJourneySeedRepository(connection.db).apply(plan)
    ownedIds = [
      ...new Set([
        ...ownedIds,
        ...plan.courses.filter((course) => course.action === 'create').map((course) => course.id),
      ]),
    ]
    expect(result).toEqual({ created: 293, preserved: 1 })
    const [existing] =
      await connection.sql`select id,title,status,career_slot,metadata,version from members.courses where id=${existingId}`
    expect(existing).toMatchObject({
      id: existingId,
      title: 'Farol existente',
      status: 'published',
      career_slot: 1,
      version: 7,
      metadata: { studioUnlockBlocks: ['sz_keep'] },
    })
    const [drafts] =
      await connection.sql`select count(*)::int as count from members.courses where status='draft'`
    expect(drafts?.count).toBe(293)
    const [publishedLessons] =
      await connection.sql`select count(*)::int as count from members.lessons where is_published=true`
    expect(publishedLessons?.count).toBe(0)
    const again = buildCreatorJourneySeed(
      spec,
      (await content.listCoursesAdmin({ limit: 500, offset: 0 })).items,
    )
    expect(await new DrizzleCreatorJourneySeedRepository(connection.db).apply(again)).toEqual({
      created: 0,
      preserved: 294,
    })
    expect(again.curricula).toEqual(plan.curricula)
  })
  test('a changed catalog version invalidates the reviewed plan without overwriting anything', async () => {
    const content = new DrizzleContentAdminRepository(connection.db)
    const stale = buildCreatorJourneySeed(
      spec,
      (await content.listCoursesAdmin({ limit: 500, offset: 0 })).items,
    )
    await connection.sql`update members.courses set version=version+1 where id=${existingId}`
    await expect(
      new DrizzleCreatorJourneySeedRepository(connection.db).apply(stale),
    ).rejects.toThrow('O catálogo mudou')
  })
  test('planned lesson coverage is fenced at publication and cannot shrink while the course is published', async () => {
    const content = new DrizzleContentAdminRepository(connection.db)
    const all = (await content.listCoursesAdmin({ limit: 500, offset: 0 })).items
    const course = all.find((course) => course.slug === 'jornada-faisca-missao')!
    expect(course).toBeDefined()
    const planned =
      await connection.sql`select id,title from members.lessons where course_id=${course.id} order by sort_order`
    expect(planned.length).toBeGreaterThan(1)
    await connection.sql`update members.lessons set is_published=true where id=${planned[0]!.id}`
    await expect(content.updateCourse({ ...course, status: 'published' })).rejects.toThrow(
      'Publique todas',
    )
    await connection.sql`update members.lessons set is_published=true where course_id=${course.id}`
    expect(await content.updateCourse({ ...course, status: 'published' })).toBe(true)
    await expect(content.deleteLesson(planned[0]!.id)).rejects.toThrow('planejamento obrigatório')
    const [module] =
      await connection.sql`select id from members.modules where course_id=${course.id}`
    await expect(content.deleteModule(module!.id)).rejects.toThrow('planejamento obrigatório')
  })
  test('cloning a seeded course maps its planned lesson identities to the cloned tree', async () => {
    const content = new DrizzleContentAdminRepository(connection.db)
    const source = (await content.listCoursesAdmin({ limit: 500, offset: 0 })).items.find(
      (course) => course.slug === 'jornada-faisca-missao',
    )!
    const clone = await content.cloneCourseTree(source.id, {
      expectedSourceVersion: source.version,
      expectedSourceAudience: 'kids',
      slug: 'planned-clone-test',
      title: 'Clone planejado',
      audience: 'adult',
      modality: 'recorded',
    })
    if (!clone) throw new Error('Expected cloned course')
    ownedIds.push(clone.id)
    const originalIds = creatorSeedRequiredLessonIds(source.metadata)!
    const clonedIds = creatorSeedRequiredLessonIds(clone.metadata)!
    expect(clonedIds).toHaveLength(originalIds.length)
    expect(clonedIds.some((id) => originalIds.includes(id))).toBe(false)
    const rows = await connection.sql`select id from members.lessons where course_id=${clone.id}`
    expect(clonedIds.every((id) => rows.some((row) => row.id === id))).toBe(true)
  })
  test('draft authoring cannot orphan planned lesson identities; editing and removing optional lessons remain possible', async () => {
    const content = new DrizzleContentAdminRepository(connection.db)
    const courseId = plan.curricula.kids.stages[1]!.missionCourseId
    const [planned] =
      await connection.sql`select id,module_id,slug,title from members.lessons where course_id=${courseId} order by sort_order limit 1`
    for (const remove of [
      () => content.deleteLesson(planned!.id),
      () => content.deleteModule(planned!.module_id),
    ]) {
      let failure: unknown
      try {
        await remove()
      } catch (error) {
        failure = error
      }
      expect(failure).toBeInstanceOf(Error)
      if (!(failure instanceof Error)) throw new Error('A exclusão deveria ter sido recusada.')
      expect(failure.message).toContain('planejamento obrigatório')
    }
    const edited = await content.updateLesson(planned!.id, {
      slug: planned!.slug,
      title: 'Roteiro revisado sem perder a identidade',
      isPublished: false,
      estimatedMinutes: null,
    })
    expect(edited?.title).toBe('Roteiro revisado sem perder a identidade')
    const optional = await content.createLesson(planned!.module_id, courseId, {
      slug: 'rascunho-opcional',
      title: 'Rascunho opcional',
      isPublished: false,
      estimatedMinutes: null,
    })
    expect(await content.deleteLesson(optional.id)).toBe(true)
    const [retained] = await connection.sql`select id from members.lessons where id=${planned!.id}`
    expect(retained?.id).toBe(planned!.id)
  })
  test('SQL publication respects the new policy when a preserved course still has its historical slot', async () => {
    const content = new DrizzleContentAdminRepository(connection.db)
    const existing = (await content.listCoursesAdmin({ limit: 500, offset: 0 })).items.find(
      (course) => course.id === existingId,
    )!
    expect(await content.updateCourse({ ...existing, status: 'draft' })).toBe(true)
    const draft = { ...existing, version: existing.version + 1, status: 'draft' as const }
    const moduleId = randomUUID()
    await connection.sql`insert into members.modules(id,course_id,title,created_at,updated_at) values(${moduleId},${existingId},'Conteúdo existente',now(),now())`
    await connection.sql`insert into members.lessons(id,course_id,module_id,slug,title,is_published,created_at,updated_at) values(${randomUUID()},${existingId},${moduleId},'aula-existente','Aula existente',true,now(),now())`
    const original = await connection.db.select().from(kidsJourneyPolicy)
    try {
      await connection.db.delete(kidsJourneyPolicy)
      await connection.db.insert(kidsJourneyPolicy).values({
        id: 'kids',
        phase: 'published',
        version: 1,
        policy: { ...initialKidsJourneyPolicy(), curriculum: plan.curricula.kids },
        updatedAt: new Date(),
      })
      expect(await content.updateCourse({ ...draft, status: 'published' })).toBe(true)
    } finally {
      await connection.db.delete(kidsJourneyPolicy)
      if (original.length) await connection.db.insert(kidsJourneyPolicy).values(original)
    }
  })
})
