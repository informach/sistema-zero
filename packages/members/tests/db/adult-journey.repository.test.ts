import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { EMPTY_ADULT_JOURNEY_POLICY } from '@sistemazero/core/journey'
import { DrizzleAdultJourneyRepository } from '../../src/infrastructure/persistence/drizzle/adult-journey.repository'
import type { DbConnection } from '../../src/infrastructure/persistence/drizzle/db'
import { openKidsJourneyTestDatabase } from './kids-journey-database'

const url = process.env.ADULT_JOURNEY_TEST_DATABASE_URL
describe.skipIf(!url)('jornada adulta (Postgres real)', () => {
  let conn: DbConnection
  let repository: DrizzleAdultJourneyRepository
  const userId = randomUUID()
  const otherId = randomUUID()
  const now = new Date('2026-10-18T12:00:00Z')
  beforeAll(async () => {
    // Publication captures all outgoing journey sources atomically. Use their real
    // migration contracts in an isolated disposable database, not sparse tables.
    conn = await openKidsJourneyTestDatabase(url!)
    repository = new DrizzleAdultJourneyRepository(conn.db)
    const [row] = await conn.sql`select count(*)::int as count from members.adult_journey_policy`
    if (row?.count)
      throw new Error('Adult journey repository tests require an empty disposable database')
  }, 120_000)
  afterAll(async () => {
    // Keep the disposable database available for inspecting concurrent publication.
    await conn?.close()
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
  test('o piso da posição só sobe, na mesma transação e versão do congelamento', async () => {
    const reacher = otherId
    expect(await repository.getReached(reacher)).toBeNull()
    // Versão obsoleta: nem capacidade nem piso.
    expect(await repository.freezeGranted(reacher, 1, [], now, 3)).toBe(false)
    expect(await repository.getReached(reacher)).toBeNull()
    expect(await repository.freezeGranted(reacher, 2, [], now, 3)).toBe(true)
    expect(await repository.getReached(reacher)).toBe(3)
    // Uma posição menor (política editada) não desce o piso nem troca a data.
    const later = new Date('2026-10-19T12:00:00Z')
    expect(await repository.freezeGranted(reacher, 2, [], later, 2)).toBe(true)
    const [kept] = await conn.sql<{ position: number; reached_at: string | Date }[]>`
      select position, reached_at from members.adult_journey_reached where user_id = ${reacher}`
    expect(kept?.position).toBe(3)
    expect(new Date(kept?.reached_at ?? 0).toISOString()).toBe(now.toISOString())
    // Corrida de duas subidas: vence a maior.
    await Promise.all([
      repository.freezeGranted(reacher, 2, [], later, 5),
      repository.freezeGranted(reacher, 2, [], later, 4),
    ])
    expect(await repository.getReached(reacher)).toBe(5)
    const many = await repository.listReachedForUsers([reacher, userId, randomUUID()])
    expect([...many]).toEqual([[reacher, 5]])
    expect((await repository.listReachedForUsers([])).size).toBe(0)
    // Conta cercada para exclusão também não ganha piso. Conta própria: o teste não depende
    // da ordem dos outros deste arquivo.
    const fenced = randomUUID()
    await conn.sql`insert into members.account_deletion_fences (account_id, created_at)
      values (${fenced}, ${now.toISOString()})`
    try {
      expect(await repository.freezeGranted(fenced, 2, [], now, 2)).toBe(false)
      expect(await repository.getReached(fenced)).toBeNull()
    } finally {
      await conn.sql`delete from members.account_deletion_fences where account_id = ${fenced}`
    }
  })
  test('seed automático: instâncias concorrentes gravam UMA vez e nunca sobrescrevem', async () => {
    await conn.sql`delete from members.adult_journey_policy`
    const seed = {
      schemaVersion: 1 as const,
      stages: [
        {
          id: 'aprendiz',
          title: 'Aprendiz',
          requirements: [{ courseId: randomUUID(), milestone: 'complete' as const }],
          capabilities: ['studio' as const],
        },
      ],
    }
    const results = await Promise.all(
      Array.from({ length: 6 }, () => repository.insertPolicyIfAbsent(seed, now)),
    )
    expect(results.filter(Boolean)).toHaveLength(1)
    expect((await repository.getPolicy())?.version).toBe(1)
    // A equipe edita no Admin; o seed seguinte não toca na linha.
    const admin = { ...seed, stages: [{ ...seed.stages[0]!, title: 'Editada no Admin' }] }
    await repository.savePolicy(admin, 1, now)
    const [before] = await conn.sql`select version, policy::text as policy, updated_at
      from members.adult_journey_policy where id = 'adult'`
    expect(await repository.insertPolicyIfAbsent(seed, new Date())).toBeNull()
    const [after] = await conn.sql`select version, policy::text as policy, updated_at
      from members.adult_journey_policy where id = 'adult'`
    expect(after).toEqual(before)
    expect(before?.version).toBe(2)
  })
})
