import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { rejects } from 'node:assert/strict'
import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { sha256Hex } from '@sistemazero/core/security'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { DesktopSessionService } from '../../src/application/desktop/desktop-session.service'
import { AuthTokenService } from '../../src/application/tokens/auth-token.service'
import type { AccessTokenClaims, TokenIssuer } from '../../src/domain/ports/token-issuer.port'
import { UserAggregate } from '../../src/domain/user/user.aggregate'
import { Email } from '../../src/domain/value-objects/email'
import {
  createDbConnection,
  type DbConnection,
} from '../../src/infrastructure/persistence/drizzle/db'
import { DrizzleDesktopSessionRepository } from '../../src/infrastructure/persistence/drizzle/desktop-session.repository'
import { DrizzleRefreshTokenRepository } from '../../src/infrastructure/persistence/drizzle/refresh-token.repository'
import { DrizzleUserRepository } from '../../src/infrastructure/persistence/drizzle/user.repository'
import { createJoseTokenIssuer } from '../../src/infrastructure/security/jose-token-issuer'
import { hs256Signing, TEST_AUDIENCE, TEST_ISSUER } from '../helpers'

const url = process.env.MARKETING_TEST_DATABASE_URL
const suite = url ? describe : describe.skip
suite('desktop: vínculo e revogação no PostgreSQL', () => {
  let connection: DbConnection,
    service: DesktopSessionService,
    repo: DrizzleDesktopSessionRepository,
    issuer: TokenIssuer,
    tokens: DrizzleRefreshTokenRepository
  let browser: AccessTokenClaims
  beforeAll(async () => {
    if (
      !url ||
      new URL(url).hostname !== '127.0.0.1' ||
      new URL(url).pathname !== '/marketing_review_tests'
    )
      throw new Error('Banco exclusivo de revisão obrigatório')
    connection = createDbConnection(url)
    await migrate(connection.db, {
      migrationsFolder: 'src/infrastructure/persistence/drizzle/migrations',
      migrationsTable: 'auth_migrations',
    })
    repo = new DrizzleDesktopSessionRepository(connection.db)
    const users = new DrizzleUserRepository(connection.db)
    tokens = new DrizzleRefreshTokenRepository(connection.db)
    issuer = createJoseTokenIssuer({
      signing: hs256Signing(),
      issuer: TEST_ISSUER,
      audience: TEST_AUDIENCE,
      accessTtlSeconds: 900,
      validateDesktopSession: (c) =>
        c.desktop ? repo.validate(c.desktop, c.sub, new Date()) : Promise.resolve(false),
    })
    const authTokens = new AuthTokenService(issuer, tokens, {
      refreshTtlDays: 30,
      impersonationRefreshTtlSeconds: 3600,
    })
    service = new DesktopSessionService(repo, users, authTokens)
    const user = UserAggregate.register({
      id: randomUUID(),
      email: Email.create(`desktop-${randomUUID()}@example.test`),
      passwordHash: 'not-a-real-password',
      firstName: 'Equipe',
      lastName: 'Teste',
      role: 'staff',
    })
    await users.create(user)
    const claims = await issuer.verifyAccessToken((await issuer.issueAccessToken(user)).token)
    if (!claims) throw new Error('Fixture de identidade inválida')
    browser = claims
  }, 30000) // A fresh database applies the complete Auth migration history before assertions.
  afterAll(async () => connection?.close())
  async function pairing() {
    const verifier = randomBytes(32).toString('base64url')
    const started = await service.start({
      label: 'Computador de revisão',
      challenge: createHash('sha256').update(verifier).digest('base64url'),
    })
    return { ...started, verifier }
  }
  async function connected() {
    const pending = await pairing()
    await service.approve(browser, pending.userCode)
    const value = await service.exchange(pending)
    if (value.status !== 'connected') throw new Error('Fixture de conexão inválida')
    return value
  }
  test('prova errada não consome e somente um resgate simultâneo emite sessão', async () => {
    const pending = await pairing()
    expect(await service.exchange(pending)).toEqual({ status: 'pending' })
    expect((await service.describe(browser, pending.userCode)).label).toBe('Computador de revisão')
    await service.approve(browser, pending.userCode)
    await rejects(() =>
      service.exchange({ ...pending, verifier: randomBytes(32).toString('base64url') }),
    )
    const results = await Promise.allSettled([service.exchange(pending), service.exchange(pending)])
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1)
    expect(results.filter((r) => r.status === 'rejected')).toHaveLength(1)
    await rejects(() => service.exchange(pending))
  })
  test('pedidos concorrentes preservam sessão e revogação derruba JWT vigente', async () => {
    const connectedDevice = await connected()
    const before = await repo.findByCredential(sha256Hex(connectedDevice.credential), new Date())
    const accesses = await Promise.all(
      Array.from({ length: 8 }, () => service.access(connectedDevice.credential)),
    )
    expect(accesses).toHaveLength(8)
    expect(
      (await repo.findByCredential(sha256Hex(connectedDevice.credential), new Date()))?.expiresAt,
    ).toEqual(before?.expiresAt)
    const claims = await issuer.verifyAccessToken(accesses[0]!.accessToken)
    expect(claims?.desktop?.deviceId).toBe(connectedDevice.deviceId)
    await service.revoke(browser, connectedDevice.deviceId)
    expect(await issuer.verifyAccessToken(accesses[0]!.accessToken)).toBeNull()
    await rejects(() => service.access(connectedDevice.credential))
  })
  test('logout de todas as sessões e expiração canônica incluem o desktop', async () => {
    const connectedDevice = await connected()
    expect(
      await repo.findByCredential(
        sha256Hex(connectedDevice.credential),
        new Date(Date.now() + 31 * 24 * 60 * 60 * 1000),
      ),
    ).toBeNull()
    await tokens.revokeAllForUser(browser.sub)
    await rejects(() => service.access(connectedDevice.credential))
    expect(await issuer.verifyAccessToken(connectedDevice.accessToken)).toBeNull()
  })
  test('conta alheia não revoga e códigos vencidos não conectam', async () => {
    const connectedDevice = await connected()
    expect(await repo.revoke(randomUUID(), connectedDevice.deviceId, new Date())).toBe(false)
    const p = await pairing()
    expect(
      await repo.consume(
        sha256Hex(p.deviceCode),
        createHash('sha256').update(p.verifier).digest('base64url'),
        sha256Hex(randomBytes(32).toString('hex')),
        new Date(Date.now() + 11 * 60 * 1000),
      ),
    ).toBeNull()
    expect(await issuer.verifyAccessToken(connectedDevice.accessToken)).not.toBeNull()
    await service.disconnect(connectedDevice.credential)
    await service.disconnect(connectedDevice.credential)
    await rejects(() => service.access(connectedDevice.credential))
  })
})
