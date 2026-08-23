import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import path from 'node:path'
import { sha256Hex } from '@sistemazero/core/security'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'
import { ProfileAggregate } from '../../src/domain/profile/profile.aggregate'
import { UserAggregate } from '../../src/domain/user/user.aggregate'
import { EmailAlreadyInUseError } from '../../src/domain/user/user.errors'
import { Email } from '../../src/domain/value-objects/email'
import {
  createDbConnection,
  type DbConnection,
} from '../../src/infrastructure/persistence/drizzle/db'
import { DrizzleOtpCodeRepository } from '../../src/infrastructure/persistence/drizzle/otp-code.repository'
import { DrizzlePasswordResetTokenRepository } from '../../src/infrastructure/persistence/drizzle/password-reset-token.repository'
import { DrizzleProfileRepository } from '../../src/infrastructure/persistence/drizzle/profile.repository'
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
 *  4. Revogar a família impede inserir um sucessor após a corrida de logout.
 *  5. Troca de modo disputa a mesma linha do claim e audita na mesma transação.
 *  6. A busca `q` escapa curingas do ILIKE (B5).
 *  7. `deleteExpired`/`lastIssuedAt` (purga M2 + cooldown M3).
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
  let profiles: DrizzleProfileRepository

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
    profiles = new DrizzleProfileRepository(conn.db)
  })

  afterAll(async () => {
    await conn?.close()
  })

  beforeEach(async () => {
    await conn.sql`
      truncate table auth.users, auth.user_deletion_receipts, auth.refresh_tokens,
        auth.refresh_token_families,
        auth.password_reset_tokens, auth.otp_codes, auth.audit_logs cascade`
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

  test('prepareDeletion captura perfil arquivado, bloqueia a conta e cerca novos perfis', async () => {
    const user = newUser('delete-prepare@example.com')
    await users.create(user)
    const activeId = randomUUID()
    const archivedId = randomUUID()
    await conn.sql`
      insert into auth.profiles
        (id, account_user_id, name, status, sort_order, created_at, updated_at)
      values
        (${activeId}, ${user.id}, 'Ativo', 'active', 0, now(), now()),
        (${archivedId}, ${user.id}, 'Arquivado', 'archived', 1, now(), now())`

    const prepared = await users.prepareDeletion(user.id)

    expect(new Set(prepared?.profileIds)).toEqual(new Set([activeId, archivedId]))
    expect((await users.findById(user.id))?.status).toBe('blocked')
    const candidate = ProfileAggregate.create({
      id: randomUUID(),
      accountUserId: user.id,
      name: 'Novo perfil',
    })
    expect(await profiles.createWithinLimit(candidate, 5)).toEqual({
      outcome: 'account_inactive',
    })
  })

  test('deleteById grava recibo durável com os perfis e o retry preserva o resultado', async () => {
    const user = newUser('delete-receipt@example.com')
    await users.create(user)
    const firstProfileId = randomUUID()
    const secondProfileId = randomUUID()
    const profileIds = [firstProfileId, secondProfileId]
    await conn.sql`
      insert into auth.profiles
        (id, account_user_id, name, status, sort_order, created_at, updated_at)
      values
        (${firstProfileId}, ${user.id}, 'Um', 'active', 0, now(), now()),
        (${secondProfileId}, ${user.id}, 'Dois', 'archived', 1, now(), now())`

    await users.deleteById(user.id)
    expect(await users.findById(user.id)).toBeNull()
    expect(new Set((await users.findDeletionReceipt(user.id))?.profileIds)).toEqual(
      new Set(profileIds),
    )

    await users.deleteById(user.id)
    expect(new Set((await users.findDeletionReceipt(user.id))?.profileIds)).toEqual(
      new Set(profileIds),
    )
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

  test('troca de modo disputa a MESMA linha física que o claim de rotação', async () => {
    const target = newUser('mode-target@example.com')
    const actor = newUser('mode-actor@example.com')
    await users.create(target)
    await users.create(actor)
    const id = randomUUID()
    const familyId = randomUUID()
    await refreshTokens.create({
      id,
      userId: target.id,
      familyId,
      tokenHash: sha256Hex(`refresh-${id}`),
      expiresAt: new Date(Date.now() + 60_000),
      impersonatorUserId: actor.id,
    })

    const locked = Promise.withResolvers<void>()
    const release = Promise.withResolvers<void>()
    const blocker = conn.sql.begin(async (tx) => {
      await tx`select id from auth.refresh_tokens where id = ${id} for update`
      locked.resolve()
      await release.promise
    })
    await locked.promise

    let settled = false
    const changing = refreshTokens
      .setImpersonationMode(id, familyId, true, {
        id: randomUUID(),
        actorId: target.id,
        impersonatorId: actor.id,
        action: 'auth.impersonation.mode.write',
        method: 'POST',
        path: '/auth/impersonate/mode',
        status: 200,
      })
      .then((value) => {
        settled = true
        return value
      })
    try {
      await new Promise((resolve) => setTimeout(resolve, 50))
      // Se o adapter atualizasse só a família, passaria reto pelo lock do token
      // e a rotação poderia assinar o snapshot antigo em outra réplica.
      expect(settled).toBe(false)
    } finally {
      release.resolve()
    }
    await blocker
    expect(await changing).toBe(true)
  })

  test('falha no insert de auditoria reverte também a elevação de modo', async () => {
    const target = newUser('audit-target@example.com')
    const actor = newUser('audit-actor@example.com')
    await users.create(target)
    await users.create(actor)
    const id = randomUUID()
    const familyId = randomUUID()
    const auditId = randomUUID()
    const raw = `refresh-${id}`
    await refreshTokens.create({
      id,
      userId: target.id,
      familyId,
      tokenHash: sha256Hex(raw),
      expiresAt: new Date(Date.now() + 60_000),
      impersonatorUserId: actor.id,
    })
    await conn.sql`
      insert into auth.audit_logs
        (id, actor_id, impersonator_id, action, method, path, status)
      values
        (${auditId}, ${target.id}, ${actor.id}, 'fixture', 'POST', '/fixture', 200)`

    await expect(
      refreshTokens.setImpersonationMode(id, familyId, true, {
        id: auditId,
        actorId: target.id,
        impersonatorId: actor.id,
        action: 'auth.impersonation.mode.write',
        method: 'POST',
        path: '/auth/impersonate/mode',
        status: 200,
      }),
    ).rejects.toThrow()
    expect((await refreshTokens.findByHash(sha256Hex(raw)))?.impersonationWritable).toBe(false)
  })

  test('família revogada não aceita sucessor criado depois do logout', async () => {
    const user = newUser('family-revoke@example.com')
    await users.create(user)
    const familyId = randomUUID()
    const firstId = randomUUID()
    const expiresAt = new Date(Date.now() + 60_000)
    expect(
      await refreshTokens.create({
        id: firstId,
        userId: user.id,
        familyId,
        tokenHash: sha256Hex(`refresh-${firstId}`),
        expiresAt,
      }),
    ).toBeTrue()
    expect(await refreshTokens.claimForRotation(firstId, new Date())).toBeTrue()

    await refreshTokens.revokeFamily(familyId)
    expect(
      await refreshTokens.create({
        id: randomUUID(),
        userId: user.id,
        familyId,
        tokenHash: sha256Hex(`successor-${firstId}`),
        expiresAt,
      }),
    ).toBeFalse()
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
    const expiredRefreshId = randomUUID()
    const expiredFamilyId = randomUUID()
    await refreshTokens.create({
      id: expiredRefreshId,
      userId: user.id,
      familyId: expiredFamilyId,
      tokenHash: sha256Hex('refresh-velho'),
      expiresAt: future,
    })
    // O port não aceita criar credencial já vencida; envelhece as duas linhas no
    // banco para exercitar a purga real de token + família órfã.
    await conn.sql`update auth.refresh_tokens set expires_at = ${past.toISOString()} where id = ${expiredRefreshId}`
    await conn.sql`update auth.refresh_token_families set expires_at = ${past.toISOString()} where id = ${expiredFamilyId}`

    // lastIssuedAt enxerga a emissão mais recente (consumida ou não).
    expect(await resetTokens.lastIssuedAt(user.id)).not.toBeNull()
    expect(await otpCodes.lastIssuedAt(user.id, 'sign_in')).not.toBeNull()
    expect(await otpCodes.lastIssuedAt(user.id, 'password_reset')).toBeNull()

    const cutoff = new Date()
    expect(await resetTokens.deleteExpired(cutoff)).toBe(1) // só o vencido
    expect(await otpCodes.deleteExpired(cutoff)).toBe(1)
    expect(await refreshTokens.deleteExpired(cutoff)).toBe(1)
    const [families] =
      await conn.sql`select count(*)::int as count from auth.refresh_token_families where id = ${expiredFamilyId}`
    expect(families?.count).toBe(0)
    // O token vivo sobreviveu.
    expect(await resetTokens.findByHash(sha256Hex('reset-vivo'))).not.toBeNull()
  })
})
