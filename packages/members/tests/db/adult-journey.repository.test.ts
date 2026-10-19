import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { EMPTY_ADULT_JOURNEY_POLICY } from '@sistemazero/core/journey'
import { DrizzleAdultJourneyRepository } from '../../src/infrastructure/persistence/drizzle/adult-journey.repository'
import {
  createDbConnection,
  type DbConnection,
} from '../../src/infrastructure/persistence/drizzle/db'
import { prepareTestDatabase } from './test-database'

const url = await prepareTestDatabase()
describe.skipIf(!url)('jornada adulta (Postgres real)', () => {
  let conn: DbConnection
  let repository: DrizzleAdultJourneyRepository
  const userId = randomUUID()
  const otherId = randomUUID()
  const now = new Date('2026-10-18T12:00:00Z')
  beforeAll(async () => {
    conn = createDbConnection(url as string)
    repository = new DrizzleAdultJourneyRepository(conn.db)
    await conn.sql`delete from members.adult_journey_policy`
    await conn.sql.unsafe(`create table if not exists members.account_deletion_fences (
      account_id uuid primary key, created_at timestamptz not null
    )`)
    await conn.sql.unsafe(`create table if not exists members.xp_events (
      id uuid primary key, user_id uuid not null, audience text not null,
      source_type text not null, source_id uuid not null, amount integer not null,
      created_at timestamptz not null
    )`)
  })
  afterAll(async () => {
    await conn.sql`delete from members.adult_journey_grants where user_id = ${userId}`
    await conn.sql`delete from members.xp_events where user_id in (${userId}, ${otherId})`
    await conn.sql`delete from members.account_deletion_fences where account_id = ${userId}`
    await conn.sql`delete from members.adult_journey_policy`
    await conn.sql.end()
  })
  test('dois editores na mesma versão não sobrescrevem a configuração um do outro', async () => {
    const first = await Promise.all([
      repository.savePolicy(EMPTY_ADULT_JOURNEY_POLICY, 0, now),
      repository.savePolicy(EMPTY_ADULT_JOURNEY_POLICY, 0, now),
    ])
    expect(first.filter(Boolean)).toHaveLength(1)
    const updates = await Promise.all([
      repository.savePolicy(EMPTY_ADULT_JOURNEY_POLICY, 1, now),
      repository.savePolicy(EMPTY_ADULT_JOURNEY_POLICY, 1, now),
    ])
    expect(updates.filter(Boolean)).toHaveLength(1)
    expect((await repository.getPolicy())?.version).toBe(2)
  })
  test('versão obsoleta não congela capacidade; repetição deduplica e cerca de exclusão bloqueia', async () => {
    expect(await repository.freezeGranted(userId, 1, ['studio'], now)).toBe(false)
    expect(await repository.listGranted(userId)).toEqual([])
    expect(await repository.freezeGranted(userId, 2, ['studio'], now)).toBe(true)
    expect(await repository.freezeGranted(userId, 2, ['studio'], now)).toBe(true)
    expect(await repository.listGranted(userId)).toEqual(['studio'])
    await conn.sql`insert into members.account_deletion_fences (account_id, created_at) values (${userId}, ${now.toISOString()})`
    expect(await repository.freezeGranted(userId, 2, ['ai'], now)).toBe(false)
    expect(await repository.listGranted(userId)).toEqual(['studio'])
  })
  test('eventos Kids da mesma conta não viram marcos adultos', async () => {
    const course = randomUUID()
    const kidsCourse = randomUUID()
    for (const [audience, sourceId] of [
      ['adult', course],
      ['kids', kidsCourse],
    ] as const) {
      await conn.sql`insert into members.xp_events (id, user_id, audience, source_type, source_id, amount, created_at)
        values (${randomUUID()}, ${userId}, ${audience}, 'course_complete', ${sourceId}, 50, ${now.toISOString()})`
    }
    expect(await repository.listMilestones(userId)).toEqual([
      { courseId: course, completed: true, showcased: false },
    ])
    expect(await repository.listMilestones(randomUUID())).toEqual([])
  })
  test('marcos de várias pessoas numa consulta: só os adultos de curso, separados por pessoa', async () => {
    const shared = randomUUID()
    const own = randomUUID()
    const insert = (user: string, audience: string, type: string, source: string) =>
      conn.sql`insert into members.xp_events (id, user_id, audience, source_type, source_id, amount, created_at)
        values (${randomUUID()}, ${user}, ${audience}, ${type}, ${source}, 0, ${now.toISOString()})`
    await insert(otherId, 'adult', 'course_complete', shared)
    await insert(otherId, 'adult', 'course_showcased', shared)
    await insert(otherId, 'adult', 'lesson_complete', own)
    await insert(otherId, 'kids', 'course_complete', own)
    const byUser = await repository.listMilestonesForUsers([userId, otherId, randomUUID()])
    expect(byUser.get(otherId)).toEqual([{ courseId: shared, completed: true, showcased: true }])
    expect(byUser.get(userId)?.every((milestone) => milestone.courseId !== shared)).toBe(true)
    expect((await repository.listMilestonesForUsers([])).size).toBe(0)
  })
})
