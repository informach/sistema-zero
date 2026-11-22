import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import type { DbConnection } from '../../src/infrastructure/persistence/drizzle/db'
import { DrizzleEntitlementRepository } from '../../src/infrastructure/persistence/drizzle/entitlement.repository'
import { openKidsJourneyTestDatabase } from './kids-journey-database'

const target = process.env.PARENTS_LEARNERS_TEST_DATABASE_URL
describe.skipIf(!target)('lista de responsáveis no Postgres real', () => {
  let connection: DbConnection
  let repo: DrizzleEntitlementRepository
  const parentId = randomUUID(),
    adultId = randomUUID(),
    parentSlug = `pais-${parentId}`,
    adultSlug = `adulto-${adultId}`
  const master = randomUUID(),
    specific = randomUUID(),
    adult = randomUUID(),
    expired = randomUUID()
  const users = [master, specific, adult, expired]
  const now = new Date('2026-11-22T12:00:00Z')
  beforeAll(async () => {
    if (!target) throw new Error('Banco descartável não configurado')
    connection = await openKidsJourneyTestDatabase(target)
    repo = new DrizzleEntitlementRepository(connection.db)
    for (const [id, slug, audience, learner] of [
      [parentId, parentSlug, 'kids', 'parents'],
      [adultId, adultSlug, 'adult', 'child'],
    ] as const)
      await connection.sql`insert into members.courses(id,slug,title,status,audience,learner,level,track,modality,metadata,created_at,updated_at)
        values(${id},${slug},${slug},'published',${audience},${learner},'iniciante','2d','recorded','{}'::jsonb,now(),now())`
    for (const [userId, accessType, courseRef, grantedAt, expiresAt] of [
      [master, 'all_kids_courses', null, '2026-11-21T00:00:00Z', null],
      [specific, 'course', parentSlug, '2026-11-20T00:00:00Z', null],
      [adult, 'course', adultSlug, '2026-11-22T00:00:00Z', null],
      [expired, 'course', parentSlug, '2026-11-18T00:00:00Z', '2026-11-19T00:00:00Z'],
      [expired, 'course', adultSlug, '2026-11-22T01:00:00Z', null],
    ] as const) {
      const id = randomUUID()
      await connection.sql`insert into members.entitlements(id,user_id,product_id,product_kind,access_type,course_ref,snapshot,status,source_kind,source_id,idempotency_key,granted_at,expires_at,created_at,updated_at)
      values(${id},${userId},${randomUUID()},'course',${accessType},${courseRef},'{}'::jsonb,'active','manual',${id},${id},${grantedAt}::timestamptz,${expiresAt}::timestamptz,now(),now())`
    }
  }, 60000)
  afterAll(async () => {
    if (!connection) return
    try {
      await connection.sql`delete from members.entitlements where user_id in ${connection.sql(users)}`
      await connection.sql`delete from members.courses where id in ${connection.sql([parentId, adultId])}`
    } finally {
      await connection.close()
    }
  })
  test('página e contagem usam o mesmo filtro, inclusive chave-mestra manual', async () => {
    // Este arquivo usa um banco descartável próprio, com migrações reais.
    const first = await repo.listMembers(
      { learner: 'parents', status: 'active', limit: 1, offset: 0 },
      now,
    )
    const second = await repo.listMembers(
      { learner: 'parents', status: 'active', limit: 1, offset: 1 },
      now,
    )
    expect(first.items.map((item) => item.userId)).toEqual([master])
    expect(second.items.map((item) => item.userId)).toEqual([specific])
    expect(first.total).toBe(2)
    expect(second.total).toBe(first.total)
    const specificPage = await repo.listMembers(
      { learner: 'parents', status: 'active', courseRef: parentSlug, limit: 10, offset: 0 },
      now,
    )
    expect(specificPage.total).toBe(1)
    expect(specificPage.items.map((item) => item.userId)).toEqual([specific])
    // O acesso adulto ativo não torna ativo um acesso para pais que já venceu.
    expect(specificPage.items.some((item) => item.userId === expired)).toBe(false)
  })
})
