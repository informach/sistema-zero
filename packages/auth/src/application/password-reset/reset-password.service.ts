import { sha256Hex } from '@sistemazero/core/security'
import {
  InvalidResetTokenError,
  ResetTokenExpiredError,
} from '../../domain/password-reset/password-reset.errors'
import type { PasswordHasher } from '../../domain/ports/password-hasher.port'
import type { PasswordResetTokenRepository } from '../../domain/ports/password-reset-token-repository.port'
import type { RefreshTokenRepository } from '../../domain/ports/refresh-token-repository.port'
import type { UserRepository } from '../../domain/ports/user-repository.port'
import { VersionConflictError } from '../../domain/user/user.errors'
import { assertPasswordPolicy } from '../../domain/value-objects/password-policy'

export interface ResetPasswordOptions {
  passwordMinLength: number
}

/**
 * Redefine a senha a partir de um token single-use (reset OU 1º acesso pós-compra).
 * Troca o hash, REVOGA todas as sessões (refresh tokens) do usuário e consome o
 * token. Token desconhecido/consumido → erro genérico; expirado → erro próprio.
 */
export class ResetPasswordService {
  constructor(
    private readonly users: UserRepository,
    private readonly tokens: PasswordResetTokenRepository,
    private readonly refreshTokens: RefreshTokenRepository,
    private readonly hasher: PasswordHasher,
    private readonly opts: ResetPasswordOptions,
  ) {}

  async execute(command: { token: string; newPassword: string }): Promise<{ ok: true }> {
    const now = new Date()
    const record = await this.tokens.findByHash(sha256Hex(command.token))
    if (!record || record.consumedAt) throw new InvalidResetTokenError()
    if (record.expiresAt.getTime() <= now.getTime()) throw new ResetTokenExpiredError()

    assertPasswordPolicy(command.newPassword, this.opts.passwordMinLength)

    const user = await this.users.findById(record.userId)
    if (!user) throw new InvalidResetTokenError()

    const baseVersion = user.version
    user.changePassword(await this.hasher.hash(command.newPassword), now)
    const updated = await this.users.update(user, baseVersion)
    if (!updated) throw new VersionConflictError()

    // Senha trocada = sessões antigas não valem mais (mitiga conta comprometida).
    await this.refreshTokens.revokeAllForUser(user.id)
    await this.tokens.consume(record.id, now)
    return { ok: true }
  }
}
