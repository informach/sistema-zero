import { expect, test } from 'bun:test'
import { LogoutService } from '../../src/application/logout/logout.service'
import { StaffOperationsService } from '../../src/application/staff/staff-operations.service'
import { AuthTokenService } from '../../src/application/tokens/auth-token.service'
import { UserAggregate } from '../../src/domain/user/user.aggregate'
import { Email } from '../../src/domain/value-objects/email'
import {
  InMemoryAuditLogRepository,
  InMemoryRefreshTokenRepository,
  InMemoryUserRepository,
} from '../fakes/in-memory'
import { testTokenIssuer } from '../helpers'

test('staff effects require current role, live ordinary session and a durable audit before dispatch', async () => {
  const users = new InMemoryUserRepository(),
    sessions = new InMemoryRefreshTokenRepository(),
    audit = new InMemoryAuditLogRepository(),
    issuer = testTokenIssuer()
  const user = UserAggregate.register({
    id: crypto.randomUUID(),
    email: Email.create('staff@example.com'),
    passwordHash: 'hash',
    passwordSet: true,
    role: 'admin',
    status: 'active',
    firstName: 'Staff',
    lastName: 'Fixture',
  })
  users.seed(user)
  const tokens = new AuthTokenService(issuer, sessions, {
    refreshTtlDays: 30,
    impersonationRefreshTtlSeconds: 7200,
  })
  const pair = await tokens.issueForUser(user)
  let dispatches = 0
  const service = new StaffOperationsService(users, sessions, issuer, audit, {
    async execute() {
      expect(audit.logs.at(-1)?.status).toBe(102)
      dispatches++
      return { status: 202, value: { status: 'QUEUED' } }
    },
  })
  const operation = {
    action: 'messages.send',
    message: {
      intentId: 'fixture-intent',
      channel: 'email',
      templateKey: 'notice',
      recipient: { name: 'Fixture', email: 'receiver@example.com' },
      variables: {},
    },
  } as const
  expect((await service.execute(pair.accessToken, pair.refreshToken, operation)).status).toBe(202)
  expect(audit.logs).toHaveLength(2)
  expect(JSON.stringify(audit.logs)).not.toContain('receiver@example.com')
  const changed = await users.findById(user.id)
  if (!changed) throw new Error('Missing fixture user')
  const version = changed.version
  changed.changeRole('staff')
  expect(await users.update(changed, version)).toBe(true)
  await expect(service.execute(pair.accessToken, pair.refreshToken, operation)).rejects.toThrow(
    'Permissão atual',
  )
  expect(dispatches).toBe(1)
  await new LogoutService(sessions).execute({ refreshToken: pair.refreshToken })
  expect(await issuer.verifyAccessToken(pair.accessToken)).not.toBeNull()
  await expect(
    service.execute(pair.accessToken, pair.refreshToken, { action: 'identity' }),
  ).rejects.toThrow('Sessão vigente')
  const other = UserAggregate.register({
    id: crypto.randomUUID(),
    email: Email.create('other@example.com'),
    passwordHash: 'hash',
    passwordSet: true,
    role: 'admin',
    firstName: 'Other',
    lastName: 'Fixture',
  })
  users.seed(other)
  const otherPair = await tokens.issueForUser(other)
  await expect(
    service.execute(pair.accessToken, otherPair.refreshToken, { action: 'identity' }),
  ).rejects.toThrow('Sessão vigente')
})
