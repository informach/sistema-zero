import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import postgres from 'postgres'
import { isCompletionGatingBlock } from '../../src/domain/course/lesson-block'
import { DrizzleContentAdminRepository } from '../../src/infrastructure/persistence/drizzle/content-admin.repository'
import {
  createDbConnection,
  type DbConnection,
} from '../../src/infrastructure/persistence/drizzle/db'

/**
 * `lessonHasGatingBlock` é o espelho SQL de `isCompletionGatingBlock` (domínio), e é o
 * que impede misturar bloco travante com certificado — a regra que existe porque a
 * emissão do certificado CONCLUI a aula direto, pulando os gates.
 *
 * Os testes de integração não alcançam este SQL: o fake in-memory implementa o método
 * chamando a função do DOMÍNIO, então os dois não podem divergir lá por construção. É
 * exatamente por isso que uma divergência do SQL passaria batida. Aqui roda o SQL de
 * verdade, contra Postgres, e compara com o domínio caso a caso.
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
  console.warn('[tests/db] Postgres indisponível (porta 5433?) — teste do espelho SQL PULADO.')
}

describe.skipIf(!testDatabaseUrl)('lessonHasGatingBlock: espelho SQL × domínio', () => {
  let conn: DbConnection
  let repo: DrizzleContentAdminRepository
  const lessonId = randomUUID()

  beforeAll(async () => {
    conn = createDbConnection(testDatabaseUrl as string)
    await conn.sql`create schema if not exists members`
    // O `kind` é enum no schema real; aqui basta texto — o que se testa é o predicado.
    await conn.sql.unsafe(`create table if not exists members.lesson_blocks (
      id uuid primary key,
      lesson_id uuid not null,
      kind text not null,
      sort_order integer not null default 0,
      content jsonb not null
    )`)
    repo = new DrizzleContentAdminRepository(conn.db)
  })

  afterAll(async () => {
    await conn?.close?.()
  })

  beforeEach(async () => {
    await conn.sql.unsafe('truncate table members.lesson_blocks')
  })

  const insert = async (kind: string, content: unknown) => {
    const id = randomUUID()
    await conn.sql.unsafe(
      'insert into members.lesson_blocks (id, lesson_id, kind, content) values ($1, $2, $3, $4)',
      [id, lessonId, kind, JSON.stringify(content)],
    )
    return id
  }

  // Cada caso roda nos DOIS lados. Se alguém mexer só num, o teste acusa.
  const casos = [
    {
      nome: 'estúdio SEMPRE trava',
      kind: 'studio',
      content: { kind: 'studio', initialProject: {} },
    },
    {
      nome: 'Pinta SEMPRE trava (a entrega do desenho é gate, como a do Estúdio)',
      kind: 'pinta',
      content: { kind: 'pinta', initialAsset: { id: 'a', name: 'n', kind: 'pixel-sprite' } },
    },
    { nome: '"em breve" SEMPRE trava', kind: 'coming_soon', content: { kind: 'coming_soon' } },
    {
      nome: 'quiz COM nota de corte trava',
      kind: 'quiz',
      content: { kind: 'quiz', questions: [], passingScore: 70 },
    },
    {
      nome: 'quiz SEM nota de corte (fixação) não trava',
      kind: 'quiz',
      content: { kind: 'quiz', questions: [] },
    },
    { nome: 'texto não trava', kind: 'rich_text', content: { kind: 'rich_text', markdown: 'oi' } },
    {
      nome: 'vídeo não trava',
      kind: 'video',
      content: { kind: 'video', provider: 'vimeo', src: 'x' },
    },
  ] as const

  for (const caso of casos) {
    test(caso.nome, async () => {
      await insert(caso.kind, caso.content)
      const esperado = isCompletionGatingBlock(caso.content as never)
      expect(await repo.lessonHasGatingBlock(lessonId)).toBe(esperado)
    })
  }

  test('aula sem blocos não trava', async () => {
    expect(await repo.lessonHasGatingBlock(lessonId)).toBe(false)
  })

  test('excludeBlockId ignora o próprio bloco (o caso do PATCH que vira certificado)', async () => {
    const id = await insert('coming_soon', { kind: 'coming_soon' })
    expect(await repo.lessonHasGatingBlock(lessonId)).toBe(true)
    expect(await repo.lessonHasGatingBlock(lessonId, { excludeBlockId: id })).toBe(false)
  })

  test('só olha a PRÓPRIA aula', async () => {
    await insert('coming_soon', { kind: 'coming_soon' })
    expect(await repo.lessonHasGatingBlock(randomUUID())).toBe(false)
  })
})
