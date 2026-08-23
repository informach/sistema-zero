import { describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { sha256Hex } from '@sistemazero/core/security'
import { ImpersonationSessionValidator } from '../../src/application/impersonation/impersonation-session-validator'
import { ExitProfileSessionService } from '../../src/application/profiles/exit-profile-session.service'
import { SelectProfileService } from '../../src/application/profiles/select-profile.service'
import { AuthTokenService } from '../../src/application/tokens/auth-token.service'
import { ProfileAggregate } from '../../src/domain/profile/profile.aggregate'
import { UserAggregate } from '../../src/domain/user/user.aggregate'
import { InvalidRefreshTokenError, UserNotActiveError } from '../../src/domain/user/user.errors'
import { Email } from '../../src/domain/value-objects/email'
import {
  fakeHasher,
  InMemoryProfileRepository,
  InMemoryRefreshTokenRepository,
  InMemoryUserRepository,
} from '../fakes/in-memory'
import { testTokenIssuer } from '../helpers'

function setup() {
  const users = new InMemoryUserRepository()
  const profiles = new InMemoryProfileRepository()
  const validator = new ImpersonationSessionValidator(users)
  const refreshTokens = new InMemoryRefreshTokenRepository()
  const tokens = new AuthTokenService(testTokenIssuer(), refreshTokens, {
    refreshTtlDays: 30,
    impersonationRefreshTtlSeconds: 7200,
  })
  const account = UserAggregate.register({
    id: randomUUID(),
    email: Email.create('familia@example.com'),
    passwordHash: 'hashed:senha-correta',
    firstName: 'Família',
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
  const profile = ProfileAggregate.create({
    id: randomUUID(),
    accountUserId: account.id,
    name: 'Rafa',
  })
  users.seed(account)
  users.seed(actor)
  profiles.seed(profile)
  return {
    users,
    profiles,
    validator,
    refreshTokens,
    tokens,
    account,
    actor,
    profile,
    select: new SelectProfileService(profiles, users, tokens, validator, refreshTokens),
    exit: new ExitProfileSessionService(users, fakeHasher, tokens, validator, refreshTokens),
  }
}

describe('reemissão derivada de sessão impersonada', () => {
  test('sessão de suporte não troca perfil sem provar a família vigente', async () => {
    const { account, actor, profile, select } = setup()
    await expect(
      select.execute({
        accountUserId: account.id,
        profileId: profile.id,
        impersonatorUserId: actor.id,
      }),
    ).rejects.toBeInstanceOf(InvalidRefreshTokenError)
  })

  test('select de perfil revalida a matriz quando o alvo foi promovido', async () => {
    const { users, tokens, account, actor, profile, select } = setup()
    const current = await tokens.issueForUser(account, {
      impersonation: {
        actorId: actor.id,
        act: { sub: actor.id, email: actor.email, name: actor.fullName, mode: 'readonly' },
      },
    })
    account.changeRole('admin')
    users.seed(account)

    await expect(
      select.execute({
        accountUserId: account.id,
        profileId: profile.id,
        impersonatorUserId: actor.id,
        refreshToken: current.refreshToken,
      }),
    ).rejects.toBeInstanceOf(UserNotActiveError)
  })

  test('saída do perfil revalida a matriz quando o ator foi rebaixado', async () => {
    const { users, tokens, account, actor, exit } = setup()
    const current = await tokens.issueForUser(account, {
      impersonation: {
        actorId: actor.id,
        act: { sub: actor.id, email: actor.email, name: actor.fullName, mode: 'readonly' },
      },
    })
    actor.changeRole('customer')
    users.seed(actor)

    await expect(
      exit.execute({
        accountUserId: account.id,
        password: 'senha-correta',
        impersonatorUserId: actor.id,
        refreshToken: current.refreshToken,
      }),
    ).rejects.toBeInstanceOf(UserNotActiveError)
  })

  test('select e exit preservam o deadline absoluto da família de suporte', async () => {
    const { refreshTokens, tokens, account, actor, profile, select, exit } = setup()
    const current = await tokens.issueForUser(account, {
      impersonation: {
        actorId: actor.id,
        act: { sub: actor.id, email: actor.email, name: actor.fullName, mode: 'write' },
      },
    })
    const currentRecord = await refreshTokens.findByHash(sha256Hex(current.refreshToken))
    if (!currentRecord) throw new Error('refresh inicial não encontrado')
    const deadline = new Date(Date.now() + 60_000)
    const family = refreshTokens.families.get(currentRecord.familyId)
    if (!family) throw new Error('família inicial não encontrada')
    family.expiresAt = deadline

    const selected = await select.execute({
      accountUserId: account.id,
      profileId: profile.id,
      impersonatorUserId: actor.id,
      refreshToken: current.refreshToken,
    })
    const selectedRecord = await refreshTokens.findByHash(sha256Hex(selected.tokens.refreshToken))
    expect(selectedRecord?.familyExpiresAt.getTime()).toBe(deadline.getTime())

    const exited = await exit.execute({
      accountUserId: account.id,
      password: 'senha-correta',
      impersonatorUserId: actor.id,
      refreshToken: selected.tokens.refreshToken,
    })
    const exitedRecord = await refreshTokens.findByHash(sha256Hex(exited.tokens.refreshToken))
    expect(exitedRecord?.familyExpiresAt.getTime()).toBe(deadline.getTime())
  })
})
