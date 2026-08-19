import { beforeEach, describe, expect, test } from 'bun:test'
import { ForbiddenError } from '@sistemazero/core/http'
import type { DeleteUserActor } from '../../src/application/admin/delete-user/delete-user.command'
import { DeleteUserService } from '../../src/application/admin/delete-user/delete-user.service'
import { UserAggregate, type UserSnapshot } from '../../src/domain/user/user.aggregate'
import { UserNotFoundError } from '../../src/domain/user/user.errors'
import { InMemoryUserRepository, silentLogger } from '../fakes/in-memory'

let seq = 0
function makeUser(overrides: Partial<UserSnapshot> = {}): UserAggregate {
  seq += 1
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
    avatarUrl: null,
    passwordSetAt: null,
    createdAt: created,
    updatedAt: created,
    ...overrides,
  })
}

const SUPERADMIN: DeleteUserActor = { id: crypto.randomUUID(), role: 'superadmin' }

describe('DeleteUserService', () => {
  let users: InMemoryUserRepository
  let service: DeleteUserService

  beforeEach(() => {
    users = new InMemoryUserRepository()
    service = new DeleteUserService(users, silentLogger)
  })

  test('superadmin exclui um customer', async () => {
    const target = makeUser({ role: 'customer' })
    users.seed(target)

    await service.execute({ targetId: target.id, actor: SUPERADMIN })

    expect(await users.findById(target.id)).toBeNull()
  })

  test('retry após a exclusão concluída devolve o recibo sem reabrir a operação', async () => {
    const target = makeUser({ role: 'customer' })
    users.seed(target)
    users.profileIdsByAccount.set(target.id, ['perfil-ativo', 'perfil-arquivado'])

    await service.execute({ targetId: target.id, actor: SUPERADMIN })

    await expect(service.prepare({ targetId: target.id, actor: SUPERADMIN })).resolves.toEqual({
      profileIds: ['perfil-ativo', 'perfil-arquivado'],
      completed: true,
    })
    await expect(
      service.execute({ targetId: target.id, actor: SUPERADMIN }),
    ).resolves.toBeUndefined()
  })

  test('preparação bloqueia a conta e devolve também perfis arquivados', async () => {
    const target = makeUser({ role: 'customer' })
    users.seed(target)
    users.profileIdsByAccount.set(target.id, ['perfil-ativo', 'perfil-arquivado'])

    const result = await service.prepare({ targetId: target.id, actor: SUPERADMIN })

    expect(result).toEqual({ profileIds: ['perfil-ativo', 'perfil-arquivado'] })
    expect((await users.findById(target.id))?.status).toBe('blocked')
  })

  test('non-superadmin (admin) é barrado', async () => {
    const target = makeUser({ role: 'customer' })
    users.seed(target)
    const admin: DeleteUserActor = { id: crypto.randomUUID(), role: 'admin' }

    await expect(service.execute({ targetId: target.id, actor: admin })).rejects.toBeInstanceOf(
      ForbiddenError,
    )
    expect(await users.findById(target.id)).not.toBeNull()
  })

  test('não exclui a própria conta', async () => {
    const me = makeUser({ role: 'superadmin' })
    users.seed(me)

    await expect(
      service.execute({ targetId: me.id, actor: { id: me.id, role: 'superadmin' } }),
    ).rejects.toBeInstanceOf(ForbiddenError)
    expect(await users.findById(me.id)).not.toBeNull()
  })

  test('não exclui contas admin/superadmin', async () => {
    const adminTarget = makeUser({ role: 'admin' })
    const superTarget = makeUser({ role: 'superadmin' })
    users.seed(adminTarget)
    users.seed(superTarget)

    await expect(
      service.execute({ targetId: adminTarget.id, actor: SUPERADMIN }),
    ).rejects.toBeInstanceOf(ForbiddenError)
    await expect(
      service.execute({ targetId: superTarget.id, actor: SUPERADMIN }),
    ).rejects.toBeInstanceOf(ForbiddenError)
    expect(await users.findById(adminTarget.id)).not.toBeNull()
    expect(await users.findById(superTarget.id)).not.toBeNull()
  })

  test('alvo inexistente → UserNotFoundError', async () => {
    await expect(
      service.execute({ targetId: crypto.randomUUID(), actor: SUPERADMIN }),
    ).rejects.toBeInstanceOf(UserNotFoundError)
  })
})
