import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import path from 'node:path'
import { sql } from 'drizzle-orm'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'
import { SkipReason } from '../../src/domain/invoice/invoice.status'
import type { ScheduleInvoiceInput } from '../../src/domain/ports/invoice-repository.port'
import {
  createDbConnection,
  type DbConnection,
} from '../../src/infrastructure/persistence/drizzle/db'
import { DrizzleInvoiceRepository } from '../../src/infrastructure/persistence/drizzle/invoice.repository'
import {
  DrizzleProcessedWebhookStore,
  withAdvisoryLock,
} from '../../src/infrastructure/persistence/drizzle/processed-webhook.store'

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
      await conn.sql`TRUNCATE fiscal.invoices, fiscal.invoice_events, fiscal.invoice_pdfs, fiscal.dps_counters, fiscal.processed_webhooks RESTART IDENTITY CASCADE`
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
      const claimed = await repo.claimDueForEmission({
        batchSize: 8,
        staleMs: 60_000,
        maxAttempts: 10,
      })
      const tokens = new Map(claimed.map((invoice) => [invoice.id, invoice.claimToken]))
      const results = await Promise.all(
        invoices.map((inv) =>
          repo.allocateDpsNumber(inv.id, '901', (n) => `DPS-901-${n}`, tokens.get(inv.id)!),
        ),
      )
      const numbers = results.map((r) => Number(r!.dpsNumber)).sort((x, y) => x - y)
      expect(numbers).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
      expect(new Set(numbers).size).toBe(8) // sem repetição
    }, 15_000)

    test('markEmitted devolve false quando o status mudou (SKIPPED) entre o claim e a gravação', async () => {
      const invoice = await repo.schedule(scheduleInput())
      await repo.skip(invoice.id, SkipReason.REFUNDED_BEFORE_EMISSION) // corrida: estorno
      const recorded = await repo.markEmitted(
        invoice.id,
        {
          dpsXml: '<DPS/>',
          nfseXml: '<NFSe/>',
          accessKey: '1'.repeat(50),
          competenceDate: '2026-06-13',
          pdfToken: 'a'.repeat(64),
        },
        'claim-antigo',
      )
      expect(recorded).toBe(false) // não casou → o chamador reconcilia (não perde a chave)
      expect((await repo.findById(invoice.id))?.status).toBe('SKIPPED')
    })

    test('substituta emitida após cancelamento automático terminal também entra em CANCEL_PENDING', async () => {
      for (const terminalStatus of ['CANCELLED', 'CANCEL_FAILED'] as const) {
        const originalAccessKey = terminalStatus === 'CANCELLED' ? '1'.repeat(50) : '3'.repeat(50)
        const substituteAccessKey = terminalStatus === 'CANCELLED' ? '2'.repeat(50) : '4'.repeat(50)
        const original = await repo.schedule(scheduleInput())
        const [claimedOriginal] = await repo.claimDueForEmission({
          batchSize: 1,
          staleMs: 60_000,
          maxAttempts: 10,
        })
        if (!claimedOriginal?.claimToken) throw new Error('original sem claim')
        await repo.markEmitted(
          original.id,
          {
            dpsXml: '<DPS/>',
            nfseXml: '<NFSe/>',
            accessKey: originalAccessKey,
            competenceDate: '2026-06-13',
            pdfToken: crypto.randomUUID().replaceAll('-', '').repeat(2),
          },
          claimedOriginal.claimToken,
        )
        await repo.requestCancel(original.id, 'system:refund', 'Pagamento reembolsado')
        const [claimedCancel] = await repo.claimCancelPending({ batchSize: 1, staleMs: 60_000 })
        if (!claimedCancel?.claimToken) throw new Error('cancelamento sem claim')
        if (terminalStatus === 'CANCELLED') {
          await repo.markCancelled(original.id, '<evento/>', claimedCancel.claimToken)
        } else {
          await repo.markCancelFailed(original.id, 'prazo expirado', claimedCancel.claimToken)
        }

        const substitute = await repo.schedule(
          scheduleInput({ paymentId: original.paymentId, substitutesId: original.id }),
        )
        const [claimedSubstitute] = await repo.claimDueForEmission({
          batchSize: 1,
          staleMs: 60_000,
          maxAttempts: 10,
        })
        if (!claimedSubstitute?.claimToken) throw new Error('substituta sem claim')
        const result = await repo.markEmittedAsSubstitute(
          substitute.id,
          {
            dpsXml: '<DPS/>',
            nfseXml: '<NFSe/>',
            accessKey: substituteAccessKey,
            competenceDate: '2026-06-13',
            pdfToken: crypto.randomUUID().replaceAll('-', '').repeat(2),
          },
          original.id,
          claimedSubstitute.claimToken,
        )

        expect(result.substituteCancelPending).toBe(true)
        expect((await repo.findById(substitute.id))?.status).toBe('CANCEL_PENDING')
      }
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
      const [claimedEmission] = await repo.claimDueForEmission({
        batchSize: 1,
        staleMs: 60_000,
        maxAttempts: 10,
      })
      if (!claimedEmission?.claimToken) throw new Error('emissão sem claim')
      await repo.markEmitted(
        invoice.id,
        {
          dpsXml: '<DPS/>',
          nfseXml: '<NFSe/>',
          accessKey: '2'.repeat(50),
          competenceDate: '2026-06-19',
          pdfToken: 'b'.repeat(64),
        },
        claimedEmission.claimToken,
      )

      await conn.sql`
        UPDATE fiscal.invoices SET claimed_at = NULL, claim_token = NULL WHERE id = ${invoice.id}
      `

      const [first] = await repo.claimEmittedNeedingDelivery({
        batchSize: 10,
        staleMs: 0,
        includeEmail: true,
      })
      expect(first?.id).toBe(invoice.id)

      await repo.releaseDeliveryRetry(
        invoice.id,
        new Date(Date.now() + 60_000),
        'DANFSe down',
        first!.claimToken!,
      )
      expect(
        await repo.claimEmittedNeedingDelivery({ batchSize: 10, staleMs: 0, includeEmail: true }),
      ).toHaveLength(0)

      await conn.sql`
        UPDATE fiscal.invoices
        SET next_attempt_at = now() - interval '1 second'
        WHERE id = ${invoice.id}
      `
      const [afterBackoff] = await repo.claimEmittedNeedingDelivery({
        batchSize: 10,
        staleMs: 0,
        includeEmail: true,
      })
      expect(afterBackoff?.id).toBe(invoice.id)
    })

    test('claim de webhook não mantém transação aberta durante o processamento', async () => {
      const store = new DrizzleProcessedWebhookStore(conn.db)
      const deliveryId = `evt-${crypto.randomUUID()}`

      const [first, concurrent] = await Promise.all([
        store.claimDelivery(deliveryId, 60_000),
        store.claimDelivery(deliveryId, 60_000),
      ])
      const claimed = [first, concurrent].find(
        (claim): claim is { kind: 'claimed'; token: string } => claim.kind === 'claimed',
      )
      expect(claimed?.token).toBeString()
      expect([first.kind, concurrent.kind].sort()).toEqual(['claimed', 'in_progress'])

      await store.releaseClaim(deliveryId, claimed!.token)
      const reclaimed = await store.claimDelivery(deliveryId, 60_000)
      expect(reclaimed.kind).toBe('claimed')
      if (reclaimed.kind !== 'claimed') throw new Error('claim deveria ter sido liberado')
      await store.markProcessed(deliveryId, reclaimed.token, { eventName: 'payment.paid' })
      expect((await store.claimDelivery(deliveryId, 60_000)).kind).toBe('processed')

      const staleDeliveryId = `evt-${crypto.randomUUID()}`
      const stale = await store.claimDelivery(staleDeliveryId, 60_000)
      if (stale.kind !== 'claimed') throw new Error('claim inicial deveria existir')
      await conn.sql`
        UPDATE fiscal.processed_webhooks
        SET processing_at = now() - interval '2 minutes'
        WHERE delivery_id = ${staleDeliveryId}
      `
      const newer = await store.claimDelivery(staleDeliveryId, 60_000)
      if (newer.kind !== 'claimed') throw new Error('claim expirado deveria ser reassumido')
      expect(await store.markProcessed(staleDeliveryId, stale.token, {})).toBe(false)
      await store.releaseClaim(staleDeliveryId, stale.token)
      expect((await store.claimDelivery(staleDeliveryId, 60_000)).kind).toBe('in_progress')
    })

    test('token impede que o claim antigo renove uma nota reassumida', async () => {
      const invoice = await repo.schedule(scheduleInput({ scheduledFor: new Date() }))
      const [first] = await repo.claimDueForEmission({
        batchSize: 1,
        staleMs: 60_000,
        maxAttempts: 10,
      })
      if (!first?.claimToken) throw new Error('claim inicial sem token')
      await conn.sql`
        UPDATE fiscal.invoices
        SET claimed_at = now() - interval '2 minutes'
        WHERE id = ${invoice.id}
      `
      const [second] = await repo.claimDueForEmission({
        batchSize: 1,
        staleMs: 60_000,
        maxAttempts: 10,
      })
      if (!second?.claimToken) throw new Error('claim reassumido sem token')

      expect(second.claimToken).not.toBe(first.claimToken)
      expect(await repo.touchClaim(invoice.id, first.claimToken)).toBe(false)
      expect(await repo.touchClaim(invoice.id, second.claimToken)).toBe(true)
    })

    test('claim antigo não consegue liberar o retry da nota reassumida', async () => {
      const invoice = await repo.schedule(scheduleInput({ scheduledFor: new Date() }))
      const [first] = await repo.claimDueForEmission({
        batchSize: 1,
        staleMs: 60_000,
        maxAttempts: 10,
      })
      if (!first?.claimToken) throw new Error('claim inicial sem token')
      await conn.sql`
        UPDATE fiscal.invoices
        SET claimed_at = now() - interval '2 minutes'
        WHERE id = ${invoice.id}
      `
      const [second] = await repo.claimDueForEmission({
        batchSize: 1,
        staleMs: 60_000,
        maxAttempts: 10,
      })
      if (!second?.claimToken) throw new Error('claim reassumido sem token')

      await repo.releaseForRetry(
        invoice.id,
        new Date(Date.now() + 60_000),
        'worker antigo',
        first.claimToken,
      )

      const current = await repo.findById(invoice.id)
      expect(current?.claimToken).toBe(second.claimToken)
      expect(current?.claimedAt).not.toBeNull()
    })

    test('storePdf grava o bytea sob guard de claim; findPdfByToken devolve content + invoiceStatus', async () => {
      const invoice = await repo.schedule(scheduleInput({ scheduledFor: new Date() }))
      const [claimed] = await repo.claimDueForEmission({
        batchSize: 1,
        staleMs: 60_000,
        maxAttempts: 10,
      })
      if (!claimed?.claimToken) throw new Error('claim inicial sem token')
      const token = 'd'.repeat(64)
      await repo.markEmitted(
        invoice.id,
        {
          dpsXml: '<DPS/>',
          nfseXml: '<NFSe/>',
          accessKey: '7'.repeat(50),
          competenceDate: '2026-08-25',
          pdfToken: token,
        },
        claimed.claimToken,
      )
      const bytes = new TextEncoder().encode('%PDF-db-real')

      // Claim ERRADO não grava (guard status+claim_token dentro da transação).
      expect(await repo.storePdf(invoice.id, bytes, 'claim-errado')).toBe(false)
      expect(await repo.findPdfByToken(token)).toBeNull()

      expect(await repo.storePdf(invoice.id, bytes, claimed.claimToken)).toBe(true)
      const stored = await repo.findPdfByToken(token)
      expect(stored?.invoiceId).toBe(invoice.id)
      expect(stored?.invoiceStatus).toBe('EMITTED')
      expect(Buffer.from(stored?.content ?? new Uint8Array()).toString('latin1')).toBe(
        '%PDF-db-real',
      )

      // Nota cancelada: o MESMO token passa a reportar o status novo (o serve
      // aplica a marca d'água CANCELADA na hora — o bytea fica intacto).
      await conn.sql`UPDATE fiscal.invoices SET status = 'CANCELLED' WHERE id = ${invoice.id}`
      const cancelled = await repo.findPdfByToken(token)
      expect(cancelled?.invoiceStatus).toBe('CANCELLED')
      expect(Buffer.from(cancelled?.content ?? new Uint8Array()).toString('latin1')).toBe(
        '%PDF-db-real',
      )
    })

    test('advisory lock entrega a transação bloqueada ao trabalho de retenção', async () => {
      const result = await withAdvisoryLock(conn.db, 7_223_991_888n, async (tx) => {
        const [row] = await tx.execute<{ value: number }>(sql`SELECT 1 AS value`)
        return row?.value
      })

      expect(result).toBe(1)
    })
  },
)
