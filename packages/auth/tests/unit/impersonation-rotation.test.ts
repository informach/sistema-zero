import { describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { sha256Hex } from '@sistemazero/core/security'
import { RefreshService } from '../../src/application/refresh/refresh.service'
import { AuthTokenService } from '../../src/application/tokens/auth-token.service'
import { UserAggregate } from '../../src/domain/user/user.aggregate'
import { InvalidRefreshTokenError } from '../../src/domain/user/user.errors'
import { Email } from '../../src/domain/value-objects/email'
import {
  InMemoryRefreshTokenRepository,
  InMemoryUserRepository,
  silentLogger,
} from '../fakes/in-memory'
import { testTokenIssuer } from '../helpers'

const IMPERSONATION_TTL = 7200 // 2h — bem menor que os 30 dias da sessão normal

/**
 * O ponto mais sutil da impersonação: a rotação (/refresh) re-emite o access do
 * UserAggregate do ALVO — sem a re-derivação, a claim `act` se perderia e o TTL
 * curto esticaria de volta para 30 dias. O contexto vive na FAMÍLIA
 * (`impersonatorUserId`) e cada rotate o re-deriva.
 */
describe('Impersonação — emissão e rotação', () => {
  function setup() {
    const users = new InMemoryUserRepository()
    const refreshTokens = new InMemoryRefreshTokenRepository()
    const issuer = testTokenIssuer()
    const tokens = new AuthTokenService(issuer, refreshTokens, {
      refreshTtlDays: 30,
      impersonationRefreshTtlSeconds: IMPERSONATION_TTL,
    })
    const refresh = new RefreshService(users, refreshTokens, tokens, silentLogger)

    const target = UserAggregate.register({
      id: randomUUID(),
      email: Email.create('aluno@example.com'),
      passwordHash: 'hashed:x',
      firstName: 'Aluno',
      lastName: 'Teste',
    })
    const actor = UserAggregate.register({
      id: randomUUID(),
      email: Email.create('admin@example.com'),
      passwordHash: 'hashed:x',
      firstName: 'Admin',
      lastName: 'Suporte',
      role: 'admin',
    })
    users.seed(target)
    users.seed(actor)
    return { users, refreshTokens, issuer, tokens, refresh, target, actor }
  }

  const actOf = (actor: UserAggregate) => ({
    sub: actor.id,
    email: actor.email,
    name: actor.fullName,
  })

  test('emissão impersonada: claim act no access + TTL curto + família marcada', async () => {
    const { refreshTokens, issuer, tokens, target, actor } = setup()
    const issued = await tokens.issueForUser(target, {
      impersonatorUserId: actor.id,
      impersonatorAct: actOf(actor),
    })

    expect(issued.refreshExpiresIn).toBe(IMPERSONATION_TTL)
    const claims = await issuer.verifyAccessToken(issued.accessToken)
    expect(claims?.sub).toBe(target.id)
    expect(claims?.act).toMatchObject({ sub: actor.id, email: actor.email })

    const record = await refreshTokens.findByHash(sha256Hex(issued.refreshToken))
    expect(record?.impersonatorUserId).toBe(actor.id)
  })

  test('emissão NORMAL permanece intacta (sem act, TTL cheio, família limpa)', async () => {
    const { refreshTokens, issuer, tokens, target } = setup()
    const issued = await tokens.issueForUser(target)

    expect(issued.refreshExpiresIn).toBe(30 * 24 * 60 * 60)
    const claims = await issuer.verifyAccessToken(issued.accessToken)
    expect(claims?.act).toBeUndefined()
    const record = await refreshTokens.findByHash(sha256Hex(issued.refreshToken))
    expect(record?.impersonatorUserId).toBeNull()
  })

  test('rotação PRESERVA act e TTL curto (não estica de volta p/ 30 dias)', async () => {
    const { refreshTokens, issuer, refresh, tokens, target, actor } = setup()
    const issued = await tokens.issueForUser(target, {
      impersonatorUserId: actor.id,
      impersonatorAct: actOf(actor),
    })

    const rotated = await refresh.execute({ refreshToken: issued.refreshToken })
    expect(rotated.refreshExpiresIn).toBe(IMPERSONATION_TTL)
    const claims = await issuer.verifyAccessToken(rotated.accessToken)
    expect(claims?.sub).toBe(target.id)
    expect(claims?.act).toMatchObject({ sub: actor.id, email: actor.email, name: actor.fullName })

    // O novo refresh continua marcado — a 2ª rotação também preserva.
    const record = await refreshTokens.findByHash(sha256Hex(rotated.refreshToken))
    expect(record?.impersonatorUserId).toBe(actor.id)
    expect(record?.familyId).toBeDefined()

    const again = await refresh.execute({ refreshToken: rotated.refreshToken })
    expect(again.refreshExpiresIn).toBe(IMPERSONATION_TTL)
    expect((await issuer.verifyAccessToken(again.accessToken))?.act?.sub).toBe(actor.id)
  })

  test('ator removido/desativado → rotação revoga a família e nega', async () => {
    const { users, refreshTokens, refresh, tokens, target, actor } = setup()
    const issued = await tokens.issueForUser(target, {
      impersonatorUserId: actor.id,
      impersonatorAct: actOf(actor),
    })

    // O admin é suspenso depois de iniciar a sessão de suporte.
    actor.changeStatus('suspended')
    users.seed(actor)

    await expect(refresh.execute({ refreshToken: issued.refreshToken })).rejects.toBeInstanceOf(
      InvalidRefreshTokenError,
    )
    const record = await refreshTokens.findByHash(sha256Hex(issued.refreshToken))
    expect(record?.revokedAt).not.toBeNull()
  })
})
