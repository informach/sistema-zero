import type { PasswordHasher } from '../../domain/ports/password-hasher.port'
import type { RefreshTokenRepository } from '../../domain/ports/refresh-token-repository.port'
import type { UserRepository } from '../../domain/ports/user-repository.port'
import {
  InvalidCredentialsError,
  UserNotFoundError,
  VersionConflictError,
} from '../../domain/user/user.errors'
import { assertPasswordPolicy } from '../../domain/value-objects/password-policy'

export interface ChangePasswordOptions {
  passwordMinLength: number
}

/**
 * Troca de senha LOGADO (`POST /auth/me/password`): exige a senha atual.
 * Revoga TODAS as sessões (inclusive a atual — escolha deliberada por segurança e
 * simplicidade); o cliente deve re-autenticar com a senha nova.
 */
export class ChangeMyPasswordService {
  constructor(
    private readonly users: UserRepository,
    private readonly refreshTokens: RefreshTokenRepository,
    private readonly hasher: PasswordHasher,
    private readonly opts: ChangePasswordOptions,
  ) {}

  async execute(command: {
    userId: string
    currentPassword: string
    newPassword: string
  }): Promise<{ ok: true }> {
    const user = await this.users.findById(command.userId)
    if (!user) throw new UserNotFoundError()

    const ok = await this.hasher.verify(command.currentPassword, user.passwordHash)
    if (!ok) throw new InvalidCredentialsError()

    assertPasswordPolicy(command.newPassword, this.opts.passwordMinLength)

    const baseVersion = user.version
    user.changePassword(await this.hasher.hash(command.newPassword))
    const updated = await this.users.update(user, baseVersion)
    if (!updated) throw new VersionConflictError()

    await this.refreshTokens.revokeAllForUser(user.id)
    return { ok: true }
  }
}
