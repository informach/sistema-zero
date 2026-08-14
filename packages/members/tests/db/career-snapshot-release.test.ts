import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import postgres from 'postgres'
import { computeStudentLevel } from '../../src/domain/gamification/levels'
import {
  createDbConnection,
  type DbConnection,
} from '../../src/infrastructure/persistence/drizzle/db'
import { finalizeFirstStepsRollout } from '../../src/infrastructure/persistence/drizzle/finalize-first-steps-rollout'
import { DrizzleGamificationRepository } from '../../src/infrastructure/persistence/drizzle/gamification.repository'

/**
 * O `coalesce` que decide de QUAL degrau um marco de carreira conta — e que a migration
 * `0063` usa para não rebaixar ninguém.
 *
 * Os marcos guardam um RETRATO congelado (`source_level`/`source_track`/`source_career_slot`)
 * para o posto do aluno nunca regredir quando um curso é re-nivelado. Ao criar o degrau de
 * ENTRADA (14/08), esse mesmo mecanismo trabalharia CONTRA nós: o curso-base passa a ser
 * `primeiros-passos`, mas quem já o concluiu carrega `iniciante-2d` slot 1 congelado — e a
 * régua nova do Construtor(a) exige `primeiros-passos-2d`. A criança cairia para Faísca.
 *
 * A migration solta o retrato (os três campos viram NULL) para o marco voltar a seguir a
 * etiqueta ATUAL do curso. É o mesmo remédio deliberado da `0044`, e o SQL que o cumpre é o
 * `coalesce` de `listQualifyingCareerSlots` — que o fake in-memory reimplementa e, portanto,
 * não prova. Aqui ele roda contra Postgres.
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
  console.warn('[tests/db] Postgres indisponível (porta 5433?) — teste do retrato PULADO.')
}

describe.skipIf(!testDatabaseUrl)('retrato do marco × etiqueta viva do curso (SQL real)', () => {
  let conn: DbConnection
  let repo: DrizzleGamificationRepository
  const userId = randomUUID()
  const courseId = randomUUID()

  beforeAll(async () => {
    conn = createDbConnection(testDatabaseUrl as string)
    await conn.sql`create schema if not exists members`
    // ⚠️ O banco de teste é COMPARTILHADO entre os arquivos de `tests/db`, e cada um cria só
    // as colunas de que precisa. Por isso a preparação é ADITIVA (`add column if not exists`)
    // em vez de um `create table` que o `if not exists` engoliria em silêncio, deixando a
    // tabela mínima de outro teste e derrubando este com "column does not exist".
    // Enums e colunas como texto: o que se prova é o `coalesce`, não os tipos.
    await conn.sql.unsafe('create table if not exists members.courses (id uuid primary key)')
    for (const column of [
      "slug text not null default ''",
      "audience text not null default 'kids'",
      "level text not null default 'iniciante'",
      "track text not null default '2d'",
      'career_slot smallint',
      'version integer not null default 0',
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
      'source_level text',
      'source_track text',
      'source_career_slot smallint',
      'created_at timestamptz not null default now()',
    ]) {
      await conn.sql.unsafe(`alter table members.xp_events add column if not exists ${column}`)
    }
    repo = new DrizzleGamificationRepository(conn.db)
  })

  afterAll(async () => {
    await conn?.close?.()
  })

  /** O estado de PRODUÇÃO na véspera: curso-base no Iniciante 2D, marcos congelados nele. */
  beforeEach(async () => {
    await conn.sql.unsafe('truncate table members.courses, members.xp_events')
    await conn.sql`
      insert into members.courses (id, slug, audience, level, track, career_slot)
      values (${courseId}, 'curso-base', 'kids', 'iniciante', '2d', 1)`
    for (const sourceType of ['course_complete', 'course_showcased']) {
      await conn.sql`
        insert into members.xp_events
          (id, user_id, audience, source_type, source_id, amount,
           source_level, source_track, source_career_slot)
        values (${randomUUID()}, ${userId}, 'kids', ${sourceType}, ${courseId}, 0,
                'iniciante', '2d', 1)`
    }
  })

  test('🚨 o defeito, reproduzido: só re-etiquetar o curso DERRUBA o posto', async () => {
    // A autora move o curso para o degrau de entrada, como o rollout pede…
    await conn.sql`update members.courses set level = 'primeiros-passos' where id = ${courseId}`

    // …mas o retrato congelado ainda diz `iniciante-2d`, e a régua nova exige a entrada.
    const qualified = await repo.listQualifyingCareerSlots(userId, 'kids')
    expect(qualified['iniciante-2d']).toEqual([1])
    expect(qualified['primeiros-passos-2d']).toEqual([])
    expect(computeStudentLevel(qualified).slug).toBe('noob')
  })

  test('✅ o finalizador re-etiqueta e RECONGELA o retrato antes de devolver o posto', async () => {
    await conn.sql`
      update members.xp_events
         set source_level = null, source_track = null, source_career_slot = null
       where source_type in ('course_complete', 'course_showcased')
         and source_level = 'iniciante' and source_track = '2d' and source_career_slot = 1`

    const result = await finalizeFirstStepsRollout(conn.sql, 'curso-base')
    expect(result).toEqual({ courseId, updatedEvents: 2, affectedProfiles: 1 })

    const snapshots = await conn.sql`
      select source_type, source_level, source_track, source_career_slot
        from members.xp_events
       where source_id = ${courseId}
       order by source_type`
    expect(
      snapshots.map((row) => ({
        source_type: String(row.source_type),
        source_level: String(row.source_level),
        source_track: String(row.source_track),
        source_career_slot: Number(row.source_career_slot),
      })),
    ).toEqual([
      {
        source_type: 'course_complete',
        source_level: 'primeiros-passos',
        source_track: '2d',
        source_career_slot: 1,
      },
      {
        source_type: 'course_showcased',
        source_level: 'primeiros-passos',
        source_track: '2d',
        source_career_slot: 1,
      },
    ])

    const [beforeRepeat] = await conn.sql`
      select version from members.courses where id = ${courseId}`
    expect(await finalizeFirstStepsRollout(conn.sql, 'curso-base')).toEqual({
      courseId,
      updatedEvents: 0,
      affectedProfiles: 0,
    })
    const [afterRepeat] = await conn.sql`
      select version from members.courses where id = ${courseId}`
    expect(afterRepeat?.version).toBe(beforeRepeat?.version)

    const qualified = await repo.listQualifyingCareerSlots(userId, 'kids')
    expect(qualified['primeiros-passos-2d']).toEqual([1])
    expect(qualified['iniciante-2d']).toEqual([])
    expect(computeStudentLevel(qualified).slug).toBe('coder')

    // A garantia importante: depois do rollout o marco volta a ser independente do curso vivo.
    await conn.sql`delete from members.courses where id = ${courseId}`
    const afterDelete = await repo.listQualifyingCareerSlots(userId, 'kids')
    expect(afterDelete['primeiros-passos-2d']).toEqual([1])
    expect(computeStudentLevel(afterDelete).slug).toBe('coder')
  })

  test('o finalizador aborta inteiro diante de snapshot parcial inesperado', async () => {
    await conn.sql`
      update members.xp_events
         set source_level = 'avancado', source_track = null
       where source_id = ${courseId} and source_type = 'course_complete'`

    let message = ''
    try {
      await finalizeFirstStepsRollout(conn.sql, 'curso-base')
    } catch (error) {
      message = error instanceof Error ? error.message : String(error)
    }
    expect(message).toContain('snapshot inesperado')

    const [course] = await conn.sql`
      select level, track, career_slot
        from members.courses
       where id = ${courseId}`
    expect(course).toEqual({ level: 'iniciante', track: '2d', career_slot: 1 })
  })

  test('⚠️ a JANELA do rollout é real: entre a migration e a re-etiquetagem, o posto CAI', async () => {
    // A ordem real do deploy: a migration roda no preDeploy e a autora só re-etiqueta o
    // curso no admin depois. Nessa janela o marco segue o curso AO VIVO, que ainda é
    // `iniciante-2d`, e a criança aparece como Faísca.
    //
    // ⚠️ NÃO dá para fechar essa janela dentro da migration: o Postgres proíbe ESCREVER um
    // valor de enum adicionado na mesma transação (medido: literal, cast explícito e
    // subquery do `pg_enum` são os três recusados; só a COMPARAÇÃO `::text` passa), e o
    // drizzle roda todas as migrações pendentes numa transação só. Por isso re-etiquetar é
    // passo OBRIGATÓRIO logo após o deploy. A janela é cosmética e se cura sozinha: nenhum
    // marco, XP ou ferramenta é perdido — só a leitura do posto muda enquanto ela dura.
    await conn.sql`
      update members.xp_events
         set source_level = null, source_track = null, source_career_slot = null
       where source_type in ('course_complete', 'course_showcased')`

    const antes = await repo.listQualifyingCareerSlots(userId, 'kids')
    expect(computeStudentLevel(antes).slug).toBe('noob')

    await conn.sql`update members.courses set level = 'primeiros-passos' where id = ${courseId}`
    const depois = await repo.listQualifyingCareerSlots(userId, 'kids')
    expect(computeStudentLevel(depois).slug).toBe('coder')
  })

  test('marco COM retrato de outro degrau segue congelado (o remédio é cirúrgico)', async () => {
    // Um curso 3D re-nivelado depois de qualificado continua contando onde estava: o UPDATE
    // da migration mira SÓ `(iniciante, 2d, slot 1)`, que era o curso de entrada.
    const outro = randomUUID()
    await conn.sql`
      insert into members.courses (id, slug, audience, level, track, career_slot)
      values (${outro}, 'curso-3d', 'kids', 'avancado', '3d', 2)`
    for (const sourceType of ['course_complete', 'course_showcased']) {
      await conn.sql`
        insert into members.xp_events
          (id, user_id, audience, source_type, source_id, amount,
           source_level, source_track, source_career_slot)
        values (${randomUUID()}, ${userId}, 'kids', ${sourceType}, ${outro}, 0,
                'iniciante', '3d', 2)`
    }
    await conn.sql`
      update members.xp_events
         set source_level = null, source_track = null, source_career_slot = null
       where source_type in ('course_complete', 'course_showcased')
         and source_level = 'iniciante' and source_track = '2d' and source_career_slot = 1`

    const qualified = await repo.listQualifyingCareerSlots(userId, 'kids')
    expect(qualified['iniciante-3d']).toEqual([2])
    expect(qualified['avancado-3d']).toEqual([])
  })
})
