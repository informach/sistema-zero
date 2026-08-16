import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import {
  createDbConnection,
  type DbConnection,
} from '../../src/infrastructure/persistence/drizzle/db'
import { DrizzleGamificationRepository } from '../../src/infrastructure/persistence/drizzle/gamification.repository'
import { prepareTestDatabase } from './test-database'

/**
 * Prova o SQL de `listCourseMilestones` contra Postgres real. O fake in-memory
 * reimplementa a consulta em JS, então NENHUM teste de serviço/integração toca
 * este `where` — se ele esquecer o filtro de audiência ou o de perfil, só aqui
 * reprova. Mesma régua do `gating-block-sql`/`studio-unlock-eligibility`.
 */

const testDatabaseUrl = await prepareTestDatabase()
if (!testDatabaseUrl) {
  console.warn('[tests/db] Postgres indisponível (porta 5433?) — marcos de curso PULADOS.')
}

describe.skipIf(!testDatabaseUrl)('marcos de curso por curso (SQL real)', () => {
  let conn: DbConnection
  let repo: DrizzleGamificationRepository
  const userId = randomUUID()
  const irmaoId = randomUUID()
  const soConcluido = randomUUID()
  const concluidoEPublicado = randomUUID()
  const soPublicado = randomUUID()
  const daOutraVitrine = randomUUID()
  const doIrmao = randomUUID()

  async function marcar(
    profileId: string,
    courseId: string,
    sourceType: 'course_complete' | 'course_showcased',
    audience: 'kids' | 'adult' = 'kids',
  ) {
    await conn.sql`
      insert into members.xp_events
        (id, user_id, audience, source_type, source_id, amount)
      values
        (${randomUUID()}, ${profileId}, ${audience}, ${sourceType}, ${courseId}, 0)`
  }

  beforeAll(async () => {
    conn = createDbConnection(testDatabaseUrl as string)
    await conn.sql`create schema if not exists members`

    // O banco é compartilhado entre os arquivos de tests/db — preparação ADITIVA.
    await conn.sql.unsafe('create table if not exists members.xp_events (user_id uuid not null)')
    for (const column of [
      'id uuid',
      "audience text not null default 'kids'",
      "source_type text not null default 'course_complete'",
      'source_id uuid',
      'source_level text',
      'source_track text',
      'source_career_slot smallint',
      'amount integer not null default 0',
      'created_at timestamptz not null default now()',
    ]) {
      await conn.sql.unsafe(`alter table members.xp_events add column if not exists ${column}`)
    }
    await conn.sql.unsafe(`create table if not exists members.courses (
      id uuid primary key, level text, track text, career_slot smallint
    )`)
    for (const column of ['level text', 'track text', 'career_slot smallint']) {
      await conn.sql.unsafe(`alter table members.courses add column if not exists ${column}`)
    }

    repo = new DrizzleGamificationRepository(conn.db)

    await marcar(userId, soConcluido, 'course_complete')
    await marcar(userId, concluidoEPublicado, 'course_complete')
    await marcar(userId, concluidoEPublicado, 'course_showcased')
    await conn.sql`
      update members.xp_events
      set source_level = 'iniciante', source_track = '2d', source_career_slot = 1
      where user_id = ${userId} and source_id = ${concluidoEPublicado}`
    // Estado torto de propósito: publicou sem o marco de conclusão. Não deve
    // virar "concluído" na leitura — o mapa reporta o que o ledger tem.
    await marcar(userId, soPublicado, 'course_showcased')
    await marcar(userId, daOutraVitrine, 'course_complete', 'adult')
    await marcar(userId, daOutraVitrine, 'course_showcased', 'adult')
    // O IRMÃO (outro perfil da mesma conta) concluiu e publicou o seu.
    await marcar(irmaoId, doIrmao, 'course_complete')
    await marcar(irmaoId, doIrmao, 'course_showcased')
  })

  afterAll(async () => {
    if (conn) {
      await conn.sql`delete from members.xp_events where user_id in (${userId}, ${irmaoId})`
      await conn.close()
    }
  })

  test('separa concluído de concluído+publicado', async () => {
    const marcos = await repo.listCourseMilestones(userId, 'kids')

    expect(marcos.get(soConcluido)).toEqual({ completed: true, showcased: false })
    expect(marcos.get(concluidoEPublicado)).toEqual({ completed: true, showcased: true })
    expect(marcos.get(soPublicado)).toEqual({ completed: false, showcased: true })
  })

  test('lê qualificação e marcos no mesmo snapshot SQL', async () => {
    const estado = await repo.listCareerCourseState(userId, 'kids')

    expect(estado.qualified['iniciante-2d']).toEqual([1])
    expect(estado.milestones.get(soConcluido)).toEqual({ completed: true, showcased: false })
    expect(estado.milestones.get(concluidoEPublicado)).toEqual({
      completed: true,
      showcased: true,
    })
  })

  test('curso sem marco algum simplesmente não aparece no mapa', async () => {
    const marcos = await repo.listCourseMilestones(userId, 'kids')

    expect(marcos.has(randomUUID())).toBe(false)
  })

  test('marco da OUTRA vitrine não vaza para a kids (nem o contrário)', async () => {
    expect((await repo.listCourseMilestones(userId, 'kids')).has(daOutraVitrine)).toBe(false)
    // E a leitura adulta enxerga só o dele — o kids fica de fora inteiro.
    const adulto = await repo.listCourseMilestones(userId, 'adult')
    expect([...adulto.keys()]).toEqual([daOutraVitrine])
  })

  test('o marco é do PERFIL: o irmão da mesma conta não herda', async () => {
    const meu = await repo.listCourseMilestones(userId, 'kids')
    const dele = await repo.listCourseMilestones(irmaoId, 'kids')

    expect(meu.has(doIrmao)).toBe(false)
    expect(dele.get(doIrmao)).toEqual({ completed: true, showcased: true })
    expect(dele.has(concluidoEPublicado)).toBe(false)
  })
})
