import { describe, expect, test } from 'bun:test'
import { CreatePasswordTokenService } from '../../src/application/password-reset/create-password-token.service'
import { ForgotPasswordService } from '../../src/application/password-reset/forgot-password.service'
import { UserAggregate } from '../../src/domain/user/user.aggregate'
import { Email } from '../../src/domain/value-objects/email'
import {
  FakeMessagingClient,
  InMemoryPasswordResetTokenRepository,
  InMemoryUserRepository,
  silentLogger,
} from '../fakes/in-memory'

class FailingPasswordResetTokenRepository extends InMemoryPasswordResetTokenRepository {
  override async createReplacingActive(): Promise<boolean> {
    throw new Error('db indisponível')
  }
}

describe('ForgotPasswordService', () => {
  test('propaga falha de infra ao emitir token; não responde sucesso silencioso', async () => {
    const users = new InMemoryUserRepository()
    users.seed(
      UserAggregate.register({
        id: crypto.randomUUID(),
        email: Email.create('maria@example.com'),
        passwordHash: 'hashed:senha-super-secreta',
        firstName: 'Maria',
        lastName: 'Silva',
      }),
    )
    const messaging = new FakeMessagingClient()
    const service = new ForgotPasswordService(
      new CreatePasswordTokenService(users, new FailingPasswordResetTokenRepository(), {
        ttlMinutes: 60,
      }),
      messaging,
      { urls: { main: 'https://community.example.com' }, cooldownSeconds: 60 },
      silentLogger,
    )

    await expect(service.execute({ email: 'maria@example.com' })).rejects.toThrow('db indisponível')
    expect(messaging.sent).toHaveLength(0)
  })
})
