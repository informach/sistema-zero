import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import path from 'node:path'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'
import { SkipReason } from '../../src/domain/invoice/invoice.status'
import type { ScheduleInvoiceInput } from '../../src/domain/ports/invoice-repository.port'
import {
  createDbConnection,
  type DbConnection,
} from '../../src/infrastructure/persistence/drizzle/db'
import { DrizzleInvoiceRepository } from '../../src/infrastructure/persistence/drizzle/invoice.repository'

/**
 * Invariantes que SÓ o Postgres real prova — os fakes em memória são
 * single-thread e não têm a unique parcial atômica nem o contador transacional:
 *  1. `schedule()` é idempotente sob corrida (unique parcial + recovery do 23505).
 *  2. A unique de SUBSTITUTA ativa barra 2 substitutas concorrentes p/ uma original.
 *  3. `allocateDpsNumber` concorrente devolve números ÚNICOS e contíguos.
 *  4. `markEmitted` devolve `false` quando o status mudou entre o claim e a gravação.
 *
 * Sem Postgres alcançável (porta 5433) a suíte é PULADA — `bun test` segue verde.
 * Override: `TEST_DATABASE_URL`. Espelha tests/db do payments.
 */
const TEST_DB_NAME = 'sistemazero_test'
const FALLBACK_URL = 'postgres://postgres:postgres@localhost:5433/sistemazero'

function withDatabase(url: string, dbName: string): string {
  const u = new URL(url)
  u.pathname = `/${dbName}`
  return u.toString()
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
      if ((error as { code?: string }).code !== '42P04') throw error // já existe
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
  console.warn('[tests/db] Postgres indisponível — testes de concorrência do fiscal PULADOS.')
}

function scheduleInput(overrides: Partial<ScheduleInvoiceInput> = {}): ScheduleInvoiceInput {
  return {
    paymentId: crypto.randomUUID(),
    customer: { name: 'Maria', email: 'm@m.com', document: '52998224725' },
    amountInCents: 3700n,
    serviceDescription: 'No Comando da IA',
    offerId: null,
    guaranteeDays: 7,
    paidAt: new Date('2026-06-01T12:00:00Z'),
    scheduledFor: new Date(),
    ambiente: 'producao-restrita',
    ...overrides,
  }
}

