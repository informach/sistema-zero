import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import { randomBytes, randomUUID } from 'node:crypto'
import path from 'node:path'
import { ForbiddenError, TooManyRequestsError } from '@sistemazero/core/http'
import { parseKidsSessionClaim, sha256Hex } from '@sistemazero/core/security'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { Elysia } from 'elysia'
import { decodeJwt } from 'jose'
import { ImpersonationSessionValidator } from '../../src/application/impersonation/impersonation-session-validator'
import { LogoutService } from '../../src/application/logout/logout.service'
import { RefreshService } from '../../src/application/refresh/refresh.service'
import { StudyAccessService } from '../../src/application/study-access/study-access.service'
import { AuthTokenService } from '../../src/application/tokens/auth-token.service'
import { ProfileAggregate } from '../../src/domain/profile/profile.aggregate'
import {
  DeviceOtherFamilyError,
  ParentReauthenticationRequiredError,
  StudyAccessRequiredError,
} from '../../src/domain/study-access/errors'
import { newParentKidsSession } from '../../src/domain/study-access/policy'
import { UserAggregate } from '../../src/domain/user/user.aggregate'
import { InvalidRefreshTokenError } from '../../src/domain/user/user.errors'
import { Email } from '../../src/domain/value-objects/email'
import {
  createDbConnection,
  type DbConnection,
} from '../../src/infrastructure/persistence/drizzle/db'
import { DrizzleProfileRepository } from '../../src/infrastructure/persistence/drizzle/profile.repository'
import { DrizzleRefreshTokenRepository } from '../../src/infrastructure/persistence/drizzle/refresh-token.repository'
import { profiles as profileRows } from '../../src/infrastructure/persistence/drizzle/schema'
import { DrizzleStudyAccessRepository } from '../../src/infrastructure/persistence/drizzle/study-access.repository'
import { DrizzleUserRepository } from '../../src/infrastructure/persistence/drizzle/user.repository'
import { createJoseTokenIssuer } from '../../src/infrastructure/security/jose-token-issuer'
import { buildErrorResponse } from '../../src/interfaces/http/error-handler'
import { studyAccessRoutes } from '../../src/interfaces/http/routes/study-access.routes'
import { silentLogger } from '../fakes/in-memory'
import { hs256Signing, TEST_AUDIENCE, TEST_ISSUER } from '../helpers'

