import { describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { sha256Hex } from '@sistemazero/core/security'
import { ChangeImpersonationModeService } from '../../src/application/impersonation/change-impersonation-mode.service'
import { ImpersonationSessionValidator } from '../../src/application/impersonation/impersonation-session-validator'
import { RefreshService } from '../../src/application/refresh/refresh.service'
import { AuthTokenService } from '../../src/application/tokens/auth-token.service'
import { UserAggregate } from '../../src/domain/user/user.aggregate'
import { InvalidRefreshTokenError } from '../../src/domain/user/user.errors'
import { Email } from '../../src/domain/value-objects/email'
import {
  InMemoryProfileRepository,
  InMemoryRefreshTokenRepository,
  InMemoryUserRepository,
  silentLogger,
} from '../fakes/in-memory'
import { testTokenIssuer } from '../helpers'

describe('ChangeImpersonationModeService', () => {
  function setup() {
    const users = new InMemoryUserRepository()
    const refreshTokens = new InMemoryRefreshTokenRepository()
    const profiles = new InMemoryProfileRepository()
    const issuer = testTokenIssuer()
    const validator = new ImpersonationSessionValidator(users)
    const tokens = new AuthTokenService(issuer, refreshTokens, {
      refreshTtlDays: 30,
      impersonationRefreshTtlSeconds: 7200,
    })
    const service = new ChangeImpersonationModeService(
      users,
      refreshTokens,
      profiles,
      tokens,
      validator,
      silentLogger,
    )
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
    return {
      users,
      refreshTokens,
      profiles,
      issuer,
      tokens,
      service,
      target,
      actor,
      validator,
    }
  }

  test('ativa write ao rotacionar a mesma família impersonada', async () => {
    const { refreshTokens, issuer, tokens, service, target, actor } = setup()
    const initial = await tokens.issueForUser(target, {
      impersonation: {
        actorId: actor.id,
        act: {
          sub: actor.id,
          email: actor.email,
          name: actor.fullName,
          mode: 'readonly',
        },
      },
    })

    const changed = await service.execute({ refreshToken: initial.refreshToken, mode: 'write' })
    const claims = await issuer.verifyAccessToken(changed.accessToken)
    expect(claims?.act).toMatchObject({ sub: actor.id, mode: 'write' })

    const record = await refreshTokens.findByHash(sha256Hex(initial.refreshToken))
    expect(record?.impersonationWritable).toBeTrue()
    expect(record?.familyId).toBe(
      (await refreshTokens.findByHash(sha256Hex(initial.refreshToken)))?.familyId,
    )
    expect(refreshTokens.modeAuditLogs).toContainEqual(
      expect.objectContaining({
        actorId: target.id,
        impersonatorId: actor.id,
        action: 'auth.impersonation.mode.write',
        status: 200,
      }),
    )
  })

  test('desativa write sem encerrar a impersonação', async () => {
    const { refreshTokens, issuer, tokens, service, target, actor } = setup()
    const writable = await tokens.issueForUser(target, {
      impersonation: {
        actorId: actor.id,
        act: { sub: actor.id, email: actor.email, name: actor.fullName, mode: 'write' },
      },
    })

    const changed = await service.execute({ refreshToken: writable.refreshToken, mode: 'readonly' })
    expect((await issuer.verifyAccessToken(changed.accessToken))?.act?.mode).toBe('readonly')
    expect(
      (await refreshTokens.findByHash(sha256Hex(writable.refreshToken)))?.impersonationWritable,
    ).toBeFalse()
    expect(refreshTokens.modeAuditLogs).toContainEqual(
      expect.objectContaining({ action: 'auth.impersonation.mode.readonly', status: 200 }),
    )
  })

  test('sessão normal não pode transformar o próprio refresh em modo de suporte', async () => {
    const { tokens, service, target } = setup()
    const normal = await tokens.issueForUser(target)

    await expect(
      service.execute({ refreshToken: normal.refreshToken, mode: 'write' }),
    ).rejects.toBeInstanceOf(InvalidRefreshTokenError)
  })

  test('falha de auditoria impede a elevação e mantém a família readonly', async () => {
    const { refreshTokens, tokens, service, target, actor } = setup()
    const initial = await tokens.issueForUser(target, {
      impersonation: {
        actorId: actor.id,
        act: {
          sub: actor.id,
          email: actor.email,
          name: actor.fullName,
          mode: 'readonly',
        },
      },
    })
    refreshTokens.modeAuditFailure = new Error('audit indisponível')

    await expect(
      service.execute({ refreshToken: initial.refreshToken, mode: 'write' }),
    ).rejects.toThrow('audit indisponível')
    expect(
      (await refreshTokens.findByHash(sha256Hex(initial.refreshToken)))?.impersonationWritable,
    ).toBeFalse()
  })

  test('falha de auditoria nunca impede o rebaixamento para readonly', async () => {
    const { refreshTokens, issuer, tokens, service, target, actor } = setup()
    const initial = await tokens.issueForUser(target, {
      impersonation: {
        actorId: actor.id,
        act: {
          sub: actor.id,
          email: actor.email,
          name: actor.fullName,
          mode: 'write',
        },
      },
    })
    refreshTokens.modeAuditFailure = new Error('audit indisponível')

    const lowered = await service.execute({
      refreshToken: initial.refreshToken,
      mode: 'readonly',
    })
    expect((await issuer.verifyAccessToken(lowered.accessToken))?.act?.mode).toBe('readonly')
    expect(
      (await refreshTokens.findByHash(sha256Hex(initial.refreshToken)))?.impersonationWritable,
    ).toBeFalse()
  })

  test('retry com o mesmo refresh é idempotente e não rotaciona a credencial', async () => {
    const { refreshTokens, issuer, tokens, service, target, actor } = setup()
    const initial = await tokens.issueForUser(target, {
      impersonation: {
        actorId: actor.id,
        act: {
          sub: actor.id,
          email: actor.email,
          name: actor.fullName,
          mode: 'readonly',
        },
      },
    })

    const first = await service.execute({ refreshToken: initial.refreshToken, mode: 'write' })
    const retry = await service.execute({ refreshToken: initial.refreshToken, mode: 'write' })

    expect((await issuer.verifyAccessToken(first.accessToken))?.act?.mode).toBe('write')
    expect((await issuer.verifyAccessToken(retry.accessToken))?.act?.mode).toBe('write')
    expect((await refreshTokens.findByHash(sha256Hex(initial.refreshToken)))?.revokedAt).toBeNull()
    expect(refreshTokens.byId.size).toBe(1)
  })

  test('corrida entre mudança de modo e refresh não revoga a família inteira', async () => {
    const { users, refreshTokens, profiles, tokens, service, target, actor, validator } = setup()
    const refresh = new RefreshService(
      users,
      refreshTokens,
      tokens,
      profiles,
      validator,
      silentLogger,
    )
    let familyRevocations = 0
    const revokeFamily = refreshTokens.revokeFamily.bind(refreshTokens)
    refreshTokens.revokeFamily = async (familyId) => {
      familyRevocations += 1
      await revokeFamily(familyId)
    }
    const initial = await tokens.issueForUser(target, {
      impersonation: {
        actorId: actor.id,
        act: {
          sub: actor.id,
          email: actor.email,
          name: actor.fullName,
          mode: 'readonly',
        },
      },
    })
    const initialRecord = await refreshTokens.findByHash(sha256Hex(initial.refreshToken))
    if (!initialRecord) throw new Error('refresh inicial não encontrado')

    await Promise.allSettled([
      service.execute({ refreshToken: initial.refreshToken, mode: 'write' }),
      refresh.execute({ refreshToken: initial.refreshToken }),
    ])

    const activeFamilyRecords = [...refreshTokens.byId.values()].filter(
      (record) => record.familyId === initialRecord.familyId && record.revokedAt === null,
    )
    expect(familyRevocations).toBe(0)
    expect(activeFamilyRecords.length).toBeGreaterThan(0)
  })

  test('refresh lê o modo canônico DEPOIS de vencer o claim de rotação', async () => {
    const { users, refreshTokens, profiles, issuer, tokens, target, actor, validator } = setup()
    const refresh = new RefreshService(
      users,
      refreshTokens,
      tokens,
      profiles,
      validator,
      silentLogger,
    )
    const initial = await tokens.issueForUser(target, {
      impersonation: {
        actorId: actor.id,
        act: {
          sub: actor.id,
          email: actor.email,
          name: actor.fullName,
          mode: 'readonly',
        },
      },
    })
    const initialRecord = await refreshTokens.findByHash(sha256Hex(initial.refreshToken))
    if (!initialRecord) throw new Error('refresh inicial não encontrado')

    const originalClaim = refreshTokens.claimForRotation.bind(refreshTokens)
    refreshTokens.claimForRotation = async (id, at) => {
      // A troca de modo vence exatamente depois do find inicial do RefreshService
      // e antes do claim. O access rotacionado precisa observar este estado.
      const family = refreshTokens.families.get(initialRecord.familyId)
      if (family) family.impersonationWritable = true
      return originalClaim(id, at)
    }

    const rotated = await refresh.execute({ refreshToken: initial.refreshToken })
    expect((await issuer.verifyAccessToken(rotated.accessToken))?.act?.mode).toBe('write')
  })

  test('CAS perdido não deixa auditoria falsa de sucesso', async () => {
    const { refreshTokens, tokens, service, target, actor } = setup()
    const initial = await tokens.issueForUser(target, {
      impersonation: {
        actorId: actor.id,
        act: {
          sub: actor.id,
          email: actor.email,
          name: actor.fullName,
          mode: 'readonly',
        },
      },
    })
    refreshTokens.setImpersonationMode = async () => false

    await expect(
      service.execute({ refreshToken: initial.refreshToken, mode: 'write' }),
    ).rejects.toBeInstanceOf(InvalidRefreshTokenError)
    expect(refreshTokens.modeAuditLogs).toHaveLength(0)
  })
})
