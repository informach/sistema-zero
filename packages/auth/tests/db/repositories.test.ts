import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import path from 'node:path'
import { sha256Hex } from '@sistemazero/core/security'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'
import { UserAggregate } from '../../src/domain/user/user.aggregate'
import { EmailAlreadyInUseError } from '../../src/domain/user/user.errors'
import { Email } from '../../src/domain/value-objects/email'
import {
  createDbConnection,
  type DbConnection,
} from '../../src/infrastructure/persistence/drizzle/db'
import { DrizzleOtpCodeRepository } from '../../src/infrastructure/persistence/drizzle/otp-code.repository'
import { DrizzlePasswordResetTokenRepository } from '../../src/infrastructure/persistence/drizzle/password-reset-token.repository'
import { DrizzleRefreshTokenRepository } from '../../src/infrastructure/persistence/drizzle/refresh-token.repository'
import { DrizzleUserRepository } from '../../src/infrastructure/persistence/drizzle/user.repository'

/**
 * Testes dos adapters Drizzle contra um Postgres REAL — as invariantes que os
 * fakes em memória não provam (foi exatamente assim que o bug histórico do
 * `passwordHash` ausente no UPDATE passou despercebido):
 *
 *  1. O UPDATE otimista persiste TODOS os campos mutáveis (incl. passwordHash).
 *  2. A unique de e-mail vale no banco (23505 → EmailAlreadyInUseError).
 *  3. `claimForRotation` é ATÔMICO sob concorrência (A1 do full review).
 *  4. A busca `q` escapa curingas do ILIKE (B5).
 *  5. `deleteExpired`/`lastIssuedAt` (purga M2 + cooldown M3).
 *
 * Usa o Postgres de dev (Docker, porta 5433) num banco DEDICADO
 * `sistemazero_test` (criado aqui; nunca toca os dados de dev). Sem Postgres
 * alcançável, a suíte é PULADA — `bun test` continua verde sem infra.
 * Override: `TEST_DATABASE_URL`. Espelha `payments/tests/db`.
 */
const TEST_DB_NAME = 'sistemazero_test'
const FALLBACK_URL = 'postgres://postgres:postgres@localhost:5433/sistemazero'

function withDatabase(url: string, dbName: string): string {
  const u = new URL(url)
  u.pathname = `/${dbName}`
  return u.toString()
}

/** Sonda o servidor e garante o banco de teste. Retorna a URL pronta ou null (skip). */
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
      const code = (error as { code?: string }).code
      if (code !== '42P04') throw error // 42P04 = duplicate_database → já existe, ok
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
  console.warn(
    '[tests/db] Postgres indisponível (porta 5433?) — testes dos adapters PULADOS. ' +
      'Suba o Docker do banco ou defina TEST_DATABASE_URL para rodá-los.',
  )
}

function newUser(email: string): UserAggregate {
  const user = UserAggregate.register({
    id: randomUUID(),
    email: Email.create(email),
    passwordHash: 'hash:original',
    firstName: 'Teste',
    lastName: 'Silva',
  })
  user.pullEvents()
  return user
}

