import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import path from 'node:path'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'
import {
  createDbConnection,
  type DbConnection,
} from '../../src/infrastructure/persistence/drizzle/db'
import { isUniqueViolation } from '../../src/infrastructure/persistence/drizzle/pg-errors'
import { DrizzleReferralRepository } from '../../src/infrastructure/persistence/drizzle/referral.repository'
import { codes } from '../../src/infrastructure/persistence/drizzle/schema'

/**
 * Invariantes que SÓ o Postgres real prova — o fake em memória é single-thread:
 *  1. `insertRedemption` é idempotente sob corrida (UNIQUE(email) + on conflict).
 *  2. O lease do resgate é atômico (2 concorrentes → 1 vence).
 *  3. As UNIQUEs parciais de `codes` (ambassador/account) barram duplicata.
 *  4. `createAmbassadorWithCode` distingue email_exists de code_collision.
 *
 * Sem Postgres alcançável (porta 5433) a suíte é PULADA — `bun test` segue verde.
 * Override: `TEST_DATABASE_URL`. Espelha tests/db do fiscal/members.
 * Regra do banco COMPARTILHADO: truncate com cascade; nunca `expect(...).rejects`
 * com promise do drizzle (thenable preguiçoso) — try/catch.
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

/** Concatena as mensagens da cadeia de `cause` (drizzle envelopa o driver). */
function collectErrorText(error: unknown): string {
  const parts: string[] = []
  let current: unknown = error
  for (let depth = 0; depth < 5 && current; depth++) {
    if (current instanceof Error) parts.push(current.message)
    else parts.push(String(current))
    current = (current as { cause?: unknown }).cause
  }
  return parts.join(' | ')
}

const testDatabaseUrl = await prepareTestDatabase()
if (!testDatabaseUrl) {
  console.warn('[tests/db] Postgres indisponível — testes de concorrência do referrals PULADOS.')
}

