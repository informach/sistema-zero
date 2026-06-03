import { beforeEach, describe, expect, test } from 'bun:test'
import { ForbiddenError } from '@sistemazero/core/http'
import { ListUsersService } from '../../src/application/admin/list-users/list-users.service'
import type { UpdateUserActor } from '../../src/application/admin/update-user/update-user.command'
import { UpdateUserService } from '../../src/application/admin/update-user/update-user.service'
import { UserAggregate, type UserSnapshot } from '../../src/domain/user/user.aggregate'
import {
  InMemoryRefreshTokenRepository,
  InMemoryUserRepository,
  silentLogger,
} from '../fakes/in-memory'

let seq = 0
function makeUser(overrides: Partial<UserSnapshot> = {}): UserAggregate {
  seq += 1
  // createdAt crescente p/ tornar a ordenação (desc) determinística nos testes.
  const created = new Date(2020, 0, 1, 0, 0, seq)
  return UserAggregate.restore({
    id: crypto.randomUUID(),
    version: 0,
    email: `user-${seq}@example.com`,
    passwordHash: 'h',
    firstName: 'First',
    lastName: `Last${seq}`,
    role: 'customer',
    status: 'active',
    phone: null,
    signupSource: null,
    createdAt: created,
    updatedAt: created,
    ...overrides,
  })
}

describe('ListUsersService', () => {
  let users: InMemoryUserRepository
  let service: ListUsersService

  beforeEach(() => {
    users = new InMemoryUserRepository()
    service = new ListUsersService(users)
  })

  test('filtra por role e status', async () => {
    users.seed(makeUser({ role: 'admin', status: 'active' }))
    users.seed(makeUser({ role: 'customer', status: 'active' }))
    users.seed(makeUser({ role: 'customer', status: 'blocked' }))

    const byRole = await service.execute({ role: 'customer', limit: 20, offset: 0 })
    expect(byRole.total).toBe(2)
    expect(byRole.items.every((u) => u.role === 'customer')).toBe(true)

    const byStatus = await service.execute({ status: 'blocked', limit: 20, offset: 0 })
    expect(byStatus.total).toBe(1)
    expect(byStatus.items[0]?.status).toBe('blocked')
  })

  test('busca q casa em e-mail/nome (case-insensitive)', async () => {
    users.seed(makeUser({ email: 'helena@ex.com', firstName: 'Helena' }))
    users.seed(makeUser({ email: 'joao@ex.com', firstName: 'João' }))

    const res = await service.execute({ q: 'HELENA', limit: 20, offset: 0 })
    expect(res.total).toBe(1)
    expect(res.items[0]?.email).toBe('helena@ex.com')
  })

  test('pagina com limit/offset e devolve o total completo', async () => {
    for (let i = 0; i < 5; i++) users.seed(makeUser())
    const page = await service.execute({ limit: 2, offset: 2 })
    expect(page.total).toBe(5)
    expect(page.items).toHaveLength(2)
    expect(page.limit).toBe(2)
    expect(page.offset).toBe(2)
  })

  test('clampa limit fora de faixa para o default/máximo', async () => {
    const res = await service.execute({ limit: 9999, offset: 0 })
    expect(res.limit).toBe(100)
  })
})

describe('UpdateUserService — guards hierárquicos', () => {
  let users: InMemoryUserRepository
  let refreshTokens: InMemoryRefreshTokenRepository
  let service: UpdateUserService

  const admin: UpdateUserActor = { id: crypto.randomUUID(), role: 'admin' }
  const superadmin: UpdateUserActor = { id: crypto.randomUUID(), role: 'superadmin' }

  beforeEach(() => {
    users = new InMemoryUserRepository()
    refreshTokens = new InMemoryRefreshTokenRepository()
    service = new UpdateUserService(users, refreshTokens, silentLogger)
  })

  async function expectForbidden(p: Promise<unknown>) {
    await expect(p).rejects.toBeInstanceOf(ForbiddenError)
  }

  test('admin edita customer (status + perfil) com sucesso e bumpa version', async () => {
    const target = makeUser({ role: 'customer', version: 0 })
    users.seed(target)
    const view = await service.execute({
      targetId: target.id,
      actor: admin,
      changes: { status: 'suspended', firstName: 'Novo' },
    })
    expect(view.status).toBe('suspended')
    expect(view.firstName).toBe('Novo')
    expect(view.version).toBe(1)
  })

  test('admin NÃO promove a admin/superadmin', async () => {
    const target = makeUser({ role: 'customer' })
    users.seed(target)
    await expectForbidden(
      service.execute({ targetId: target.id, actor: admin, changes: { role: 'admin' } }),
    )
  })

  test('admin NÃO toca em alvo admin/superadmin', async () => {
    const target = makeUser({ role: 'admin' })
    users.seed(target)
    await expectForbidden(
      service.execute({ targetId: target.id, actor: admin, changes: { status: 'blocked' } }),
    )
  })

  test('ninguém altera o próprio papel/status (anti-lockout)', async () => {
    const self = makeUser({ id: superadmin.id, role: 'superadmin' })
    users.seed(self)
    await expectForbidden(
      service.execute({ targetId: self.id, actor: superadmin, changes: { status: 'blocked' } }),
    )
  })

  test('superadmin gerencia admins', async () => {
    const target = makeUser({ role: 'admin' })
    users.seed(target)
    const view = await service.execute({
      targetId: target.id,
      actor: superadmin,
      changes: { role: 'staff' },
    })
    expect(view.role).toBe('staff')
  })

  test('bloquear/suspender revoga as sessões vigentes do alvo', async () => {
    const target = makeUser({ role: 'customer', status: 'active' })
    users.seed(target)
    await refreshTokens.create({
      id: crypto.randomUUID(),
      userId: target.id,
      familyId: crypto.randomUUID(),
      tokenHash: 'hash-1',
      expiresAt: new Date(Date.now() + 86_400_000),
    })

    await service.execute({ targetId: target.id, actor: admin, changes: { status: 'blocked' } })

    const record = await refreshTokens.findByHash('hash-1')
    expect(record?.revokedAt).not.toBeNull()
  })

  test('version defasada → VersionConflictError (409)', async () => {
    const target = makeUser({ role: 'customer', version: 5 })
    users.seed(target)
    await expect(
      service.execute({
        targetId: target.id,
        actor: admin,
        changes: { firstName: 'X' },
        expectedVersion: 4,
      }),
    ).rejects.toMatchObject({ code: 'VERSION_CONFLICT' })
  })

  test('alvo inexistente → UserNotFoundError (404)', async () => {
    await expect(
      service.execute({ targetId: crypto.randomUUID(), actor: admin, changes: { firstName: 'X' } }),
    ).rejects.toMatchObject({ code: 'USER_NOT_FOUND' })
  })

  test('edição sem mudança real é no-op (não revoga sessões nem falha)', async () => {
    const target = makeUser({ role: 'customer', status: 'active', firstName: 'Ana' })
    users.seed(target)
    const view = await service.execute({
      targetId: target.id,
      actor: admin,
      changes: { firstName: 'Ana' }, // igual ao atual
    })
    expect(view.version).toBe(target.version)
  })
})
