import { beforeEach, describe, expect, test } from 'bun:test'
import { ValidationError } from '@sistemazero/core/errors'
import { ForbiddenError } from '@sistemazero/core/http'
import type { CreateUserActor } from '../../src/application/admin/create-user/create-user.command'
import { CreateUserService } from '../../src/application/admin/create-user/create-user.service'
import { CreatePasswordTokenService } from '../../src/application/password-reset/create-password-token.service'
import {
  FakeMessagingClient,
  fakeHasher,
  InMemoryPasswordResetTokenRepository,
  InMemoryUserRepository,
  silentLogger,
} from '../fakes/in-memory'

const COMMUNITY_URL = 'http://localhost:3007'
const KIDS_COMMUNITY_URL = 'http://localhost:3008'

const admin: CreateUserActor = { id: crypto.randomUUID(), role: 'admin' }
const superadmin: CreateUserActor = { id: crypto.randomUUID(), role: 'superadmin' }

const BASE_COMMAND = {
  email: 'convidada@example.com',
  firstName: 'Ana',
  lastName: 'Silva',
  role: 'customer',
} as const

describe('CreateUserService — criação pelo painel (convite)', () => {
  let users: InMemoryUserRepository
  let messaging: FakeMessagingClient
  let service: CreateUserService

  beforeEach(() => {
    users = new InMemoryUserRepository()
    messaging = new FakeMessagingClient()
    const resetTokens = new InMemoryPasswordResetTokenRepository()
    const createPasswordToken = new CreatePasswordTokenService(users, resetTokens, {
      ttlMinutes: 60,
    })
    service = new CreateUserService(
      users,
      fakeHasher,
      createPasswordToken,
      messaging,
      { urls: { main: COMMUNITY_URL, kids: KIDS_COMMUNITY_URL }, inviteTokenTtlMinutes: 20160 },
      silentLogger,
    )
  })

  test('admin cria customer ativo + envia welcome com link de definição de senha', async () => {
    const result = await service.execute({ actor: admin, ...BASE_COMMAND })

    expect(result.user.email).toBe('convidada@example.com')
    expect(result.user.status).toBe('active')
    expect(result.user.role).toBe('customer')
    expect(result.user.signupSource).toBe('admin')
    expect(result.inviteSent).toBe(true)

    expect(messaging.sent).toHaveLength(1)
    const sent = messaging.sent[0]
    expect(sent?.templateKey).toBe('welcome')
    expect(sent?.recipient.email).toBe('convidada@example.com')
    expect(sent?.variables.link).toStartWith(`${COMMUNITY_URL}/redefinir-senha?token=`)
  })

  test('convite com platform=kids → link com a base kids', async () => {
    const result = await service.execute({ actor: admin, ...BASE_COMMAND, platform: 'kids' })
    expect(result.inviteSent).toBe(true)
    expect(messaging.sent[0]?.variables.link).toStartWith(
      `${KIDS_COMMUNITY_URL}/redefinir-senha?token=`,
    )
  })

  test('platform=kids SEM env configurada → 400 e NÃO cria a conta', async () => {
    const semKids = new CreateUserService(
      users,
      fakeHasher,
      new CreatePasswordTokenService(users, new InMemoryPasswordResetTokenRepository(), {
        ttlMinutes: 60,
      }),
      messaging,
      { urls: { main: COMMUNITY_URL }, inviteTokenTtlMinutes: 20160 },
      silentLogger,
    )
    await expect(
      semKids.execute({ actor: admin, ...BASE_COMMAND, platform: 'kids' }),
    ).rejects.toBeInstanceOf(ValidationError)
    // Falha ANTES do efeito colateral: nenhum usuário criado, nenhum e-mail.
    expect(await users.findByEmail('convidada@example.com')).toBeNull()
    expect(messaging.sent).toHaveLength(0)
  })

  test('admin cria staff; e-mail é normalizado (lowercase)', async () => {
    const result = await service.execute({
      actor: admin,
      ...BASE_COMMAND,
      email: 'Staff@Example.com',
      role: 'staff',
    })
    expect(result.user.role).toBe('staff')
    expect(result.user.email).toBe('staff@example.com')
  })

  test('admin NÃO cria admin/superadmin → 403', async () => {
    for (const role of ['admin', 'superadmin'] as const) {
      await expect(service.execute({ actor: admin, ...BASE_COMMAND, role })).rejects.toBeInstanceOf(
        ForbiddenError,
      )
    }
    expect(messaging.sent).toHaveLength(0)
  })

  test('superadmin cria admin', async () => {
    const result = await service.execute({ actor: superadmin, ...BASE_COMMAND, role: 'admin' })
    expect(result.user.role).toBe('admin')
    expect(result.inviteSent).toBe(true)
  })

  test('ator sem papel de escrita → 403', async () => {
    const staff: CreateUserActor = { id: crypto.randomUUID(), role: 'staff' }
    await expect(service.execute({ actor: staff, ...BASE_COMMAND })).rejects.toBeInstanceOf(
      ForbiddenError,
    )
  })

  test('e-mail duplicado → EMAIL_ALREADY_IN_USE (409)', async () => {
    await service.execute({ actor: admin, ...BASE_COMMAND })
    await expect(service.execute({ actor: admin, ...BASE_COMMAND })).rejects.toMatchObject({
      code: 'EMAIL_ALREADY_IN_USE',
    })
  })

  test('senha aleatória não é utilizável (nenhuma senha conhecida verifica)', async () => {
    const result = await service.execute({ actor: admin, ...BASE_COMMAND })
    const user = await users.findById(result.user.id)
    // fakeHasher: hash = `hashed:${plain}` → verify só passa com a senha exata,
    // que é 32 bytes aleatórios nunca expostos.
    expect(await fakeHasher.verify('', user?.passwordHash ?? '')).toBe(false)
    expect(await fakeHasher.verify('senha-comum-123', user?.passwordHash ?? '')).toBe(false)
  })

  test('falha no envio do e-mail NÃO desfaz a criação (inviteSent: false)', async () => {
    messaging.failNext = true
    const result = await service.execute({ actor: admin, ...BASE_COMMAND })
    expect(result.inviteSent).toBe(false)
    expect(await users.findByEmail('convidada@example.com')).not.toBeNull()
  })
})
