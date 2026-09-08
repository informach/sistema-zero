import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { NoShowcaseBlockError } from '../../src/domain/course/course.errors'
import { DrizzleContentAdminRepository } from '../../src/infrastructure/persistence/drizzle/content-admin.repository'
import { DrizzleCourseRepository } from '../../src/infrastructure/persistence/drizzle/course.repository'
import {
  createDbConnection,
  type DbConnection,
} from '../../src/infrastructure/persistence/drizzle/db'
import { prepareContentReadinessTables } from './content-readiness-fixture'
import { prepareTestDatabase } from './test-database'

const url = await prepareTestDatabase()
describe.skipIf(!url)('career authoring readiness (Postgres)', () => {
  let conn: DbConnection
  let repo: DrizzleContentAdminRepository
  const ownedCourses: string[] = []
  beforeAll(async () => {
    if (!url) throw new Error('Missing test database')
    conn = createDbConnection(url)
    await prepareContentReadinessTables(conn)
    repo = new DrizzleContentAdminRepository(conn.db)
  })
  afterAll(async () => {
    if (!conn) return
    for (const id of ownedCourses) {
      await conn.sql`delete from members.lesson_blocks where lesson_id in (select id from members.lessons where course_id = ${id})`
      await conn.sql`delete from members.lessons where course_id = ${id}`
      await conn.sql`delete from members.modules where course_id = ${id}`
      await conn.sql`delete from members.courses where id = ${id}`
    }
    await conn.close()
  })
  async function seed() {
    const course = await repo.createCourse({
      slug: `ready-${randomUUID()}`,
      title: 'Criar',
      subtitle: null,
      description: null,
      coverImageUrl: null,
      salesPageUrl: null,
      status: 'draft',
      audience: 'kids',
      sequentialLock: false,
      level: 'iniciante',
      track: '2d',
      careerSlot: null,
    })
    ownedCourses.push(course.id)
    const mod = await repo.createModule(course.id, { title: 'Mundo', summary: null })
    const lesson = await repo.createLesson(mod.id, course.id, {
      slug: 'publicar',
      title: 'Publicar',
      estimatedMinutes: null,
      isPublished: true,
    })
    const block = await repo.createBlock(lesson.id, 'studio', {
      kind: 'studio',
      initialProject: null,
      showcase: { enabled: true, title: 'Jogo' },
    })
    // Unique position belongs only to this test. Cleanup releases it for the next seed.
    const published = { ...course, status: 'published' as const, careerSlot: 2 }
    await repo.updateCourse(published)
    return { course: { ...published, version: published.version + 1 }, mod, lesson, block }
  }
  test('concurrent deletions leave one publication activity and allow an explicit unpublish', async () => {
    const { course, lesson, block } = await seed()
    const other = await repo.createBlock(lesson.id, 'studio', {
      kind: 'studio',
      initialProject: null,
      showcase: { enabled: true, title: 'Outro jogo' },
    })
    const outcomes = await Promise.allSettled([
      repo.deleteBlock(block.id),
      repo.deleteBlock(other.id),
    ])
    expect(outcomes.filter((result) => result.status === 'fulfilled')).toHaveLength(1)
    const rejected = outcomes.find((result) => result.status === 'rejected')
    expect(rejected?.status === 'rejected' && rejected.reason instanceof NoShowcaseBlockError).toBe(
      true,
    )
    expect(await repo.listCourseIdsWithShowcaseBlock([course.id])).toEqual([course.id])
    await repo.updateCourse({ ...course, status: 'draft', careerSlot: null })
    for (const id of await repo.listBlockIds(lesson.id))
      expect(await repo.deleteBlock(id)).toBe(true)
  })
  test('unpublishing its lesson, deleting its module and changing its block cannot strand a career', async () => {
    const { course, lesson, mod, block } = await seed()
    const operations = [
      () => repo.updateLesson(lesson.id, { ...lesson, isPublished: false }),
      () => repo.deleteLesson(lesson.id),
      () => repo.deleteModule(mod.id),
      () => repo.updateBlock(block.id, 'rich_text', { kind: 'rich_text', markdown: 'Oi' }),
    ]
    for (const operation of operations) {
      const [result] = await Promise.allSettled([operation()])
      expect(result?.status).toBe('rejected')
      if (result?.status === 'rejected') expect(result.reason).toBeInstanceOf(NoShowcaseBlockError)
    }
    expect(await repo.listCourseIdsWithShowcaseBlock([course.id])).toEqual([course.id])
    await repo.updateCourse({ ...course, status: 'draft', careerSlot: null })
  })

  test('an activity hidden by coming soon cannot replace the last usable publication', async () => {
    const { course, mod, lesson, block } = await seed()
    try {
      const hidden = await repo.createLesson(mod.id, course.id, {
        slug: 'em-breve',
        title: 'Em breve',
        estimatedMinutes: null,
        isPublished: true,
      })
      await repo.createBlock(hidden.id, 'studio', {
        kind: 'studio',
        initialProject: null,
        showcase: { enabled: true, title: 'Depois' },
      })
      await repo.createBlock(hidden.id, 'coming_soon', { kind: 'coming_soon' })
      expect(await new DrizzleCourseRepository(conn.db).listShowcaseLessonIds(course.id)).toEqual([
        lesson.id,
      ])
      const [removed] = await Promise.allSettled([repo.deleteBlock(block.id)])
      expect(removed?.status).toBe('rejected')
      if (removed?.status === 'rejected')
        expect(removed.reason).toBeInstanceOf(NoShowcaseBlockError)
      await repo.updateCourse({ ...course, status: 'draft', careerSlot: null })
      await repo.deleteBlock(block.id)
      expect(await repo.listCourseIdsWithShowcaseBlock([course.id])).toEqual([])
    } finally {
      await conn.sql`update members.courses set status='draft',career_slot=null where id=${course.id}`
    }
  })

  test('adding or converting a placeholder cannot hide the last publication activity', async () => {
    const { course, lesson } = await seed()
    try {
      const text = await repo.createBlock(lesson.id, 'rich_text', {
        kind: 'rich_text',
        markdown: 'Introdução',
      })
      for (const operation of [
        () => repo.createBlock(lesson.id, 'coming_soon', { kind: 'coming_soon' }),
        () => repo.updateBlock(text.id, 'coming_soon', { kind: 'coming_soon' }),
      ]) {
        const [result] = await Promise.allSettled([operation()])
        expect(result?.status).toBe('rejected')
        if (result?.status === 'rejected')
          expect(result.reason).toBeInstanceOf(NoShowcaseBlockError)
      }
      expect(await repo.listCourseIdsWithShowcaseBlock([course.id])).toEqual([course.id])
    } finally {
      await conn.sql`update members.courses set status='draft',career_slot=null where id=${course.id}`
    }
  })
})
