import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { studioUnlockRevision } from '../../src/domain/gamification/studio-unlock-revision'
import {
  createDbConnection,
  type DbConnection,
} from '../../src/infrastructure/persistence/drizzle/db'
import { DrizzleGamificationRepository } from '../../src/infrastructure/persistence/drizzle/gamification.repository'
import { prepareTestDatabase } from './test-database'

/**
 * Prova o predicado SQL que separa ferramenta de carreira: um bônus Kids concluído
 * entra na paleta mesmo sem a linha `course_showcased`. Os testes de serviço usam um
 * fake e, portanto, não alcançam o `leftJoin` real desta consulta.
 */

const testDatabaseUrl = await prepareTestDatabase()
if (!testDatabaseUrl) {
  console.warn('[tests/db] Postgres indisponível (porta 5433?) — elegibilidade PULADA.')
}

describe.skipIf(!testDatabaseUrl)('ferramentas de bônus Kids (SQL real)', () => {
  let conn: DbConnection
  let repo: DrizzleGamificationRepository
  const userId = randomUUID()
  const movedUserId = randomUUID()
  const bonusCourseId = randomUUID()
  const movedCourseId = randomUUID()

  beforeAll(async () => {
    conn = createDbConnection(testDatabaseUrl as string)
    await conn.sql`create schema if not exists members`

    // O banco é compartilhado entre os arquivos de tests/db. A preparação aditiva
    // funciona tanto com as tabelas mínimas de outra suíte quanto com o schema completo.
    await conn.sql.unsafe('create table if not exists members.courses (id uuid primary key)')
    for (const column of [
      'version integer not null default 0',
      "slug text not null default ''",
      "title text not null default ''",
      "status text not null default 'draft'",
      "audience text not null default 'kids'",
      "level text not null default 'iniciante'",
      "track text not null default '2d'",
      'career_slot smallint',
      'sequential_lock boolean not null default true',
      'metadata jsonb',
      'created_at timestamptz not null default now()',
      'updated_at timestamptz not null default now()',
    ]) {
      await conn.sql.unsafe(`alter table members.courses add column if not exists ${column}`)
    }

    await conn.sql.unsafe('create table if not exists members.xp_events (user_id uuid not null)')
    for (const column of [
      'id uuid',
      "audience text not null default 'kids'",
      "source_type text not null default 'course_complete'",
      'source_id uuid',
      'amount integer not null default 0',
      'created_at timestamptz not null default now()',
    ]) {
      await conn.sql.unsafe(`alter table members.xp_events add column if not exists ${column}`)
    }

    repo = new DrizzleGamificationRepository(conn.db)
  })

  afterAll(async () => {
    if (conn) {
      await conn.sql`delete from members.xp_events where user_id in (${userId}, ${movedUserId})`
      await conn.sql`delete from members.courses where id in (${bonusCourseId}, ${movedCourseId})`
      await conn.close()
    }
  })

  test('curso concluído sem course_showcased é elegível quando career_slot é nulo', async () => {
    await conn.sql`
      insert into members.courses
        (id, slug, title, status, audience, level, track, career_slot, metadata)
      values
        (${bonusCourseId}, ${`bonus-${bonusCourseId}`}, 'Bônus', 'published',
         'kids', 'iniciante', '2d', null, ${JSON.stringify({ studioUnlockBlocks: ['sz_bonus'] })}::jsonb)`
    await conn.sql`
      insert into members.xp_events
        (id, user_id, audience, source_type, source_id, amount)
      values
        (${randomUUID()}, ${userId}, 'kids', 'course_complete', ${bonusCourseId}, 0)`

    expect(await repo.listStudioUnlocksByCourse(userId, 'kids')).toEqual([
      { courseId: bonusCourseId, blocks: ['sz_bonus'] },
    ])
  })

  test('despublicar o curso remove a fonte ao vivo e preserva apenas grants congelados', async () => {
    await conn.sql`update members.courses set status = 'archived' where id = ${bonusCourseId}`

    expect(await repo.listStudioUnlocksByCourse(userId, 'kids')).toEqual([])
    expect(await repo.getStudioUnlockRevision(userId, 'kids')).toBe(studioUnlockRevision([]))
  })

  test('curso hoje Adult não satisfaz um course_complete histórico da vitrine Kids', async () => {
    await conn.sql`
      insert into members.courses
        (id, slug, title, status, audience, level, track, career_slot, metadata)
      values
        (${movedCourseId}, ${`adult-${movedCourseId}`}, 'Movido', 'published',
         'adult', 'iniciante', '2d', null, ${JSON.stringify({ studioUnlockBlocks: ['sz_cross_audience'] })}::jsonb)`
    await conn.sql`
      insert into members.xp_events
        (id, user_id, audience, source_type, source_id, amount)
      values
        (${randomUUID()}, ${movedUserId}, 'kids', 'course_complete', ${movedCourseId}, 0)`

    expect(await repo.listStudioUnlocksByCourse(movedUserId, 'kids')).toEqual([])
    expect(await repo.getStudioUnlockRevision(movedUserId, 'kids')).toBe(studioUnlockRevision([]))
  })
})