describe.skipIf(!testDatabaseUrl)('Adapters Drizzle no Postgres real (schema auth)', () => {
  let conn: DbConnection
  let users: DrizzleUserRepository
  let refreshTokens: DrizzleRefreshTokenRepository
  let resetTokens: DrizzlePasswordResetTokenRepository
  let otpCodes: DrizzleOtpCodeRepository

  beforeAll(async () => {
    conn = createDbConnection(testDatabaseUrl as string, { max: 5 })
    // Mesmo journal do drizzle-kit (drizzle.config.ts): tabela própria do package
    // no schema `drizzle`. A migration 0000 cria o schema `auth` do zero.
    await migrate(conn.db, {
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
      migrationsTable: 'auth_migrations',
      migrationsSchema: 'drizzle',
    })
    users = new DrizzleUserRepository(conn.db)
    refreshTokens = new DrizzleRefreshTokenRepository(conn.db)
    resetTokens = new DrizzlePasswordResetTokenRepository(conn.db)
    otpCodes = new DrizzleOtpCodeRepository(conn.db)
  })

  afterAll(async () => {
    await conn?.close()
  })

  beforeEach(async () => {
    await conn.sql`
      truncate table auth.users, auth.refresh_tokens, auth.password_reset_tokens, auth.otp_codes cascade`
  })

  test('UPDATE otimista persiste passwordHash (o bug histórico) e respeita a version', async () => {
    const user = newUser('update@example.com')
    await users.create(user)

    const loaded = await users.findById(user.id)
    if (!loaded) throw new Error('usuário não encontrado')
    const baseVersion = loaded.version
    loaded.changePassword('hash:novo')
    loaded.updateProfile({ avatarUrl: 'https://cdn.example.com/foto.webp' })
    expect(await users.update(loaded, baseVersion)).toBe(true)

    const reloaded = await users.findById(user.id)
    expect(reloaded?.passwordHash).toBe('hash:novo') // a senha NOVA vale no banco
    expect(reloaded?.avatarUrl).toBe('https://cdn.example.com/foto.webp')
    expect(reloaded?.version).toBe(baseVersion + 1)

    // Escritor defasado (version antiga) não grava — perdeu a corrida.
    const stale = await users.findById(user.id)
    if (!stale) throw new Error('usuário não encontrado')
    stale.changePassword('hash:defasado')
    expect(await users.update(stale, baseVersion)).toBe(false)
    expect((await users.findById(user.id))?.passwordHash).toBe('hash:novo')
  })

  test('unique de e-mail vale no banco: 23505 → EmailAlreadyInUseError', async () => {
    await users.create(newUser('dup@example.com'))
    let caught: unknown = null
    try {
      await users.create(newUser('dup@example.com'))
    } catch (error) {
      caught = error
    }
    expect(caught).toBeInstanceOf(EmailAlreadyInUseError)
  })

  test('claimForRotation é atômico: 2 claims CONCORRENTES → exatamente 1 vencedor', async () => {
    const user = newUser('claim@example.com')
    await users.create(user)
    const id = randomUUID()
    await refreshTokens.create({
      id,
      userId: user.id,
      familyId: randomUUID(),
      tokenHash: sha256Hex(`refresh-${id}`),
      expiresAt: new Date(Date.now() + 60_000),
    })

    const results = await Promise.all([
      refreshTokens.claimForRotation(id, new Date()),
      refreshTokens.claimForRotation(id, new Date()),
    ])
    expect(results.filter(Boolean)).toHaveLength(1) // o lock de linha serializa: 1 vence
  })

  test('busca q escapa curingas do ILIKE (literal, não padrão)', async () => {
    await users.create(newUser('alice@example.com'))
    await users.create(newUser('bob@example.com'))
    const promo = UserAggregate.register({
      id: randomUUID(),
      email: Email.create('promo@example.com'),
      passwordHash: 'hash:x',
      firstName: '100%',
      lastName: 'Off',
    })
    promo.pullEvents()
    await users.create(promo)

    // '%' literal: sem escape casaria TODO MUNDO; escapado casa só o "100%".
    const wildcard = await users.list({ q: '%', limit: 10, offset: 0 })
    expect(wildcard.total).toBe(1)
    expect(wildcard.users[0]?.firstName).toBe('100%')

    const literal = await users.list({ q: '100%', limit: 10, offset: 0 })
    expect(literal.total).toBe(1)

    const normal = await users.list({ q: 'alice', limit: 10, offset: 0 })
    expect(normal.total).toBe(1)
  })

  test('deleteExpired purga só além do cutoff; lastIssuedAt ancora o cooldown', async () => {
    const user = newUser('purge@example.com')
    await users.create(user)

    const past = new Date(Date.now() - 60_000)
    const future = new Date(Date.now() + 60_000)
    await resetTokens.create({
      id: randomUUID(),
      userId: user.id,
      tokenHash: sha256Hex('reset-velho'),
      expiresAt: past,
    })
    await resetTokens.create({
      id: randomUUID(),
      userId: user.id,
      tokenHash: sha256Hex('reset-vivo'),
      expiresAt: future,
    })
    await otpCodes.create({
      id: randomUUID(),
      userId: user.id,
      purpose: 'sign_in',
      codeHash: sha256Hex('123456'),
      expiresAt: past,
    })
    await refreshTokens.create({
      id: randomUUID(),
      userId: user.id,
      familyId: randomUUID(),
      tokenHash: sha256Hex('refresh-velho'),
      expiresAt: past,
    })

    // lastIssuedAt enxerga a emissão mais recente (consumida ou não).
    expect(await resetTokens.lastIssuedAt(user.id)).not.toBeNull()
    expect(await otpCodes.lastIssuedAt(user.id, 'sign_in')).not.toBeNull()
    expect(await otpCodes.lastIssuedAt(user.id, 'password_reset')).toBeNull()

    const cutoff = new Date()
    expect(await resetTokens.deleteExpired(cutoff)).toBe(1) // só o vencido
    expect(await otpCodes.deleteExpired(cutoff)).toBe(1)
    expect(await refreshTokens.deleteExpired(cutoff)).toBe(1)
    // O token vivo sobreviveu.
    expect(await resetTokens.findByHash(sha256Hex('reset-vivo'))).not.toBeNull()
  })
})
