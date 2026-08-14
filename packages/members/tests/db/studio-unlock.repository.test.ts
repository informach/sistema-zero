import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import postgres from 'postgres'
import {
  createDbConnection,
  type DbConnection,
} from '../../src/infrastructure/persistence/drizzle/db'
import { DrizzleStudioUnlockRepository } from '../../src/infrastructure/persistence/drizzle/studio-unlock.repository'

/**
 * O snapshot dos blocos conquistados é o que cumpre a regra "bloco liberado NÃO é
 * revogado". O `saveGrants` faz um UPSERT com `excluded.blocks` — SQL cru que o fake
 * in-memory não alcança: lá o método é uma reimplementação em memória, então uma
 * divergência (alvo do ON CONFLICT errado, `excluded` que não resolve, jsonb que volta
 * como string) passaria batida por toda a suíte e só apareceria em produção, na forma
 * mais cara possível: a criança perdendo ferramenta.
 *
 * Aqui roda o SQL de verdade contra Postgres.
 */

const TEST_DB_NAME = 'sistemazero_test'
const FALLBACK_URL = 'postgres://postgres:postgres@localhost:5433/sistemazero'

function withDatabase(url: string, dbName: string): string {
  const parsed = new URL(url)
  parsed.pathname = `/${dbName}`
  return parsed.toString()
}

async function prepareTestDatabase(): Promise<string | null> {
  const override = process.env.TEST_DATABASE_URL
  const baseUrl = override ?? process.env.DATABASE_URL ?? FALLBACK_URL
  const admin = postgres(baseUrl, { max: 1, connect_timeout: 2, onnotice: () => {} })
  try {
    await admin`select 1`
    if (override) return override
    try {
      await admin.unsafe(`CREATE DATABASE ${TEST_DB_NAME}`)
    } catch (error) {
      if ((error as { code?: string }).code !== '42P04') throw error
    }
    return withDatabase(baseUrl, TEST_DB_NAME)
  } catch {
    return null
  } finally {
    await admin.end({ timeout: 1 }).catch(() => {})
  }
}

const testDatabaseUrl = await prepareTestDatabase()
if (!testDatabaseUrl) {
  console.warn('[tests/db] Postgres indisponível (porta 5433?) — teste do snapshot PULADO.')
}

describe.skipIf(!testDatabaseUrl)('DrizzleStudioUnlockRepository (SQL real)', () => {
  let conn: DbConnection
  let repo: DrizzleStudioUnlockRepository
  const userId = randomUUID()
  const courseA = randomUUID()
  const courseB = randomUUID()

  beforeAll(async () => {
    conn = createDbConnection(testDatabaseUrl as string)
    await conn.sql`create schema if not exists members`
    // `audience` é enum no schema real; texto basta — o que se testa é o UPSERT.
    await conn.sql.unsafe(`create table if not exists members.studio_block_grants (
      id uuid primary key,
      user_id uuid not null,
      audience text not null default 'kids',
      course_id uuid not null,
      blocks jsonb not null,
      granted_at timestamptz not null
    )`)
    await conn.sql.unsafe(`create unique index if not exists studio_block_grants_user_course_uq
      on members.studio_block_grants (user_id, audience, course_id)`)
    repo = new DrizzleStudioUnlockRepository(conn.db)
  })

  afterAll(async () => {
    await conn?.close?.()
  })

  beforeEach(async () => {
    await conn.sql.unsafe('truncate table members.studio_block_grants')
  })

  test('grava e lê os blocos de um curso', async () => {
    await repo.saveGrants(userId, 'kids', [{ courseId: courseA, blocks: ['sz_a', 'sz_b'] }])
    expect(await repo.listGrants(userId, 'kids')).toEqual([
      { courseId: courseA, blocks: ['sz_a', 'sz_b'] },
    ])
  })

  test('⭐ o UPSERT amplia a linha existente (não duplica nem estoura o índice)', async () => {
    await repo.saveGrants(userId, 'kids', [{ courseId: courseA, blocks: ['sz_a'] }])
    await repo.saveGrants(userId, 'kids', [{ courseId: courseA, blocks: ['sz_a', 'sz_b'] }])
    const grants = await repo.listGrants(userId, 'kids')
    expect(grants).toHaveLength(1)
    expect(grants[0]?.blocks).toEqual(['sz_a', 'sz_b'])
  })

  test('grava vários cursos numa ida', async () => {
    await repo.saveGrants(userId, 'kids', [
      { courseId: courseA, blocks: ['sz_a'] },
      { courseId: courseB, blocks: ['sz_b'] },
    ])
    const grants = await repo.listGrants(userId, 'kids')
    expect(grants).toHaveLength(2)
    expect(grants.map((g) => g.courseId).sort()).toEqual([courseA, courseB].sort())
  })

  test('lista vazia é no-op (não explode no INSERT sem valores)', async () => {
    await repo.saveGrants(userId, 'kids', [])
    expect(await repo.listGrants(userId, 'kids')).toEqual([])
  })

  test('segrega por aluno e por vitrine', async () => {
    const outro = randomUUID()
    await repo.saveGrants(userId, 'kids', [{ courseId: courseA, blocks: ['sz_a'] }])
    await repo.saveGrants(outro, 'kids', [{ courseId: courseA, blocks: ['sz_x'] }])
    await repo.saveGrants(userId, 'adult', [{ courseId: courseA, blocks: ['sz_y'] }])
    expect(await repo.listGrants(userId, 'kids')).toEqual([{ courseId: courseA, blocks: ['sz_a'] }])
    expect(await repo.listGrants(outro, 'kids')).toEqual([{ courseId: courseA, blocks: ['sz_x'] }])
    expect(await repo.listGrants(userId, 'adult')).toEqual([
      { courseId: courseA, blocks: ['sz_y'] },
    ])
  })

  test('o jsonb volta como ARRAY, não como string', async () => {
    await repo.saveGrants(userId, 'kids', [{ courseId: courseA, blocks: ['sz_a'] }])
    const [grant] = await repo.listGrants(userId, 'kids')
    expect(Array.isArray(grant?.blocks)).toBe(true)
  })
})
