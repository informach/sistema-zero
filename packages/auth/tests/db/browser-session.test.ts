import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { sha256Hex } from '@sistemazero/core/security'
import { eq } from 'drizzle-orm'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { Elysia } from 'elysia'
import { BrowserSessionService } from '../../src/application/browser/browser-session.service'
import { AuthTokenService } from '../../src/application/tokens/auth-token.service'
import { newParentKidsSession } from '../../src/domain/study-access/policy'
import { UserAggregate } from '../../src/domain/user/user.aggregate'
import { Email } from '../../src/domain/value-objects/email'
import { DrizzleBrowserSessionRepository } from '../../src/infrastructure/persistence/drizzle/browser-session.repository'
import {
  createDbConnection,
  type DbConnection,
} from '../../src/infrastructure/persistence/drizzle/db'
import { DrizzleRefreshTokenRepository } from '../../src/infrastructure/persistence/drizzle/refresh-token.repository'
import {
  browserSessions,
  refreshTokenFamilies,
  users as userRows,
} from '../../src/infrastructure/persistence/drizzle/schema'
import { DrizzleUserRepository } from '../../src/infrastructure/persistence/drizzle/user.repository'
import { browserRoutes } from '../../src/interfaces/http/routes/browser.routes'
import { testTokenIssuer } from '../helpers'

