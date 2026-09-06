import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import path from 'node:path'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'
import {
  createDbConnection,
  type DbConnection,
} from '../../src/infrastructure/persistence/drizzle/db'
import { DrizzleProcessedWebhookStore } from '../../src/infrastructure/persistence/drizzle/processed-webhook.store'
import { DrizzleReferralRepository } from '../../src/infrastructure/persistence/drizzle/referral.repository'

/**
 * Invariantes das CONVERSÕES que só o Postgres real prova:
 *  1. As uniques (redemption_id, payment_id) sob corrida → exatamente 1 criada.
 *  2. `matureConversions` promove só as maduras (advisory lock não trava a si).
 *  3. `markConversionPaid` só vence de `eligible` (guard por status).
 *  4. Claim/lease/token do processed-webhook store (dedupe + reclaim de stale).
 *
 * Sem Postgres (porta 5433) a suíte é PULADA. Regra do banco compartilhado:
 * truncate com cascade; nunca `expect(...).rejects` com promise do drizzle.
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
  console.warn('[tests/db] Postgres indisponível — testes de conversões PULADOS.')
}

describe.skipIf(!testDatabaseUrl)('Conversões — Postgres real', () => {
  let connection: DbConnection
  let repo: DrizzleReferralRepository

  beforeAll(async () => {
    connection = createDbConnection(testDatabaseUrl!, { max: 5 })
    await migrate(connection.db, {
      migrationsFolder: path.join(
        import.meta.dir,
        '../../src/infrastructure/persistence/drizzle/migrations',
      ),
      migrationsTable: 'referrals_migrations',
    })
    repo = new DrizzleReferralRepository(connection.db)
  })

  afterAll(async () => {
    await connection?.close()
  })

  beforeEach(async () => {
    await connection.sql`truncate referrals.conversions, referrals.processed_webhooks, referrals.invites, referrals.scholarship_redemptions, referrals.codes, referrals.ambassadors cascade`
  })

  async function seedRedemption() {
    const created = await repo.createAmbassadorWithCode({
      name: 'Vó Cida',
      email: 'cida@example.com',
      pageToken: crypto.randomUUID().repeat(2),
      code: 'cida-x7k2',
    })
    if (created.kind !== 'created') throw new Error('seed falhou')
    const { redemption } = await repo.insertRedemption({
      codeId: created.code.id,
      email: 'paula@example.com',
      name: 'Paula',
      phone: null,
    })
    await repo.markRedemptionGranted(redemption.id, new Date())
    return { code: created.code, ambassador: created.ambassador, redemption }
  }

  function conversionInput(seed: Awaited<ReturnType<typeof seedRedemption>>, paymentId: string) {
    return {
      redemptionId: seed.redemption.id,
      codeId: seed.code.id,
      ambassadorId: seed.ambassador.id,
      paymentId,
      subscriptionId: null,
      offerSlug: 'comunidade-dos-criadores-mensal',
      amountCents: 9700n,
      bonusCents: 3000,
      status: 'pending' as const,
      paidAt: new Date('2026-09-01T12:00:00.000Z'),
      maturesAt: new Date('2026-09-09T00:00:00.000Z'),
    }
  }

  test('corrida no UNIQUE(redemption_id): 3 inserts concorrentes → 1 criada', async () => {
    const seed = await seedRedemption()
    const results = await Promise.all([
      repo.insertConversion(conversionInput(seed, 'pay-a')),
      repo.insertConversion(conversionInput(seed, 'pay-b')),
      repo.insertConversion(conversionInput(seed, 'pay-c')),
    ])
    expect(results.filter((r) => r.created)).toHaveLength(1)
  })

  test('re-entrega do MESMO payment (payment_id unique) → created false', async () => {
    const seed = await seedRedemption()
    expect((await repo.insertConversion(conversionInput(seed, 'pay-1'))).created).toBe(true)
    expect((await repo.insertConversion(conversionInput(seed, 'pay-1'))).created).toBe(false)
  })

  test('matureConversions promove SÓ as maduras; markConversionPaid só de eligible', async () => {
    const seed = await seedRedemption()
    await repo.insertConversion({
      ...conversionInput(seed, 'pay-1'),
      maturesAt: new Date(Date.now() - 1000),
    })
    expect(await repo.matureConversions(new Date(), 50)).toBe(1)
    expect(await repo.matureConversions(new Date(), 50)).toBe(0) // idempotente

    const { items } = await repo.listConversions({ limit: 10, offset: 0 })
    expect(items[0]!.status).toBe('eligible')

    // paid ANTES de eligible não vence; de eligible vence uma vez só.
    expect(await repo.markConversionPaid(items[0]!.id, 'Helena', 'Pix 31/08')).toBe(true)
    expect(await repo.markConversionPaid(items[0]!.id, 'Helena', null)).toBe(false)
    const after = await repo.listConversions({ status: 'paid', limit: 10, offset: 0 })
    expect(after.items[0]!.paidMarkedBy).toBe('Helena')
    expect(after.items[0]!.note).toBe('Pix 31/08')
  })

  test('estorno: pending cancela; re-entrega devolve o STATUS; inexistente not_found', async () => {
    const seed = await seedRedemption()
    await repo.insertConversion(conversionInput(seed, 'pay-1'))
    expect(await repo.cancelPendingConversionByPayment('pay-1')).toEqual({ kind: 'canceled' })
    expect(await repo.cancelPendingConversionByPayment('pay-1')).toEqual({
      kind: 'not_pending',
      status: 'canceled',
    })
    expect(await repo.cancelPendingConversionByPayment('pay-x')).toEqual({ kind: 'not_found' })
  })

  test('UNIQUE parcial: canceled NÃO ocupa a vaga — nova assinatura volta a converter', async () => {
    const seed = await seedRedemption()
    await repo.insertConversion(conversionInput(seed, 'pay-1'))
    expect(await repo.cancelPendingConversionByPayment('pay-1')).toEqual({ kind: 'canceled' })
    // Mesmo bolsista assina DE NOVO (pagamento novo): a canceled não bloqueia.
    const again = await repo.insertConversion(conversionInput(seed, 'pay-2'))
    expect(again.created).toBe(true)
    // Com uma pending viva, a 3ª tentativa (ciclo/renovação) segue no-op.
    const third = await repo.insertConversion(conversionInput(seed, 'pay-3'))
    expect(third.created).toBe(false)
  })

  test('setConversionMaturesNow antecipa a garantia (staging/e2e)', async () => {
    const seed = await seedRedemption()
    await repo.insertConversion({
      ...conversionInput(seed, 'pay-1'),
      maturesAt: new Date(Date.now() + 7 * 24 * 3600_000),
    })
    const { items } = await repo.listConversions({ limit: 10, offset: 0 })
    expect(await repo.setConversionMaturesNow(items[0]!.id)).toBe(true)
    expect(await repo.matureConversions(new Date(Date.now() + 1000), 50)).toBe(1)
  })

  test('poda do dedupe: apaga processadas antigas E claims órfãos; preserva as recentes', async () => {
    const store = new DrizzleProcessedWebhookStore(connection.db)
    const old = new Date(Date.now() - 40 * 24 * 3600_000)
    const cutoff = new Date(Date.now() - 30 * 24 * 3600_000)

    // (a) processada ANTIGA → sai. (b) processada de agora → fica.
    const antiga = await store.claimDelivery('prune-antiga', 60_000)
    if (antiga.kind !== 'claimed') throw new Error('claim falhou')
    await store.markProcessed('prune-antiga', antiga.token, { eventName: 'payment.paid' })
    await connection.sql`update referrals.processed_webhooks set processed_at = ${old.toISOString()} where delivery_id = 'prune-antiga'`

    const nova = await store.claimDelivery('prune-nova', 60_000)
    if (nova.kind !== 'claimed') throw new Error('claim falhou')
    await store.markProcessed('prune-nova', nova.token, { eventName: 'payment.paid' })

    // (c) claim ÓRFÃO antigo (morte entre claim e markProcessed) → sai.
    await store.claimDelivery('prune-orfa', 60_000)
    await connection.sql`update referrals.processed_webhooks set processing_at = ${old.toISOString()} where delivery_id = 'prune-orfa'`

    const pruned = await store.pruneProcessedBefore(cutoff)
    expect(pruned).toBe(2)
    // A recente sobreviveu e SEGUE deduplicando (a poda não reabre replay).
    expect((await store.claimDelivery('prune-nova', 60_000)).kind).toBe('processed')
    // A antiga saiu: um id reciclado volta a ser reivindicável.
    expect((await store.claimDelivery('prune-antiga', 60_000)).kind).toBe('claimed')
  })

  test('processed-webhook store: claim → in_progress → processed; stale reclaim', async () => {
    const store = new DrizzleProcessedWebhookStore(connection.db)
    const first = await store.claimDelivery('d-1', 60_000)
    expect(first.kind).toBe('claimed')
    if (first.kind !== 'claimed') throw new Error('claim falhou')

    // Concorrente na janela do lease → in_progress.
    expect((await store.claimDelivery('d-1', 60_000)).kind).toBe('in_progress')

    // Marca com o token certo; a próxima entrega deduplica.
    expect(await store.markProcessed('d-1', first.token, { eventName: 'payment.paid' })).toBe(true)
    expect((await store.claimDelivery('d-1', 60_000)).kind).toBe('processed')

    // Lease VENCIDO é reassumível; o token antigo não marca mais.
    const second = await store.claimDelivery('d-2', 60_000)
    if (second.kind !== 'claimed') throw new Error('claim falhou')
    const reclaimed = await store.claimDelivery('d-2', -1) // staleMs negativo = tudo stale
    expect(reclaimed.kind).toBe('claimed')
    expect(await store.markProcessed('d-2', second.token, {})).toBe(false)
  })
})