describe.skipIf(!testDatabaseUrl)('DrizzleReferralRepository — Postgres real', () => {
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
    await connection.sql`truncate referrals.invites, referrals.scholarship_redemptions, referrals.codes, referrals.ambassadors cascade`
  })

  async function seedCode() {
    const created = await repo.createAmbassadorWithCode({
      name: 'Vó Cida',
      email: 'cida@example.com',
      pageToken: crypto.randomUUID().repeat(2),
      code: 'cida-x7k2',
    })
    if (created.kind !== 'created') throw new Error('seed falhou')
    return created
  }

  test('insertRedemption: corrida no UNIQUE(email) → exatamente 1 criada', async () => {
    const { code } = await seedCode()
    const input = { codeId: code.id, email: 'paula@example.com', name: 'Paula', phone: null }
    const results = await Promise.all([
      repo.insertRedemption(input),
      repo.insertRedemption(input),
      repo.insertRedemption(input),
    ])
    const created = results.filter((r) => r.created)
    expect(created).toHaveLength(1)
    const ids = new Set(results.map((r) => r.redemption.id))
    expect(ids.size).toBe(1) // todos veem a MESMA linha
  })

  test('lease do resgate é atômico: 2 concorrentes → 1 vence', async () => {
    const { code } = await seedCode()
    const { redemption } = await repo.insertRedemption({
      codeId: code.id,
      email: 'paula@example.com',
      name: 'Paula',
      phone: null,
    })
    const now = new Date()
    const until = new Date(now.getTime() + 60_000)
    const [a, b] = await Promise.all([
      repo.acquireRedemptionLease(redemption.id, until, now),
      repo.acquireRedemptionLease(redemption.id, until, now),
    ])
    expect([a, b].filter((r) => r !== null)).toHaveLength(1)

    // Lease expirado é retomável; completed nunca é. (Date em SQL cru do
    // postgres.js estoura — gotcha do monorepo: bindar como ISO string.)
    const past = new Date(now.getTime() - 1)
    await connection.sql`update referrals.scholarship_redemptions set processing_until = ${past.toISOString()}`
    expect(await repo.acquireRedemptionLease(redemption.id, until, now)).not.toBeNull()
    await repo.markRedemptionGranted(redemption.id, now)
    await repo.releaseRedemptionLease(redemption.id)
    expect(await repo.acquireRedemptionLease(redemption.id, until, now)).toBeNull()
  })

  test('claim do welcome: só a 1ª execução vence; release reabre', async () => {
    const { code } = await seedCode()
    const { redemption } = await repo.insertRedemption({
      codeId: code.id,
      email: 'p@example.com',
      name: 'P',
      phone: null,
    })
    const now = new Date()
    const [a, b] = await Promise.all([
      repo.claimRedemptionWelcome(redemption.id, now),
      repo.claimRedemptionWelcome(redemption.id, now),
    ])
    expect([a, b].filter(Boolean)).toHaveLength(1)
    await repo.releaseRedemptionWelcome(redemption.id)
    expect(await repo.claimRedemptionWelcome(redemption.id, now)).toBe(true)
  })

  test('UNIQUE parcial de codes: 2 códigos p/ a MESMA conta → 23505', async () => {
    const accountUserId = crypto.randomUUID()
    await connection.db.insert(codes).values({
      code: 'conta-um',
      ownerKind: 'account',
      accountUserId,
      displayName: 'Fulana',
      ownerEmail: 'f@example.com',
    })
    try {
      await connection.db.insert(codes).values({
        code: 'conta-dois',
        ownerKind: 'account',
        accountUserId,
        displayName: 'Fulana',
        ownerEmail: 'f@example.com',
      })
      expect.unreachable('deveria ter violado a UNIQUE parcial')
    } catch (error) {
      expect(isUniqueViolation(error)).toBe(true)
    }
  })

  test('CHECK de owner: código account com ambassador_id junto → recusado', async () => {
    const { ambassador } = await seedCode()
    try {
      await connection.db.insert(codes).values({
        code: 'quebrado1',
        ownerKind: 'account',
        ambassadorId: ambassador.id,
        accountUserId: crypto.randomUUID(),
        displayName: 'X',
      })
      expect.unreachable('deveria ter violado o CHECK')
    } catch (error) {
      // O drizzle ≥0.44 envelopa o erro do driver — a mensagem real está na
      // cadeia de `cause` (mesma razão do isUniqueViolation).
      expect(collectErrorText(error)).toContain('codes_owner_check')
    }
  })

  test('createAmbassadorWithCode: email_exists vs code_collision (tx íntegra)', async () => {
    await seedCode()
    const sameEmail = await repo.createAmbassadorWithCode({
      name: 'Outra',
      email: 'cida@example.com',
      pageToken: crypto.randomUUID().repeat(2),
      code: 'outra-a2b3',
    })
    expect(sameEmail.kind).toBe('email_exists')

    const sameCode = await repo.createAmbassadorWithCode({
      name: 'Outra',
      email: 'outra@example.com',
      pageToken: crypto.randomUUID().repeat(2),
      code: 'cida-x7k2',
    })
    expect(sameCode.kind).toBe('code_collision')
    // O rollback da transação não pode deixar embaixador órfão.
    const { total } = await repo.listAmbassadors({ limit: 10, offset: 0 })
    expect(total).toBe(1)
  })

  test('insertInvite: UNIQUE (ambassador, e-mail) devolve a existente', async () => {
    const { ambassador, code } = await seedCode()
    const input = {
      ambassadorId: ambassador.id,
      codeId: code.id,
      inviteeName: 'Paula',
      inviteeEmail: 'paula@example.com',
    }
    const [a, b] = await Promise.all([repo.insertInvite(input), repo.insertInvite(input)])
    expect([a, b].filter((r) => r.created)).toHaveLength(1)
    expect(a.invite.id).toBe(b.invite.id)
  })
})
