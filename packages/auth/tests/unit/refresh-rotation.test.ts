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

/**
 * A1 do full review: a rotação do refresh usa um claim ATÔMICO. Dois `/refresh`
 * concorrentes com o MESMO token não podem ambos vencer — o perdedor é tratado
 * como REUSO (revoga a família inteira e nega).
 */
describe('Rotação atômica do refresh token', () => {
  function setup() {
    const users = new InMemoryUserRepository()
    const refreshTokens = new InMemoryRefreshTokenRepository()
    const tokens = new AuthTokenService(testTokenIssuer(), refreshTokens, { refreshTtlDays: 30 })
    const service = new RefreshService(users, refreshTokens, tokens, silentLogger)

    const user = UserAggregate.register({
      id: randomUUID(),
      email: Email.create('ana@example.com'),
      passwordHash: 'hashed:x',
      firstName: 'Ana',
      lastName: 'Lima',
    })
    users.seed(user)
    return { users, refreshTokens, tokens, service, user }
  }

  async function seedRefreshToken(
    refreshTokens: InMemoryRefreshTokenRepository,
    userId: string,
    familyId: string,
  ): Promise<string> {
    const raw = `refresh-${randomUUID()}`
    await refreshTokens.create({
      id: randomUUID(),
      userId,
      familyId,
      tokenHash: sha256Hex(raw),
      expiresAt: new Date(Date.now() + 60_000),
    })
    return raw
  }

  test('claimForRotation é exclusivo: o 1º vence, o 2º recebe false', async () => {
    const { refreshTokens, user } = setup()
    const raw = await seedRefreshToken(refreshTokens, user.id, randomUUID())
    const record = await refreshTokens.findByHash(sha256Hex(raw))
    if (!record) throw new Error('registro não encontrado')

    expect(await refreshTokens.claimForRotation(record.id, new Date())).toBe(true)
    // Segunda tentativa (a "corrida perdida"): o token já foi consumido.
    expect(await refreshTokens.claimForRotation(record.id, new Date())).toBe(false)
  })

  test('perder o claim = reuso: família inteira revogada + 401', async () => {
    const { refreshTokens, service, user } = setup()
    const familyId = randomUUID()
    const raw = await seedRefreshToken(refreshTokens, user.id, familyId)
    // Outro token VIGENTE da mesma família (a "sessão" que o vencedor emitiu).
    const sibling = await seedRefreshToken(refreshTokens, user.id, familyId)

    // Simula a corrida: o claim falha (outra request consumiu entre o findByHash
    // e o claim), preservando o restante do comportamento do fake.
    const original = refreshTokens.claimForRotation.bind(refreshTokens)
    refreshTokens.claimForRotation = async () => false

    await expect(service.execute({ refreshToken: raw })).rejects.toBeInstanceOf(
      InvalidRefreshTokenError,
    )
    refreshTokens.claimForRotation = original

    // A família INTEIRA foi revogada (inclusive o irmão vigente).
    const siblingRecord = await refreshTokens.findByHash(sha256Hex(sibling))
    expect(siblingRecord?.revokedAt).not.toBeNull()
  })

  test('fluxo feliz continua: claim vence → novos tokens na MESMA família', async () => {
    const { refreshTokens, service, user } = setup()
    const familyId = randomUUID()
    const raw = await seedRefreshToken(refreshTokens, user.id, familyId)

    const tokens = await service.execute({ refreshToken: raw })
    expect(tokens.refreshToken.length).toBeGreaterThan(0)

    const novo = await refreshTokens.findByHash(sha256Hex(tokens.refreshToken))
    expect(novo?.familyId).toBe(familyId)
    // O token apresentado foi consumido (rotacionado + revogado).
    const antigo = await refreshTokens.findByHash(sha256Hex(raw))
    expect(antigo?.rotatedAt).not.toBeNull()
    expect(antigo?.revokedAt).not.toBeNull()
  })
})
