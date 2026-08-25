import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import {
  createDbConnection,
  type DbConnection,
} from '../../src/infrastructure/persistence/drizzle/db'
import { DrizzleToolUsageRepository } from '../../src/infrastructure/persistence/drizzle/tool-usage.repository'
import { prepareTestDatabase } from './test-database'

/**
 * As agregações de USO com filtro SEMÂNTICO — o kind da entrega vem do BLOCO
 * (INNER JOIN em `lesson_blocks`) e a criação viva-e-confirmada segue o predicado
 * do índice `creations_usage_idx` (`deleted_at is null AND storage_ref is not
 * null`). O fake in-memory reimplementa os dois em JS, então nenhum teste de
 * integração alcança este SQL — a régua do `gating-block-sql`.
 */

const testDatabaseUrl = await prepareTestDatabase()
if (!testDatabaseUrl) {
  console.warn('[tests/db] Postgres indisponível (porta 5433?) — teste do tool-usage PULADO.')
}

describe.skipIf(!testDatabaseUrl)('DrizzleToolUsageRepository: joins e predicados reais', () => {
  let conn: DbConnection
  let repo: DrizzleToolUsageRepository

  beforeAll(async () => {
    conn = createDbConnection(testDatabaseUrl as string)
    await conn.sql`create schema if not exists members`
    // ⚠️ Banco COMPARTILHADO entre os arquivos: `create if not exists` é "quem
    // chega primeiro vence" — toda coluna usada entra também num `alter add`.
    await conn.sql.unsafe(`create table if not exists members.lesson_blocks (
      id uuid primary key,
      lesson_id uuid not null,
      kind text not null,
      sort_order integer not null default 0,
      content jsonb not null
    )`)
    await conn.sql.unsafe(`create table if not exists members.studio_submissions (
      user_id uuid not null,
      account_id uuid,
      id uuid,
      block_id uuid,
      lesson_id uuid,
      course_id uuid,
      project jsonb,
      submitted_at timestamptz,
      score integer,
      results jsonb,
      checked_at timestamptz,
      passed_at timestamptz,
      message varchar(1000)
    )`)
    for (const col of ['id uuid', 'block_id uuid', 'submitted_at timestamptz']) {
      await conn.sql.unsafe(
        `alter table members.studio_submissions add column if not exists ${col}`,
      )
    }
    await conn.sql.unsafe(`create table if not exists members.creations (
      id uuid primary key,
      user_id uuid not null,
      account_id uuid not null,
      tool text not null,
      item_id varchar(64) not null,
      name varchar(120) not null,
      kind varchar(40) not null,
      item_updated_at timestamptz not null,
      revision integer not null default 0,
      last_reserved_revision integer not null default 0,
      bytes bigint not null default 0,
      storage_ref text,
      thumb text,
      parts jsonb not null default '[]',
      synced_at timestamptz not null default now(),
      deleted_at timestamptz,
      created_at timestamptz not null default now()
    )`)
    for (const col of [
      'tool text',
      'item_updated_at timestamptz',
      'storage_ref text',
      'deleted_at timestamptz',
    ]) {
      await conn.sql.unsafe(`alter table members.creations add column if not exists ${col}`)
    }
    repo = new DrizzleToolUsageRepository(conn.db)
  })

  afterAll(async () => {
    await conn?.close?.()
  })

  const USER = randomUUID()
  const OTHER = randomUUID()

  beforeEach(async () => {
    // `cascade`: outro arquivo pode ter criado FKs apontando p/ estas tabelas.
    await conn.sql.unsafe('truncate table members.studio_submissions cascade')
    await conn.sql.unsafe('truncate table members.lesson_blocks cascade')
    await conn.sql.unsafe('truncate table members.creations cascade')
  })

  const insertBlock = async (kind: string) => {
    const id = randomUUID()
    await conn.sql.unsafe(
      'insert into members.lesson_blocks (id, lesson_id, kind, content) values ($1, $2, $3, $4)',
      [id, randomUUID(), kind, JSON.stringify({ kind })],
    )
    return id
  }

  const insertSubmission = async (userId: string, blockId: string, at: string) => {
    await conn.sql.unsafe(
      'insert into members.studio_submissions (id, user_id, block_id, submitted_at, project) values ($1, $2, $3, $4, $5)',
      [randomUUID(), userId, blockId, at, JSON.stringify({})],
    )
  }

  const insertCreation = async (over: {
    userId: string
    tool: string
    itemUpdatedAt: string
    storageRef?: string | null
    deletedAt?: string | null
  }) => {
    // ⚠️ A tabela REAL (migrations) pode já existir no banco compartilhado, com
    // `created_at`/`synced_at` NOT NULL SEM default — supre os dois explícitos.
    await conn.sql.unsafe(
      `insert into members.creations
        (id, user_id, account_id, tool, item_id, name, kind, item_updated_at, storage_ref,
         deleted_at, created_at, synced_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        randomUUID(),
        over.userId,
        randomUUID(),
        over.tool,
        randomUUID().slice(0, 12),
        'Criação',
        'classic',
        over.itemUpdatedAt,
        over.storageRef === undefined ? 'r2ugc:x' : over.storageRef,
        over.deletedAt ?? null,
        '2026-06-01T00:00:00.000Z',
        '2026-06-01T00:00:01.000Z',
      ],
    )
  }

  test('entregas: o kind vem do BLOCO (inner join); bloco sumido não conta; max é Date', async () => {
    const pintaBlock = await insertBlock('pinta')
    const studioBlock = await insertBlock('studio')
    await insertSubmission(USER, pintaBlock, '2026-06-01T10:00:00.000Z')
    await insertSubmission(USER, studioBlock, '2026-06-02T10:00:00.000Z')
    // Entrega órfã (bloco apagado): o inner join a exclui — como no fake.
    await insertSubmission(USER, randomUUID(), '2026-06-03T10:00:00.000Z')
    await insertSubmission(OTHER, pintaBlock, '2026-06-04T10:00:00.000Z')

    const pinta = await repo.submissionsUsageByUsers([USER], 'pinta')
    const studio = await repo.submissionsUsageByUsers([USER], 'studio')
    expect(pinta.get(USER)?.count).toBe(1)
    expect(studio.get(USER)?.count).toBe(1)
    const at = pinta.get(USER)?.lastActivityAt
    expect(at instanceof Date).toBe(true)
    expect(at?.toISOString()).toBe('2026-06-01T10:00:00.000Z')
    expect(pinta.has(OTHER)).toBe(false)
  })

  test('criações: só vivas E confirmadas (o predicado do creations_usage_idx)', async () => {
    await insertCreation({ userId: USER, tool: 'pinta', itemUpdatedAt: '2026-06-01T09:00:00.000Z' })
    await insertCreation({ userId: USER, tool: 'pinta', itemUpdatedAt: '2026-06-05T09:00:00.000Z' })
    // Lixeira lógica e reserva-nunca-confirmada ficam de fora.
    await insertCreation({
      userId: USER,
      tool: 'pinta',
      itemUpdatedAt: '2026-06-06T09:00:00.000Z',
      deletedAt: '2026-06-07T09:00:00.000Z',
    })
    await insertCreation({
      userId: USER,
      tool: 'pinta',
      itemUpdatedAt: '2026-06-08T09:00:00.000Z',
      storageRef: null,
    })
    // Ferramenta irmã não vaza.
    await insertCreation({
      userId: USER,
      tool: 'studio',
      itemUpdatedAt: '2026-06-09T09:00:00.000Z',
    })

    const pinta = await repo.creationsUsageByUsers([USER], 'pinta')
    expect(pinta.get(USER)?.count).toBe(2)
    expect(pinta.get(USER)?.lastActivityAt?.toISOString()).toBe('2026-06-05T09:00:00.000Z')
    const studio = await repo.creationsUsageByUsers([USER], 'studio')
    expect(studio.get(USER)?.count).toBe(1)
  })
})
