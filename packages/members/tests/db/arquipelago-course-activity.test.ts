import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { ArquipelagoCourseActivityService } from '../../src/application/arquipelago/arquipelago-course-activity.service'
import { ArquipelagoCourseActivityRepository } from '../../src/infrastructure/persistence/drizzle/arquipelago-course-activity.repository'
import {
  createDbConnection,
  type DbConnection,
} from '../../src/infrastructure/persistence/drizzle/db'
import { prepareTestDatabase } from './test-database'

/**
 * Prova a consulta da "volta ao curso" (29/10/2026) contra Postgres real: só as pessoas pedidas,
 * só a janela, em ordem, e o teto por pessoa. O teste da rota usa um serviço de mentira.
 */

const testDatabaseUrl = await prepareTestDatabase()
if (!testDatabaseUrl) {
  console.warn('[tests/db] Postgres indisponível (porta 5433?): aulas concluídas PULADAS.')
}

describe.skipIf(!testDatabaseUrl)('aulas concluídas para o Arquipélago (SQL real)', () => {
  let conn: DbConnection
  const lia = randomUUID()
  const tom = randomUUID()
  const outra = randomUUID()
  const curso = randomUUID()

  async function concluir(userId: string, quando: string) {
    await conn.sql`
      insert into members.lesson_completions (id, user_id, lesson_id, course_id, completed_at)
      values (${randomUUID()}, ${userId}, ${randomUUID()}, ${curso}, ${quando}::timestamptz)`
  }

  beforeAll(async () => {
    conn = createDbConnection(testDatabaseUrl as string)
    await conn.sql`create schema if not exists members`
    // O banco é compartilhado entre os arquivos de tests/db: preparação ADITIVA.
    await conn.sql.unsafe(`create table if not exists members.lesson_completions (
      id uuid primary key, user_id uuid not null, lesson_id uuid not null,
      course_id uuid not null, completed_at timestamptz not null)`)
    await concluir(lia, '2026-10-26T15:00:00Z')
    await concluir(lia, '2026-10-24T09:00:00Z')
    await concluir(lia, '2026-10-10T09:00:00Z') // antes da janela
    await concluir(outra, '2026-10-26T16:00:00Z') // não foi pedida
  })

  afterAll(async () => {
    if (!conn) return
    await conn.sql`delete from members.lesson_completions where user_id = any(${[lia, tom, outra]}::uuid[])`
    await conn.close()
  })

  test('só as pessoas pedidas, só a janela, da mais antiga para a mais nova', async () => {
    const servico = new ArquipelagoCourseActivityService(
      new ArquipelagoCourseActivityRepository(conn.db),
    )
    const r = await servico.concluidas({
      usuarios: [lia, tom],
      de: new Date('2026-10-22T03:00:00Z'),
      ate: new Date('2026-10-29T03:00:00Z'),
    })
    expect(r).toEqual({
      usuarios: [
        { userId: lia, concluidasEm: ['2026-10-24T09:00:00.000Z', '2026-10-26T15:00:00.000Z'] },
        { userId: tom, concluidasEm: [] },
      ],
    })
  })

  test('o teto vale na consulta (LIMIT)', async () => {
    const repo = new ArquipelagoCourseActivityRepository(conn.db)
    const linhas = await repo.completedBetween(
      [lia],
      new Date('2026-10-01T00:00:00Z'),
      new Date('2026-10-30T00:00:00Z'),
      2,
    )
    expect(linhas.map((l) => l.completedAt.toISOString())).toEqual([
      '2026-10-10T09:00:00.000Z',
      '2026-10-24T09:00:00.000Z',
    ])
  })
})