describe.skipIf(!testDatabaseUrl)(
  'DrizzleInvoiceRepository — concorrência no Postgres real',
  () => {
    let conn: DbConnection
    let repo: DrizzleInvoiceRepository

    beforeAll(async () => {
      conn = createDbConnection(testDatabaseUrl as string, { max: 8 })
      // Slate limpo: o sistemazero_test é compartilhado/reusado entre execuções.
      // Recria o schema fiscal + o journal próprio do zero (migration 0000 faz
      // CREATE SCHEMA sem IF NOT EXISTS — re-rodar sobre estado antigo falharia).
      await conn.sql.unsafe('DROP SCHEMA IF EXISTS fiscal CASCADE')
      await conn.sql.unsafe('DROP TABLE IF EXISTS drizzle.fiscal_migrations')
      await migrate(conn.db, {
        // Journal PRÓPRIO do fiscal (drizzle.config.ts): o `sistemazero_test` é
        // compartilhado com o payments — um journal comum faria o migrator PULAR as
        // migrations do fiscal por dedupe de created_at (ver CLAUDE.md do payments).
        migrationsTable: 'fiscal_migrations',
        migrationsFolder: path.join(
          import.meta.dir,
          '..',
          '..',
          'src',
          'infrastructure',
          'persistence',
          'drizzle',
          'migrations',
        ),
      })
      repo = new DrizzleInvoiceRepository(conn.db)
    })

    afterAll(async () => {
      await conn?.close()
    })

    beforeEach(async () => {
      await conn.sql`TRUNCATE fiscal.invoices, fiscal.invoice_events, fiscal.invoice_pdfs, fiscal.dps_counters RESTART IDENTITY CASCADE`
    })

    test('schedule concorrente do MESMO pagamento → 1 só nota (unique parcial + recovery 23505)', async () => {
      const paymentId = crypto.randomUUID()
      const [a, b] = await Promise.all([
        repo.schedule(scheduleInput({ paymentId })),
        repo.schedule(scheduleInput({ paymentId })),
      ])
      expect(a.id).toBe(b.id) // ambas devolvem a MESMA nota
      const rows = await conn.sql<{ n: number }[]>`
      SELECT count(*)::int AS n FROM fiscal.invoices WHERE payment_id = ${paymentId}`
      expect(rows[0]?.n).toBe(1)
    })

    test('substituta: 2 concorrentes p/ a MESMA original → 1 só (invoices_substitute_active_uq)', async () => {
      const originalId = crypto.randomUUID()
      const [a, b] = await Promise.all([
        repo.schedule(scheduleInput({ substitutesId: originalId })),
        repo.schedule(scheduleInput({ substitutesId: originalId })),
      ])
      expect(a.id).toBe(b.id)
      const rows = await conn.sql<{ n: number }[]>`
      SELECT count(*)::int AS n FROM fiscal.invoices WHERE substitutes_id = ${originalId}`
      expect(rows[0]?.n).toBe(1)
    })

    test('allocateDpsNumber concorrente → números ÚNICOS e contíguos (1..N), sem buracos nem repetição', async () => {
      const invoices = await Promise.all(
        Array.from({ length: 8 }, () => repo.schedule(scheduleInput())),
      )
      const results = await Promise.all(
        invoices.map((inv) => repo.allocateDpsNumber(inv.id, '901', (n) => `DPS-901-${n}`)),
      )
      const numbers = results.map((r) => Number(r.dpsNumber)).sort((x, y) => x - y)
      expect(numbers).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
      expect(new Set(numbers).size).toBe(8) // sem repetição
    })

    test('markEmitted devolve false quando o status mudou (SKIPPED) entre o claim e a gravação', async () => {
      const invoice = await repo.schedule(scheduleInput())
      await repo.skip(invoice.id, SkipReason.REFUNDED_BEFORE_EMISSION) // corrida: estorno
      const recorded = await repo.markEmitted(invoice.id, {
        dpsXml: '<DPS/>',
        nfseXml: '<NFSe/>',
        accessKey: '1'.repeat(50),
        competenceDate: '2026-06-13',
        pdfToken: 'a'.repeat(64),
      })
      expect(recorded).toBe(false) // não casou → o chamador reconcilia (não perde a chave)
      expect((await repo.findById(invoice.id))?.status).toBe('SKIPPED')
    })

    test('failExhausted respeita o lease: tentativa acima do teto só falha depois de stale', async () => {
      const invoice = await repo.schedule(scheduleInput({ scheduledFor: new Date() }))
      await conn.sql`
        UPDATE fiscal.invoices
        SET attempts = 11, claimed_at = now()
        WHERE id = ${invoice.id}
      `

      expect(await repo.failExhausted({ maxAttempts: 10, staleMs: 120_000 })).toBe(0)
      expect((await repo.findById(invoice.id))?.status).toBe('SCHEDULED')

      await conn.sql`
        UPDATE fiscal.invoices
        SET claimed_at = now() - interval '3 minutes'
        WHERE id = ${invoice.id}
      `
      expect(await repo.failExhausted({ maxAttempts: 10, staleMs: 120_000 })).toBe(1)
      expect((await repo.findById(invoice.id))?.status).toBe('FAILED')
    })

    test('claimEmittedNeedingDelivery reivindica EMITTED com PDF/e-mail pendente e respeita backoff', async () => {
      const invoice = await repo.schedule(scheduleInput({ scheduledFor: new Date() }))
      await repo.markEmitted(invoice.id, {
        dpsXml: '<DPS/>',
        nfseXml: '<NFSe/>',
        accessKey: '2'.repeat(50),
        competenceDate: '2026-06-19',
        pdfToken: 'b'.repeat(64),
      })

      const [first] = await repo.claimEmittedNeedingDelivery({ batchSize: 10, staleMs: 0 })
      expect(first?.id).toBe(invoice.id)

      await repo.releaseDeliveryRetry(invoice.id, new Date(Date.now() + 60_000), 'DANFSe down')
      expect(await repo.claimEmittedNeedingDelivery({ batchSize: 10, staleMs: 0 })).toHaveLength(0)

      await conn.sql`
        UPDATE fiscal.invoices
        SET next_attempt_at = now() - interval '1 second'
        WHERE id = ${invoice.id}
      `
      const [afterBackoff] = await repo.claimEmittedNeedingDelivery({ batchSize: 10, staleMs: 0 })
      expect(afterBackoff?.id).toBe(invoice.id)
    })
  },
)