const databaseUrl = process.env.TEST_DATABASE_URL
describe.skipIf(!databaseUrl)('Autorizações por aparelho no PostgreSQL real', () => {
  let conn: DbConnection
  let repository: DrizzleStudyAccessRepository
  let users: DrizzleUserRepository
  let profiles: DrizzleProfileRepository
  let refreshTokens: DrizzleRefreshTokenRepository
  let account: UserAggregate
  let andre: ProfileAggregate
  let debora: ProfileAggregate
  const deviceToken = randomBytes(32).toString('base64url')
  const deviceHash = sha256Hex(deviceToken)
  beforeAll(async () => {
    if (!databaseUrl) throw new Error('TEST_DATABASE_URL é obrigatório para esta suíte')
    if (!new URL(databaseUrl).pathname.includes('test'))
      throw new Error('Use banco dedicado de teste')
    conn = createDbConnection(databaseUrl, { max: 8 })
    await conn.sql`set client_min_messages = warning`
    await migrate(conn.db, {
      migrationsFolder: path.join(
        import.meta.dir,
        '../../src/infrastructure/persistence/drizzle/migrations',
      ),
      migrationsTable: 'auth_migrations',
      migrationsSchema: 'drizzle',
    })
    repository = new DrizzleStudyAccessRepository(conn.db)
    users = new DrizzleUserRepository(conn.db)
    profiles = new DrizzleProfileRepository(conn.db)
    refreshTokens = new DrizzleRefreshTokenRepository(conn.db)
  })
  afterAll(async () => {
    await conn?.close()
  })
  beforeEach(async () => {
    await conn.sql`truncate auth.users, auth.profiles, auth.refresh_tokens, auth.refresh_token_families, auth.study_attempts cascade`
    account = UserAggregate.register({
      id: randomUUID(),
      email: Email.create('familia@example.com'),
      passwordHash: 'unused-test-hash',
      firstName: 'Helena',
      lastName: 'Teste',
      role: 'admin',
    })
    await users.create(account)
    andre = ProfileAggregate.create({
      birthDate: '2016-05-10',
      id: randomUUID(),
      accountUserId: account.id,
      name: 'André',
    })
    debora = ProfileAggregate.create({
      birthDate: '2016-05-10',
      id: randomUUID(),
      accountUserId: account.id,
      name: 'Débora',
    })
    await conn.db.insert(profileRows).values({ ...andre.toSnapshot(), admissionState: 'ready' })
    await conn.db.insert(profileRows).values({ ...debora.toSnapshot(), admissionState: 'ready' })
  })
  function services() {
    const issuer = createJoseTokenIssuer({
      signing: hs256Signing(),
      issuer: TEST_ISSUER,
      audience: TEST_AUDIENCE,
      accessTtlSeconds: 900,
      validateKidsSession: (claims) =>
        claims.kids
          ? repository.validateSession(
              claims.kids,
              claims.pfl?.accountId ?? claims.sub,
              claims.pfl ? claims.sub : null,
              new Date(),
            )
          : Promise.resolve(false),
    })
    const tokens = new AuthTokenService(issuer, refreshTokens, {
      refreshTtlDays: 30,
      impersonationRefreshTtlSeconds: 7200,
    })
    return {
      issuer,
      tokens,
      service: new StudyAccessService(repository, profiles, users, tokens),
      refresh: new RefreshService(
        users,
        refreshTokens,
        tokens,
        profiles,
        new ImpersonationSessionValidator(users),
        silentLogger,
        repository,
      ),
    }
  }
  async function parentClaims(authenticatedAt = Math.floor(Date.now() / 1000)) {
    const { tokens, issuer } = services()
    const login = await tokens.issueForUser(account, {
      kids: { kind: 'parent', sessionId: randomUUID(), authenticatedAt },
    })
    const claims = await issuer.verifyAccessToken(login.accessToken)
    if (!claims) throw new Error('Sessão adulta ausente')
    return claims
  }
  async function grant(profileId = andre.id, hash = deviceHash) {
    const now = new Date()
    const result = await repository.createGrant({
      accountUserId: account.id,
      profileId,
      deviceHash: hash,
      label: 'Computador de casa',
      expiresAt: new Date(now.getTime() + 90 * 86400000),
      now,
    })
    if (!result) throw new Error('Falha ao preparar autorização do teste')
    return result
  }
  async function code() {
    const now = new Date()
    const codeHash = sha256Hex(randomUUID())
    await repository.createCode({
      id: randomUUID(),
      codeHash,
      accountUserId: account.id,
      profileId: andre.id,
      label: 'Notebook',
      durationDays: 90,
      expiresAt: new Date(now.getTime() + 600000),
    })
    return { codeHash, now }
  }
  test('um único navegador ganha o código em resgates concorrentes', async () => {
    const input = await code()
    const results = await Promise.all([
      repository.redeemCode({ ...input, deviceHash }),
      repository.redeemCode({ ...input, deviceHash: sha256Hex('outro navegador') }),
    ])
    expect(results.filter(Boolean)).toHaveLength(1)
    expect(await repository.listGrants(account.id)).toHaveLength(1)
  })
  test('retry no mesmo navegador recupera a autorização sem estender o prazo', async () => {
    const input = { ...(await code()), deviceHash }
    const first = await repository.redeemCode(input)
    const retry = await repository.redeemCode({
      ...input,
      now: new Date(input.now.getTime() + 5000),
    })
    expect(retry?.id).toBe(first?.id)
    expect(retry?.expiresAt).toEqual(first?.expiresAt)
  })
  test('código de outro perfil não é consumido nem abre silenciosamente o irmão', async () => {
    const input = { ...(await code()), deviceHash }
    expect(await repository.redeemCode({ ...input, expectedProfileId: debora.id })).toBeNull()
    expect(await repository.redeemCode({ ...input, expectedProfileId: andre.id })).not.toBeNull()
  })
  test('autorizar um irmão não libera o outro e revogar não afeta outro navegador', async () => {
    const current = await grant()
    const otherHash = sha256Hex('segundo aparelho')
    await grant(andre.id, otherHash)
    expect(await repository.activate(deviceHash, debora.id, randomUUID(), new Date())).toBeNull()
    await grant(debora.id)
    await repository.revoke(account.id, current.id, new Date())
    expect(await repository.activate(deviceHash, andre.id, randomUUID(), new Date())).toBeNull()
    expect(
      await repository.activate(deviceHash, debora.id, randomUUID(), new Date()),
    ).not.toBeNull()
    expect(await repository.activate(otherHash, andre.id, randomUUID(), new Date())).not.toBeNull()
  })
  test('JWT ainda válido perde acesso imediatamente após revogação e não renova', async () => {
    const current = await grant()
    const { service, issuer, refresh } = services()
    const entered = await service.enter({ deviceToken, profileId: andre.id })
    expect((await issuer.verifyAccessToken(entered.tokens.accessToken))?.kids?.kind).toBe('student')
    // A conta do teste é da equipe (admin): o aluno conserva o papel para testar os jogos.
    expect(decodeJwt(entered.tokens.accessToken).role).toBe('admin')
    await repository.revoke(account.id, current.id, new Date())
    expect(await issuer.verifyAccessToken(entered.tokens.accessToken)).toBeNull()
    const error = await refresh.execute({ refreshToken: entered.tokens.refreshToken }).then(
      () => null,
      (error: unknown) => error,
    )
    expect(error).toBeInstanceOf(InvalidRefreshTokenError)
  })
  test('trocar para um irmão invalida a sessão anterior, inclusive access ainda não expirado', async () => {
    await grant()
    await grant(debora.id)
    const { service, issuer } = services()
    const first = await service.enter({ deviceToken, profileId: andre.id })
    const second = await service.enter({ deviceToken, profileId: debora.id })
    expect(await issuer.verifyAccessToken(first.tokens.accessToken)).toBeNull()
    expect((await issuer.verifyAccessToken(second.tokens.accessToken))?.sub).toBe(debora.id)
  })
  test('refresh preserva contexto e deadline, mesmo após prazos longos', async () => {
    const authorization = await grant()
    const { service, issuer, refresh } = services()
    const first = await service.enter({ deviceToken, profileId: andre.id })
    const rotated = await refresh.execute({ refreshToken: first.tokens.refreshToken })
    const claims = await issuer.verifyAccessToken(rotated.accessToken)
    expect(claims?.kids).toEqual(
      parseKidsSessionClaim(decodeJwt(first.tokens.accessToken).kids) ?? undefined,
    )
    const record = await refreshTokens.findByHash(sha256Hex(rotated.refreshToken))
    expect(record?.familyExpiresAt).toEqual(authorization.expiresAt)
  })
  test('esquecer um navegador encerra seus irmãos sem atingir outro aparelho nem apagar perfis', async () => {
    await grant()
    await grant(debora.id)
    const otherToken = randomBytes(32).toString('base64url')
    await grant(andre.id, sha256Hex(otherToken))
    const { service, issuer } = services()
    const first = await service.enter({ deviceToken, profileId: andre.id })
    const other = await service.enter({ deviceToken: otherToken, profileId: andre.id })
    const parent = await parentClaims()
    await service.forgetDevice(parent, deviceToken)
    await service.forgetDevice(parent, deviceToken)
    expect(await issuer.verifyAccessToken(first.tokens.accessToken)).toBeNull()
    expect((await issuer.verifyAccessToken(other.tokens.accessToken))?.sub).toBe(andre.id)
    expect((await service.recognize(deviceToken)).profiles).toEqual([])
    expect(await profiles.listActiveByAccount(account.id)).toHaveLength(2)
  })
  test('perfil arquivado nunca se transforma em sessão adulta', async () => {
    await grant()
    const { service, issuer, refresh } = services()
    const first = await service.enter({ deviceToken, profileId: andre.id })
    await conn.sql`update auth.profiles set status = 'archived' where id = ${andre.id}`
    expect(await issuer.verifyAccessToken(first.tokens.accessToken)).toBeNull()
    const error = await refresh.execute({ refreshToken: first.tokens.refreshToken }).then(
      () => null,
      (error: unknown) => error,
    )
    expect(error).toBeInstanceOf(InvalidRefreshTokenError)
  })
  test('logout adulto invalida o access, e authTime não muda no refresh', async () => {
    const { tokens, issuer, refresh } = services()
    const parent = {
      kind: 'parent' as const,
      sessionId: randomUUID(),
      authenticatedAt: Math.floor(Date.now() / 1000),
    }
    const login = await tokens.issueForUser(account, { kids: parent })
    const rotated = await refresh.execute({ refreshToken: login.refreshToken })
    expect((await issuer.verifyAccessToken(rotated.accessToken))?.kids).toEqual(parent)
    await refreshTokens.revokeFamily(parent.sessionId)
    expect(await issuer.verifyAccessToken(rotated.accessToken)).toBeNull()
  })
  test('tentativas são limitadas atomicamente entre requisições concorrentes', async () => {
    const now = new Date()
    const results = await Promise.all(
      Array.from({ length: 20 }, () => repository.takeAttempt(sha256Hex('mesmo ip'), now)),
    )
    expect(results.filter(Boolean)).toHaveLength(10)
    expect(
      await repository.takeAttempt(sha256Hex('mesmo ip'), new Date(now.getTime() + 600001)),
    ).toBe(true)
  })
  test('outro responsável não renova ou revoga autorizações desta família', async () => {
    const current = await grant()
    expect(
      await repository.renew(randomUUID(), current.id, new Date(Date.now() + 100000), new Date()),
    ).toBe(false)
    expect(await repository.revoke(randomUUID(), current.id, new Date())).toBe(false)
  })
  test('vencimento exige renovação; renovar não reabre família expirada nem autorização revogada', async () => {
    const authorization = await grant()
    const { service, issuer } = services()
    const first = await service.enter({ deviceToken, profileId: andre.id })
    const claims = await issuer.verifyAccessToken(first.tokens.accessToken)
    if (!claims?.kids) throw new Error('Sessão ausente')
    await conn.sql`update auth.study_grants set expires_at = now() - interval '1 second' where id = ${authorization.id}`
    await conn.sql`update auth.refresh_token_families set expires_at = now() - interval '1 second' where id = ${claims.kids.sessionId}`
    expect(await issuer.verifyAccessToken(first.tokens.accessToken)).toBeNull()
    // Sem acesso vivo o navegador volta a ser desconhecido (a tela pede código).
    expect((await service.recognize(deviceToken)).profiles).toEqual([])
    expect(
      await repository.renew(
        account.id,
        authorization.id,
        new Date(Date.now() + 7 * 86400000),
        new Date(),
      ),
    ).toBe(true)
    expect(await issuer.verifyAccessToken(first.tokens.accessToken)).toBeNull()
    const renewed = await service.enter({ deviceToken, profileId: andre.id })
    expect((await issuer.verifyAccessToken(renewed.tokens.accessToken))?.sub).toBe(andre.id)
    await repository.revoke(account.id, authorization.id, new Date())
    expect(
      await repository.renew(
        account.id,
        authorization.id,
        new Date(Date.now() + 7 * 86400000),
        new Date(),
      ),
    ).toBe(false)
  })
  test('nova autorização preserva todo o prazo mesmo em navegador cadastrado há quase um ano', async () => {
    await grant()
    const now = new Date()
    await conn.sql`update auth.study_devices set expires_at = now() + interval '1 day' where token_hash = ${deviceHash}`
    const renewed = await repository.redeemCode({ ...(await code()), deviceHash })
    expect(renewed).not.toBeNull()
    const device = await repository.getDevice(deviceHash, now)
    expect(device!.expiresAt.getTime()).toBeGreaterThanOrEqual(renewed!.expiresAt.getTime())
  })
  test('novo código recupera aparelho expirado sem reabrir a sessão ou os irmãos antigos', async () => {
    await grant()
    await grant(debora.id)
    const { service, issuer } = services()
    const oldSession = await service.enter({ deviceToken, profileId: debora.id })
    await conn.sql`update auth.study_devices set expires_at = now() - interval '1 second' where token_hash = ${deviceHash}`
    expect((await service.recognize(deviceToken)).profiles).toEqual([])
    const authorization = await repository.redeemCode({ ...(await code()), deviceHash })
    expect(authorization).not.toBeNull()
    expect(await issuer.verifyAccessToken(oldSession.tokens.accessToken)).toBeNull()
    const view = await service.recognize(deviceToken)
    expect(view.profiles.find((profile) => profile.id === andre.id)?.available).toBe(true)
    expect(view.profiles.find((profile) => profile.id === debora.id)?.available).toBe(false)
  })
  test('HTTP real valida sessão e escopo adulto antes de alterar autorizações', async () => {
    const { service, tokens, issuer } = services()
    const login = await tokens.issueForUser(account, {
      kids: {
        kind: 'parent',
        sessionId: randomUUID(),
        authenticatedAt: Math.floor(Date.now() / 1000),
      },
    })
    const app = new Elysia()
      .onError(({ code, error, set }) => {
        const response = buildErrorResponse({ code, error, logger: silentLogger })
        set.status = response.status
        return response.body
      })
      .use(
        studyAccessRoutes({ service, tokenIssuer: issuer, trustProxy: false, trustedProxyHops: 1 }),
      )
      .compile()
    const request = (path: string, token: string, body?: unknown, method = 'POST') =>
      app.handle(
        new Request(`http://localhost/auth/kids${path}`, {
          method,
          headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
          ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        }),
      )
    const created = await request('/grants', login.accessToken, {
      profileId: andre.id,
      label: 'Computador',
      durationDays: 30,
      mode: 'current',
      deviceToken,
    })
    expect(created.status).toBe(200)
    const grants = await repository.listGrants(account.id, andre.id)
    const authorization = grants[0]
    if (!authorization) throw new Error('Autorização ausente')
    const child = await service.enter({ deviceToken, profileId: andre.id })
    expect((await request('/session/validate', child.tokens.accessToken)).status).toBe(200)
    expect(
      (await request('/grants/list', child.tokens.accessToken, { profileId: andre.id })).status,
    ).toBe(403)
    expect(
      (
        await request('/grants', login.accessToken, {
          profileId: randomUUID(),
          label: 'Computador',
          durationDays: 30,
          mode: 'current',
          deviceToken,
        })
      ).status,
    ).toBe(403)
    expect(
      (
        await request(
          `/grants/${authorization.id}`,
          login.accessToken,
          { action: 'revoke' },
          'PATCH',
        )
      ).status,
    ).toBe(200)
    const revoked = await request('/session/validate', child.tokens.accessToken)
    expect(revoked.status).toBe(401)
    // Código próprio: o BFF só desloga a criança com ele (não com um 401 do Gateway).
    expect(((await revoked.json()) as { error: { code: string } }).error.code).toBe(
      'KIDS_SESSION_INVALID',
    )
    const stale = await tokens.issueForUser(account, {
      kids: {
        kind: 'parent',
        sessionId: randomUUID(),
        authenticatedAt: Math.floor(Date.now() / 1000) - 901,
      },
    })
    expect(
      (
        await request('/grants', stale.accessToken, {
          profileId: andre.id,
          label: 'Computador',
          durationDays: 30,
          mode: 'current',
          deviceToken,
        })
      ).status,
    ).toBe(403)
  })
  async function otherFamily() {
    const other = UserAggregate.register({
      id: randomUUID(),
      email: Email.create('outra-familia@example.com'),
      passwordHash: 'unused-test-hash',
      firstName: 'Outra',
      lastName: 'Família',
      role: 'customer',
    })
    await users.create(other)
    const primo = ProfileAggregate.create({
      birthDate: '2016-05-10',
      id: randomUUID(),
      accountUserId: other.id,
      name: 'Primo',
    })
    await conn.db.insert(profileRows).values({ ...primo.toSnapshot(), admissionState: 'ready' })
    const codeHash = sha256Hex(randomUUID())
    await repository.createCode({
      id: randomUUID(),
      codeHash,
      accountUserId: other.id,
      profileId: primo.id,
      label: 'Casa da Outra Família',
      durationDays: 30,
      expiresAt: new Date(Date.now() + 600000),
    })
    return { other, primo, codeHash }
  }
  const errorOf = (promise: Promise<unknown>) =>
    promise.then(
      () => null,
      (error: unknown) => error,
    )

  test('reautorizar o mesmo perfil conserva id e criação; a sessão encerrada não volta', async () => {
    const first = await grant()
    const { service, issuer, refresh } = services()
    const session = await service.enter({ deviceToken, profileId: andre.id })
    expect(await repository.revoke(account.id, first.id, new Date())).toBe(true)
    // O encerramento derruba a FAMÍLIA na hora, não só a validação da autorização.
    const [family] = await conn.sql`select revoked_at from auth.refresh_token_families
      where id = ${(decodeJwt(session.tokens.accessToken).kids as { sessionId: string }).sessionId}`
    expect(family?.revoked_at).not.toBeNull()
    const again = await grant()
    expect(again.id).toBe(first.id)
    expect(again.createdAt).toEqual(first.createdAt)
    expect(again.revokedAt).toBeNull()
    expect(await issuer.verifyAccessToken(session.tokens.accessToken)).toBeNull()
    expect(
      await errorOf(refresh.execute({ refreshToken: session.tokens.refreshToken })),
    ).toBeInstanceOf(InvalidRefreshTokenError)
  })

  test('repetir o código depois de reautorizar o mesmo navegador recupera a mesma autorização', async () => {
    const input = { ...(await code()), deviceHash }
    const first = await repository.redeemCode(input)
    await grant()
    expect((await repository.redeemCode(input))?.id).toBe(first?.id)
  })

  test('navegador com acesso vivo de outra família recusa o código com erro próprio, sem consumi-lo', async () => {
    const own = await grant()
    const { other, primo, codeHash } = await otherFamily()
    expect(
      await errorOf(repository.redeemCode({ codeHash, deviceHash, now: new Date() })),
    ).toBeInstanceOf(DeviceOtherFamilyError)
    const [row] =
      await conn.sql`select consumed_at from auth.study_codes where code_hash = ${codeHash}`
    expect(row?.consumed_at).toBeNull()
    // Mutação "sem conferir a família": a outra família ganharia uma autorização aqui.
    expect(await repository.listGrants(other.id, primo.id)).toHaveLength(0)
    expect((await repository.listGrants(account.id, andre.id))[0]?.revokedAt).toBeNull()
    expect((await repository.getDevice(deviceHash, new Date()))?.accountUserId).toBe(account.id)
    // O "Liberar este computador" da outra família obedece à mesma regra.
    expect(
      await errorOf(
        repository.createGrant({
          accountUserId: other.id,
          profileId: primo.id,
          deviceHash,
          label: 'Casa',
          expiresAt: new Date(Date.now() + 86400000),
          now: new Date(),
        }),
      ),
    ).toBeInstanceOf(DeviceOtherFamilyError)
    expect(own.id).toBeDefined()
  })

  test('sem acesso vivo da família anterior, o código de outra família religa o navegador', async () => {
    const own = await grant()
    const { service, issuer } = services()
    const oldSession = await service.enter({ deviceToken, profileId: andre.id })
    await conn.sql`update auth.study_grants set expires_at = now() - interval '1 second' where id = ${own.id}`
    const { other, primo, codeHash } = await otherFamily()
    const redeemed = await repository.redeemCode({ codeHash, deviceHash, now: new Date() })
    expect(redeemed?.profileId).toBe(primo.id)
    expect((await repository.getDevice(deviceHash, new Date()))?.accountUserId).toBe(other.id)
    // A família anterior perde a sessão e as autorizações antigas não podem ser renovadas.
    expect(await issuer.verifyAccessToken(oldSession.tokens.accessToken)).toBeNull()
    expect(
      await repository.renew(account.id, own.id, new Date(Date.now() + 86400000), new Date()),
    ).toBe(false)
    expect((await service.recognize(deviceToken)).profiles.map((p) => p.name)).toEqual(['Primo'])
  })

  test('navegador sem nenhuma autorização viva é desconhecido; com uma viva lista os irmãos', async () => {
    const own = await grant()
    const { service } = services()
    const view = await service.recognize(deviceToken)
    expect(view.profiles.map((p) => [p.name, p.available]).sort()).toEqual([
      ['André', true],
      ['Débora', false],
    ])
    await repository.revoke(account.id, own.id, new Date())
    expect((await service.recognize(deviceToken)).profiles).toEqual([])
    await grant(debora.id)
    await conn.sql`update auth.study_grants set expires_at = now() - interval '1 second' where profile_id = ${debora.id}`
    expect((await service.recognize(deviceToken)).profiles).toEqual([])
  })

  test('sair com todas as sessões a partir do ALUNO não derruba o responsável', async () => {
    await grant()
    const { service, issuer, tokens } = services()
    const parent = await tokens.issueForUser(account, newParentKidsSession())
    const child = await service.enter({ deviceToken, profileId: andre.id })
    await new LogoutService(refreshTokens).execute({
      refreshToken: child.tokens.refreshToken,
      allSessions: true,
    })
    expect(await issuer.verifyAccessToken(child.tokens.accessToken)).toBeNull()
    expect((await issuer.verifyAccessToken(parent.accessToken))?.kids?.kind).toBe('parent')
    // O responsável continua podendo encerrar todas as sessões da conta.
    await new LogoutService(refreshTokens).execute({
      refreshToken: parent.refreshToken,
      allSessions: true,
    })
    expect(await issuer.verifyAccessToken(parent.accessToken)).toBeNull()
  })

  test('sessão adulta do Kids vence em 12 horas e a renovação não desliza o prazo', async () => {
    const { tokens, refresh } = services()
    const login = await tokens.issueForUser(account, newParentKidsSession())
    expect(login.refreshExpiresIn).toBeLessThanOrEqual(12 * 3600)
    const before = await refreshTokens.findByHash(sha256Hex(login.refreshToken))
    const rotated = await refresh.execute({ refreshToken: login.refreshToken })
    const after = await refreshTokens.findByHash(sha256Hex(rotated.refreshToken))
    expect(after?.familyExpiresAt).toEqual(before?.familyExpiresAt)
    expect(rotated.refreshExpiresIn).toBeLessThanOrEqual(login.refreshExpiresIn)
  })

  test('token do aluno não leva a identidade do responsável; cliente vira customer', async () => {
    await conn.sql`update auth.users set role = 'customer' where id = ${account.id}`
    await grant()
    const { service, issuer } = services()
    const entered = await service.enter({ deviceToken, profileId: andre.id })
    const payload = decodeJwt(entered.tokens.accessToken)
    expect(payload.role).toBe('customer')
    for (const field of ['email', 'firstName', 'lastName', 'phone', 'signupSource'])
      expect(payload[field]).toBeUndefined()
    expect(payload.pfl).toMatchObject({ accountId: account.id, name: 'André' })
    expect((await issuer.verifyAccessToken(entered.tokens.accessToken))?.sub).toBe(andre.id)
  })

  test('esquecer o navegador exige responsável recente da própria família', async () => {
    await grant()
    const { service } = services()
    const child = await service.enter({ deviceToken, profileId: andre.id })
    const childClaims = await services().issuer.verifyAccessToken(child.tokens.accessToken)
    if (!childClaims) throw new Error('Sessão infantil ausente')
    expect(await errorOf(service.forgetDevice(childClaims, deviceToken))).toBeInstanceOf(
      ForbiddenError,
    )
    expect(
      await errorOf(
        service.forgetDevice(await parentClaims(Math.floor(Date.now() / 1000) - 901), deviceToken),
      ),
    ).toBeInstanceOf(ParentReauthenticationRequiredError)
    const { other } = await otherFamily()
    const { tokens, issuer } = services()
    const outsider = await issuer.verifyAccessToken(
      (await tokens.issueForUser(other, newParentKidsSession())).accessToken,
    )
    if (!outsider) throw new Error('Sessão adulta ausente')
    expect(await errorOf(service.forgetDevice(outsider, deviceToken))).toBeInstanceOf(
      DeviceOtherFamilyError,
    )
    expect((await service.recognize(deviceToken)).profiles).not.toEqual([])
    await service.forgetDevice(await parentClaims(), deviceToken)
    expect((await service.recognize(deviceToken)).profiles).toEqual([])
  })

  test('resgate pelo serviço: normaliza, guarda só o hash e só as FALHAS contam no limite', async () => {
    const { service } = services()
    const parent = await parentClaims()
    const ip = '203.0.113.7'
    // Sucessos e a repetição idempotente da mesma tentativa nunca bloqueiam o IP.
    for (let i = 0; i < 12; i++) {
      const created = (await service.create(parent, {
        profileId: andre.id,
        label: 'Notebook',
        durationDays: 7,
        mode: 'code',
      })) as { code: string }
      const [stored] =
        await conn.sql`select code_hash from auth.study_codes order by created_at desc limit 1`
      expect(stored?.code_hash).toBe(sha256Hex(created.code.replace('-', '')))
      const typed = ` ${created.code.toLowerCase().replace('-', ' ')} `
      expect((await service.redeem({ code: typed, deviceToken, ip })).profileId).toBe(andre.id)
      expect((await service.redeem({ code: typed, deviceToken, ip })).profileId).toBe(andre.id)
      // A emissão também tem limite por conta: o teste não o mede aqui.
      await conn.sql`delete from auth.study_attempts where key_hash = ${sha256Hex(`issue:${account.id}`)}`
    }
    // Dez falhas esgotam o IP; depois disso até um código certo espera a janela.
    for (let i = 0; i < 10; i++)
      expect(
        await errorOf(service.redeem({ code: 'ZZZZZ-ZZZZZ', deviceToken, ip })),
      ).toBeInstanceOf(StudyAccessRequiredError)
    const created = (await service.create(parent, {
      profileId: debora.id,
      label: 'Notebook',
      durationDays: 7,
      mode: 'code',
    })) as { code: string }
    expect(await errorOf(service.redeem({ code: created.code, deviceToken, ip }))).toBeInstanceOf(
      TooManyRequestsError,
    )
    expect(
      (await service.redeem({ code: created.code, deviceToken, ip: '203.0.113.8' })).profileId,
    ).toBe(debora.id)
  })

  test('purga repete os lotes até esvaziar, respeita o teto e a retenção das autorizações', async () => {
    const small = new DrizzleStudyAccessRepository(conn.db, {
      purgeBatchSize: 2,
      purgeMaxBatches: 50,
    })
    for (let i = 0; i < 7; i++)
      await repository.createCode({
        id: randomUUID(),
        codeHash: sha256Hex(randomUUID()),
        accountUserId: account.id,
        profileId: andre.id,
        label: 'Velho',
        durationDays: 7,
        expiresAt: new Date(Date.now() - 10 * 86400000),
      })
    const fresh = await grant()
    const oldRevoked = await grant(debora.id)
    await conn.sql`update auth.study_grants set revoked_at = now() - interval '91 days' where id = ${oldRevoked.id}`
    const otherHash = sha256Hex('navegador-antigo')
    const oldExpired = await grant(andre.id, otherHash)
    await conn.sql`update auth.study_grants set expires_at = now() - interval '91 days' where id = ${oldExpired.id}`
    const recentRevoked = await grant(debora.id, otherHash)
    await conn.sql`update auth.study_grants set revoked_at = now() - interval '10 days' where id = ${recentRevoked.id}`
    const now = Date.now()
    const result = await small.deleteExpired(
      new Date(now - 7 * 86400000),
      new Date(now - 90 * 86400000),
    )
    expect(result.codes).toBe(7)
    expect(result.grants).toBe(2)
    const left = (await conn.sql`select id from auth.study_grants`).map((r) => r.id).sort()
    expect(left).toEqual([fresh.id, recentRevoked.id].sort())
    // Com teto de lotes, o resto fica para o ciclo seguinte.
    for (let i = 0; i < 5; i++)
      await repository.createCode({
        id: randomUUID(),
        codeHash: sha256Hex(randomUUID()),
        accountUserId: account.id,
        profileId: andre.id,
        label: 'Velho',
        durationDays: 7,
        expiresAt: new Date(now - 10 * 86400000),
      })
    const capped = new DrizzleStudyAccessRepository(conn.db, {
      purgeBatchSize: 2,
      purgeMaxBatches: 1,
    })
    expect(
      (await capped.deleteExpired(new Date(now - 7 * 86400000), new Date(now - 90 * 86400000)))
        .codes,
    ).toBe(2)
  })
})
