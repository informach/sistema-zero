import { describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { ValidationError } from '@sistemazero/core/errors'
import { CreateImpersonationTokenService } from '../../src/application/impersonation/create-impersonation-token.service'
import { ExchangeImpersonationTokenService } from '../../src/application/impersonation/exchange-impersonation-token.service'
import { AuthTokenService } from '../../src/application/tokens/auth-token.service'
import {
  ImpersonationForbiddenError,
  InvalidImpersonationTokenError,
  TargetNotImpersonableError,
} from '../../src/domain/impersonation/impersonation.errors'
import { UserAggregate } from '../../src/domain/user/user.aggregate'
import { UserNotFoundError } from '../../src/domain/user/user.errors'
import type { UserRole } from '../../src/domain/user/user.role'
import type { UserStatus } from '../../src/domain/user/user.status'
import { Email } from '../../src/domain/value-objects/email'
import {
  InMemoryImpersonationTokenRepository,
  InMemoryRefreshTokenRepository,
  InMemoryUserRepository,
  silentLogger,
} from '../fakes/in-memory'
import { testTokenIssuer } from '../helpers'

function setup() {
  const users = new InMemoryUserRepository()
  const tokens = new InMemoryImpersonationTokenRepository()
  const refreshTokens = new InMemoryRefreshTokenRepository()
  const issuer = testTokenIssuer()
  const authTokens = new AuthTokenService(issuer, refreshTokens, {
    refreshTtlDays: 30,
    impersonationRefreshTtlSeconds: 7200,
  })
  const create = new CreateImpersonationTokenService(
    users,
    tokens,
    { ttlSeconds: 60 },
    silentLogger,
  )
  const exchange = new ExchangeImpersonationTokenService(users, tokens, authTokens, silentLogger)

  const seedUser = (role: UserRole, status: UserStatus = 'active'): UserAggregate => {
    const id = randomUUID()
    const user = UserAggregate.register({
      id,
      email: Email.create(`${role}-${id.slice(0, 8)}@example.com`),
      passwordHash: 'hashed:x',
      firstName: 'Nome',
      lastName: 'Sobrenome',
      role,
      status,
    })
    users.seed(user)
    return user
  }

  return { users, tokens, refreshTokens, issuer, create, exchange, seedUser }
}

describe('Impersonação — matriz de permissão (criação do handoff)', () => {
  test('admin impersona customer e staff; superadmin impersona qualquer um', async () => {
    const { create, seedUser } = setup()
    const admin = seedUser('admin')
    const superadmin = seedUser('superadmin')

    for (const role of ['customer', 'staff'] as const) {
      const target = seedUser(role)
      const r = await create.execute({
        actorId: admin.id,
        actorRole: 'admin',
        targetUserId: target.id,
      })
      expect(r.token.length).toBeGreaterThan(20)
    }
    for (const role of ['customer', 'staff', 'admin', 'superadmin'] as const) {
      const target = seedUser(role)
      const r = await create.execute({
        actorId: superadmin.id,
        actorRole: 'superadmin',
        targetUserId: target.id,
      })
      expect(r.token.length).toBeGreaterThan(20)
    }
  })

  test('admin NÃO impersona admin/superadmin (escalação barrada) → 403', async () => {
    const { create, seedUser } = setup()
    const admin = seedUser('admin')
    for (const role of ['admin', 'superadmin'] as const) {
      const target = seedUser(role)
      await expect(
        create.execute({ actorId: admin.id, actorRole: 'admin', targetUserId: target.id }),
      ).rejects.toBeInstanceOf(ImpersonationForbiddenError)
    }
  })

  test('impersonar a si mesmo → 400; alvo inexistente → 404; alvo inativo → 409', async () => {
    const { create, seedUser } = setup()
    const superadmin = seedUser('superadmin')

    await expect(
      create.execute({
        actorId: superadmin.id,
        actorRole: 'superadmin',
        targetUserId: superadmin.id,
      }),
    ).rejects.toBeInstanceOf(ValidationError)

    await expect(
      create.execute({
        actorId: superadmin.id,
        actorRole: 'superadmin',
        targetUserId: randomUUID(),
      }),
    ).rejects.toBeInstanceOf(UserNotFoundError)

    const suspended = seedUser('customer', 'suspended')
    await expect(
      create.execute({
        actorId: superadmin.id,
        actorRole: 'superadmin',
        targetUserId: suspended.id,
      }),
    ).rejects.toBeInstanceOf(TargetNotImpersonableError)
  })
})

describe('Impersonação — exchange do handoff', () => {
  test('happy path: sessão do ALVO com claim act do ATOR + família marcada', async () => {
    const { create, exchange, issuer, refreshTokens, seedUser } = setup()
    const admin = seedUser('admin')
    const target = seedUser('customer')
    const { token } = await create.execute({
      actorId: admin.id,
      actorRole: 'admin',
      targetUserId: target.id,
    })

    const result = await exchange.execute({ token, ip: '203.0.113.7' })
    expect(result.user.id).toBe(target.id)
    expect(result.tokens.refreshExpiresIn).toBe(7200)

    const claims = await issuer.verifyAccessToken(result.tokens.accessToken)
    expect(claims?.sub).toBe(target.id)
    expect(claims?.act).toMatchObject({ sub: admin.id, email: admin.email })

    // A família nasce marcada — é o que preserva act/TTL na rotação.
    const stored = [...refreshTokens.byId.values()].at(-1)
    expect(stored?.impersonatorUserId).toBe(admin.id)
  })

  test('single-use: 2º exchange com o MESMO token → 401 (consumo atômico)', async () => {
    const { create, exchange, seedUser } = setup()
    const admin = seedUser('admin')
    const target = seedUser('customer')
    const { token } = await create.execute({
      actorId: admin.id,
      actorRole: 'admin',
      targetUserId: target.id,
    })

    await exchange.execute({ token })
    await expect(exchange.execute({ token })).rejects.toBeInstanceOf(InvalidImpersonationTokenError)
  })

  test('corrida: 2 exchanges concorrentes — só UM vence', async () => {
    const { create, exchange, seedUser } = setup()
    const admin = seedUser('admin')
    const target = seedUser('customer')
    const { token } = await create.execute({
      actorId: admin.id,
      actorRole: 'admin',
      targetUserId: target.id,
    })

    const results = await Promise.allSettled([
      exchange.execute({ token }),
      exchange.execute({ token }),
    ])
    const fulfilled = results.filter((r) => r.status === 'fulfilled')
    const rejected = results.filter((r) => r.status === 'rejected')
    expect(fulfilled).toHaveLength(1)
    expect(rejected).toHaveLength(1)
  })

  test('token expirado / inexistente / vazio → 401 indistinguível', async () => {
    const { create, exchange, tokens, seedUser } = setup()
    const admin = seedUser('admin')
    const target = seedUser('customer')
    const { token } = await create.execute({
      actorId: admin.id,
      actorRole: 'admin',
      targetUserId: target.id,
    })
    // Expira o registro na marra.
    for (const record of tokens.byId.values()) {
      record.expiresAt = new Date(Date.now() - 1000)
    }

    for (const bad of [token, 'token-inexistente-qualquer-123', '   ']) {
      await expect(exchange.execute({ token: bad })).rejects.toBeInstanceOf(
        InvalidImpersonationTokenError,
      )
    }
  })

  test('ator desativado entre o pedido e o exchange → 401; alvo desativado → 409', async () => {
    const { create, exchange, users, seedUser } = setup()
    const admin = seedUser('admin')
    const target = seedUser('customer')

    const a = await create.execute({
      actorId: admin.id,
      actorRole: 'admin',
      targetUserId: target.id,
    })
    admin.changeStatus('suspended')
    users.seed(admin)
    await expect(exchange.execute({ token: a.token })).rejects.toBeInstanceOf(
      InvalidImpersonationTokenError,
    )

    admin.changeStatus('active')
    users.seed(admin)
    const b = await create.execute({
      actorId: admin.id,
      actorRole: 'admin',
      targetUserId: target.id,
    })
    target.changeStatus('blocked')
    users.seed(target)
    await expect(exchange.execute({ token: b.token })).rejects.toBeInstanceOf(
      TargetNotImpersonableError,
    )
  })

  test('ator REBAIXADO (admin→customer) entre o pedido e o exchange → 401 (matriz re-checada — F5)', async () => {
    const { create, exchange, users, seedUser } = setup()
    const admin = seedUser('admin')
    const target = seedUser('customer')

    const handoff = await create.execute({
      actorId: admin.id,
      actorRole: 'admin',
      targetUserId: target.id,
    })
    // Rebaixado na janela (~60s): segue ATIVO, mas perdeu o direito de impersonar.
    admin.changeRole('customer')
    users.seed(admin)
    await expect(exchange.execute({ token: handoff.token })).rejects.toBeInstanceOf(
      InvalidImpersonationTokenError,
    )
  })
})
