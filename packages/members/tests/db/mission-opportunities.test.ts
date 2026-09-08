import { expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { createDbConnection } from '../../src/infrastructure/persistence/drizzle/db'
import { contentMissionOpportunities } from '../../src/infrastructure/persistence/drizzle/mission-opportunities'
import { prepareContentReadinessTables } from './content-readiness-fixture'
import { prepareTestDatabase } from './test-database'

const url = await prepareTestDatabase()
test.skipIf(!url)(
  'SQL mission opportunities exclude hidden content, barriers and prior learner events',
  async () => {
    if (!url) throw new Error('Test database unavailable')
    const conn = createDbConnection(url),
      userId = randomUUID(),
      courseId = randomUUID(),
      moduleId = randomUUID()
    const lesson1 = randomUUID(),
      lesson2 = randomUUID(),
      quizId = randomUUID(),
      barrierId = randomUUID()
    const slug = `mission-${courseId}`
    try {
      await prepareContentReadinessTables(conn)
      await conn.sql`create table if not exists members.xp_events(user_id uuid not null)`
      for (const column of [
        'id uuid',
        "audience text not null default 'kids'",
        "source_type text not null default 'course_complete'",
        'source_id uuid',
        'amount integer not null default 0',
        'created_at timestamptz not null default now()',
      ])
        await conn.sql.unsafe(`alter table members.xp_events add column if not exists ${column}`)
      await conn.sql`insert into members.courses(id,slug,title,status,audience) values(${courseId},${slug},'Curso','published','kids')`
      await conn.sql`insert into members.modules(id,course_id,title) values(${moduleId},${courseId},'Módulo')`
      await conn.sql`insert into members.lessons(id,module_id,course_id,slug,title,sort_order,is_published) values
      (${lesson1},${moduleId},${courseId},'inicio','Início',0,true),(${lesson2},${moduleId},${courseId},'fim','Fim',1,true)`
      await conn.sql`insert into members.lesson_blocks(id,lesson_id,kind,sort_order,content) values
      (${quizId},${lesson1},'quiz',0,'{"kind":"quiz","questions":[{"id":"q"}]}'::jsonb),
      (${randomUUID()},${lesson2},'studio',0,'{"kind":"studio","showcase":{"enabled":true}}'::jsonb)`
      const read = () => contentMissionOpportunities(conn.db, userId, 'kids', [slug])
      const before = await read()
      expect(Object.fromEntries(before)).toEqual({
        lesson_complete: 2,
        unit_complete: 1,
        quiz_passed: 1,
        studio_submitted: 1,
        course_showcased: 1,
        course_rated: 1,
      })
      expect(
        (await contentMissionOpportunities(conn.db, userId, 'adult', [slug])).get('quiz_passed'),
      ).toBe(0)
      expect(
        (await contentMissionOpportunities(conn.db, userId, 'kids', [])).get('quiz_passed'),
      ).toBe(0)
      await conn.sql`insert into members.lesson_blocks(id,lesson_id,kind,sort_order,content) values
      (${barrierId},${lesson1},'coming_soon',1,'{"kind":"coming_soon"}'::jsonb)`
      expect([...(await read()).values()]).toEqual([0, 0, 0, 0, 0, 0])
      await conn.sql`delete from members.lesson_blocks where id=${barrierId}`
      await conn.sql`update members.lessons set is_published=false where id=${lesson2}`
      expect((await read()).get('studio_submitted')).toBe(0)
      expect((await read()).get('course_showcased')).toBe(0)
      await conn.sql`insert into members.xp_events(id,user_id,audience,source_type,source_id,amount,created_at)
      values(${randomUUID()},${userId},'kids','quiz_passed',${quizId},15,now())`
      expect((await read()).get('quiz_passed')).toBe(0)
      expect(
        (await contentMissionOpportunities(conn.db, randomUUID(), 'kids', [slug])).get(
          'quiz_passed',
        ),
      ).toBe(1)
    } finally {
      await conn.sql`delete from members.xp_events where user_id=${userId}`
      await conn.sql`delete from members.lesson_blocks where lesson_id in (${lesson1},${lesson2})`
      await conn.sql`delete from members.lessons where course_id=${courseId}`
      await conn.sql`delete from members.modules where course_id=${courseId}`
      await conn.sql`delete from members.courses where id=${courseId}`
      await conn.close()
    }
  },
)