const url = process.env.TEST_DATABASE_URL
describe.skipIf(!url)('browser sessions: canonical revocation and concurrent BFF requests', () => {
  let connection: DbConnection,
    repository: DrizzleBrowserSessionRepository,
    refresh: DrizzleRefreshTokenRepository,
    users: DrizzleUserRepository,
    service: BrowserSessionService,
    tokens: AuthTokenService
  const issuer = testTokenIssuer()
  beforeAll(async () => {
    if (
      !url ||
      new URL(url).hostname !== '127.0.0.1' ||
      new URL(url).pathname !== '/marketing_review_tests'
    )
      throw new Error('Use the isolated native review test database')
    connection = createDbConnection(url)
    await migrate(connection.db, {
      migrationsFolder: 'src/infrastructure/persistence/drizzle/migrations',
      migrationsTable: 'auth_migrations',
    })
    repository = new DrizzleBrowserSessionRepository(connection.db)
    refresh = new DrizzleRefreshTokenRepository(connection.db)
    users = new DrizzleUserRepository(connection.db)
    tokens = new AuthTokenService(issuer, refresh, {
      refreshTtlDays: 30,
      impersonationRefreshTtlSeconds: 3600,
    })
    service = new BrowserSessionService(repository, users, tokens)
  }, 30000)
  afterAll(async () => connection?.close())
  async function fixture(role: 'staff' | 'customer' = 'staff') {
    const user = UserAggregate.register({
      id: randomUUID(),
      email: Email.create(`browser-${randomUUID()}@example.test`),
      passwordHash: 'synthetic-password-hash',
      firstName: 'Equipe',
      lastName: 'Revisão',
      role,
    })
    await users.create(user)
    return { user, login: await tokens.issueForUser(user) }
  }
  test('two service instances and late requests keep one stable deadline, only hashes persisted', async () => {
    const f = await fixture(),
      session = await service.exchange(f.login.refreshToken)
    const other = new BrowserSessionService(
      new DrizzleBrowserSessionRepository(connection.db),
      users,
      tokens,
    )
    const before = await repository.find(sha256Hex(session.credential), new Date())
    expect(before?.userId).toBe(f.user.id)
    expect((await refresh.findByHash(sha256Hex(f.login.refreshToken)))?.rotatedAt).not.toBeNull()
    const reads = await Promise.all(
      Array.from({ length: 16 }, (_, i) => (i % 2 ? other : service).access(session.credential)),
    )
    for (const access of reads)
      expect((await issuer.verifyAccessToken(access.accessToken))?.sub).toBe(f.user.id)
    await other.access(session.credential)
    expect((await repository.find(sha256Hex(session.credential), new Date()))?.expiresAt).toEqual(
      before?.expiresAt,
    )
    const stored = await connection.db
      .select()
      .from(browserSessions)
      .where(eq(browserSessions.userId, f.user.id))
    expect(stored).toHaveLength(1)
    expect(stored[0]?.credentialHash).toBe(sha256Hex(session.credential))
    expect(JSON.stringify(stored)).not.toContain(session.credential)
    await expect(service.exchange(f.login.refreshToken)).rejects.toThrow()
    // Failed conversion replay does not invalidate the already-created stable session.
    expect((await service.access(session.credential)).tokenType).toBe('Bearer')
  })
  test('only one concurrent exchange can consume the login token', async () => {
    const f = await fixture()
    const results = await Promise.allSettled([
      service.exchange(f.login.refreshToken),
      service.exchange(f.login.refreshToken),
    ])
    expect(results.filter((value) => value.status === 'fulfilled')).toHaveLength(1)
    expect(results.filter((value) => value.status === 'rejected')).toHaveLength(1)
  })
  test('disconnect, logout-all and expiration prevent new access without changing other sessions', async () => {
    const a = await fixture(),
      b = await fixture()
    const sa = await service.exchange(a.login.refreshToken),
      sb = await service.exchange(b.login.refreshToken)
    await service.disconnect(sa.credential)
    await service.disconnect(sa.credential)
    await expect(service.access(sa.credential)).rejects.toThrow()
    await service.access(sb.credential)
    await refresh.revokeAllForUser(b.user.id)
    await expect(service.access(sb.credential)).rejects.toThrow()
    const c = await fixture(),
      sc = await service.exchange(c.login.refreshToken)
    const stored = await repository.find(sha256Hex(sc.credential), new Date())
    if (!stored) throw new Error('Fixture')
    await connection.db
      .update(refreshTokenFamilies)
      .set({ expiresAt: new Date(0) })
      .where(eq(refreshTokenFamilies.id, stored.familyId))
    await expect(service.access(sc.credential)).rejects.toThrow()
  })
  test('customer, Kids, impersonation, expired and rotated refreshes cannot create browser sessions', async () => {
    const customer = await fixture('customer')
    await expect(service.exchange(customer.login.refreshToken)).rejects.toThrow()
    const f = await fixture()
    const kids = await tokens.issueForUser(f.user, newParentKidsSession())
    await expect(service.exchange(kids.refreshToken)).rejects.toThrow()
    const impersonated = await tokens.issueForUser(f.user, {
      impersonation: { actorId: randomUUID(), act: { sub: randomUUID() } },
    })
    await expect(service.exchange(impersonated.refreshToken)).rejects.toThrow()
    const expired = await fixture()
    const expiring = await refresh.findByHash(sha256Hex(expired.login.refreshToken))
    if (!expiring) throw new Error('Fixture')
    await connection.db
      .update(refreshTokenFamilies)
      .set({ expiresAt: new Date(0) })
      .where(eq(refreshTokenFamilies.id, expiring.familyId))
    await expect(service.exchange(expired.login.refreshToken)).rejects.toThrow()
    const profile = await tokens.issueForUser(f.user, {
      profile: {
        profileId: randomUUID(),
        claim: { accountId: f.user.id, name: 'Perfil' },
      },
    })
    await expect(service.exchange(profile.refreshToken)).rejects.toThrow()
    const prior = await refresh.findByHash(sha256Hex(f.login.refreshToken))
    if (!prior) throw new Error('Fixture')
    await refresh.claimForRotation(prior.id, new Date())
    await expect(service.exchange(f.login.refreshToken)).rejects.toThrow()
    await expect(service.access('invalid')).rejects.toThrow()
  })
  test('role/status changes are read from the canonical account on each issuance', async () => {
    const f = await fixture(),
      session = await service.exchange(f.login.refreshToken)
    await service.access(session.credential)
    await connection.db.update(userRows).set({ role: 'customer' }).where(eq(userRows.id, f.user.id))
    await expect(service.access(session.credential)).rejects.toThrow()
    await connection.db
      .update(userRows)
      .set({ role: 'staff', status: 'blocked' })
      .where(eq(userRows.id, f.user.id))
    await expect(service.access(session.credential)).rejects.toThrow()
  })
  test('family cleanup removes browser bindings; HTTP rejects malformed credentials', async () => {
    const f = await fixture(),
      session = await service.exchange(f.login.refreshToken)
    const stored = await repository.find(sha256Hex(session.credential), new Date())
    if (!stored) throw new Error('Fixture')
    const app = new Elysia().use(browserRoutes(service))
    const valid = await app.handle(
      new Request('http://localhost/auth/browser/session/access', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ credential: session.credential }),
      }),
    )
    expect(valid.status).toBe(200)
    expect(valid.headers.get('cache-control')).toBe('private, no-store')
    await connection.db
      .delete(refreshTokenFamilies)
      .where(eq(refreshTokenFamilies.id, stored.familyId))
    expect(await repository.find(sha256Hex(session.credential), new Date())).toBeNull()
    expect(
      await connection.db.select().from(browserSessions).where(eq(browserSessions.id, stored.id)),
    ).toHaveLength(0)
    const response = await app.handle(
      new Request('http://localhost/auth/browser/session/access', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ credential: 'invalid' }),
      }),
    )
    expect(response.status).toBe(422)
  })
})
