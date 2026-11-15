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
 * Troca de senha LOGADO (`POST /auth/me/password`): exige a senha atual de quem já tem
 * uma. Quem nunca definiu senha (conta de compra/convite que entra pelo código do e-mail;
 * a senha é opcional desde 15/11/2026) CRIA a senha sem a atual: a sessão já prova o
 * e-mail, o mesmo que o "Esqueci minha senha" exigiria.
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
    currentPassword?: string
    newPassword: string
  }): Promise<{ ok: true }> {
    const user = await this.users.findById(command.userId)
    if (!user) throw new UserNotFoundError()

    if (user.isPasswordSet()) {
      const ok =
        command.currentPassword !== undefined &&
        command.currentPassword.length > 0 &&
        (await this.hasher.verify(command.currentPassword, user.passwordHash))
      if (!ok) throw new InvalidCredentialsError()
    }

    assertPasswordPolicy(command.newPassword, this.opts.passwordMinLength)

    const baseVersion = user.version
    user.changePassword(await this.hasher.hash(command.newPassword))
    const updated = await this.users.update(user, baseVersion)
    if (!updated) throw new VersionConflictError()

    await this.refreshTokens.revokeAllForUser(user.id)
    return { ok: true }
  }
}
