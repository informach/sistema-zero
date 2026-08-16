import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { ConsumeAiUsageService } from '../../src/application/ai-usage/consume-ai-usage.service'
import { DrizzleAiUsageRepository } from '../../src/infrastructure/persistence/drizzle/ai-usage.repository'
import {
  createDbConnection,
  type DbConnection,
} from '../../src/infrastructure/persistence/drizzle/db'
import { prepareTestDatabase } from './test-database'

/**
 * A ÚNICA invariante da quota de IA que o fake em memória não prova: sob
 * CONCORRÊNCIA real, o advisory lock por conta serializa o read-then-upsert e o
 * teto NUNCA é furado (N consumos simultâneos no limite → exatamente 1 passa).
 *
 * Usa o Postgres de dev (Docker :5433) num banco DEDICADO `sistemazero_test`
 * (molde de `payments/tests/db/outbox-atomicity.test.ts`). Sem Postgres
 * alcançável, a suíte é PULADA. Override: `TEST_DATABASE_URL`.
 */
const testDatabaseUrl = await prepareTestDatabase()
if (!testDatabaseUrl) {
  console.warn(
    '[tests/db] Postgres indisponível (porta 5433?) — teste de atomicidade da quota de IA PULADO.',
  )
}

describe.skipIf(!testDatabaseUrl)('Quota de IA — atomicidade no Postgres real', () => {
  let conn: DbConnection

  beforeAll(async () => {
    conn = createDbConnection(testDatabaseUrl as string, { max: 12 })
    // ⚠️ NÃO roda o `migrate` do zero aqui: as migrations 0029/0030 do members têm
    // o 55P04 LATENTE documentado (enum novo usado no MESMO lote → falha num banco
    // ZERADO; staging/prod aplicaram em deploys separados). Este teste só precisa
    // da `ai_usage_daily` — aplica o DDL espelho da migration 0041 direto.
    await conn.sql`create schema if not exists members`
    await conn.sql`
      create table if not exists members.ai_usage_daily (
        account_id uuid not null,
        day date not null,
        feature varchar(40) not null,
        used integer default 0 not null,
        privileged boolean default false not null,
        updated_at timestamp with time zone default now() not null,
        constraint ai_usage_daily_pk primary key (account_id, day, feature)
      )
    `
  })

  afterAll(async () => {
    await conn?.close()
  })

  beforeEach(async () => {
    await conn.sql`truncate table members.ai_usage_daily`
  })

  test('N consumos CONCORRENTES no limite → exatamente o teto passa, nunca além', async () => {
    const service = new ConsumeAiUsageService({
      aiUsage: new DrizzleAiUsageRepository(conn.db),
      dailyLimit: 3,
      monthlyLimit: 100,
      clock: () => new Date('2026-07-10T12:00:00.000Z'),
    })
    const account = randomUUID()

    // 10 consumos simultâneos disputando um teto de 3.
    const results = await Promise.all(
      Array.from({ length: 10 }, () => service.execute(account, 'pensa-chat', false)),
    )
    const allowed = results.filter((r) => r.allowed)
    expect(allowed.length).toBe(3)

    const [row] = await conn.sql`
      select used from members.ai_usage_daily where account_id = ${account}
    `
    expect(row?.used).toBe(3)
  })

  test('teto MENSAL também segura sob concorrência (dias diferentes)', async () => {
    const account = randomUUID()
    const mk = (iso: string) =>
      new ConsumeAiUsageService({
        aiUsage: new DrizzleAiUsageRepository(conn.db),
        dailyLimit: 100,
        monthlyLimit: 4,
        clock: () => new Date(iso),
      })
    // 3 usos no dia 1 (sequenciais) + 6 concorrentes no dia 2 → só 1 passa.
    const day1 = mk('2026-07-01T12:00:00.000Z')
    for (let i = 0; i < 3; i++) await day1.execute(account, 'pensa-chat', false)

    const day2 = mk('2026-07-02T12:00:00.000Z')
    const results = await Promise.all(
      Array.from({ length: 6 }, () => day2.execute(account, 'studio-describe', false)),
    )
    expect(results.filter((r) => r.allowed).length).toBe(1)
    expect(results.filter((r) => r.scope === 'month').length).toBe(5)
  })
})
