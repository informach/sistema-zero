import { describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { ImpersonationSessionValidator } from '../../src/application/impersonation/impersonation-session-validator'
import { ExitProfileSessionService } from '../../src/application/profiles/exit-profile-session.service'
import { SelectProfileService } from '../../src/application/profiles/select-profile.service'
import { AuthTokenService } from '../../src/application/tokens/auth-token.service'
import { ProfileAggregate } from '../../src/domain/profile/profile.aggregate'
import { UserAggregate } from '../../src/domain/user/user.aggregate'
import { UserNotActiveError } from '../../src/domain/user/user.errors'
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
  const tokens = new AuthTokenService(testTokenIssuer(), new InMemoryRefreshTokenRepository(), {
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
    tokens,
    account,
    actor,
    profile,
    select: new SelectProfileService(profiles, users, tokens, validator),
    exit: new ExitProfileSessionService(users, fakeHasher, tokens, validator),
  }
}

describe('reemissão derivada de sessão impersonada', () => {
  test('select de perfil revalida a matriz quando o alvo foi promovido', async () => {
    const { users, account, actor, profile, select } = setup()
    account.changeRole('admin')
    users.seed(account)

    await expect(
      select.execute({
        accountUserId: account.id,
        profileId: profile.id,
        impersonatorUserId: actor.id,
      }),
    ).rejects.toBeInstanceOf(UserNotActiveError)
  })

  test('saída do perfil revalida a matriz quando o ator foi rebaixado', async () => {
    const { users, account, actor, exit } = setup()
    actor.changeRole('customer')
    users.seed(actor)

    await expect(
      exit.execute({
        accountUserId: account.id,
        password: 'senha-correta',
        impersonatorUserId: actor.id,
      }),
    ).rejects.toBeInstanceOf(UserNotActiveError)
  })
})
