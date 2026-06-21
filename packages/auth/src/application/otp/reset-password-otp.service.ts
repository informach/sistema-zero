import { InvalidOtpError } from '../../domain/otp/otp.errors'
import type { OtpCodeRepository } from '../../domain/ports/otp-code-repository.port'
import type { PasswordHasher } from '../../domain/ports/password-hasher.port'
import type { RefreshTokenRepository } from '../../domain/ports/refresh-token-repository.port'
import type { UserRepository } from '../../domain/ports/user-repository.port'
import { VersionConflictError } from '../../domain/user/user.errors'
import { assertPasswordPolicy } from '../../domain/value-objects/password-policy'
import { codeMatchesHash } from './otp-code'

export interface ResetPasswordWithOtpOptions {
  passwordMinLength: number
  /** Tetos de palpites errados antes de o código travar (consumido). */
  maxAttempts: number
}

/**
 * Recuperação de senha por OTP: valida o código `password_reset`, troca o hash,
 * REVOGA todas as sessões (mitiga conta comprometida) e consome o código. Erro
 * GENÉRICO em qualquer falha do código (anti-enumeração); trava após `maxAttempts`
 * palpites. A política de senha é validada ANTES (evita gastar o código com senha fraca).
 */
export class ResetPasswordWithOtpService {
  constructor(
    private readonly users: UserRepository,
    private readonly otpCodes: OtpCodeRepository,
    private readonly refreshTokens: RefreshTokenRepository,
    private readonly hasher: PasswordHasher,
    private readonly opts: ResetPasswordWithOtpOptions,
  ) {}

  async execute(command: {
    email: string
    code: string
    newPassword: string
  }): Promise<{ ok: true }> {
    assertPasswordPolicy(command.newPassword, this.opts.passwordMinLength)

    const email = command.email.trim().toLowerCase()
    const user = await this.users.findByEmail(email)
    if (!user?.isActive()) throw new InvalidOtpError()

    const now = new Date()
    const record = await this.otpCodes.findActive(user.id, 'password_reset', now)
    if (!record) throw new InvalidOtpError()

    if (!codeMatchesHash(command.code, record.codeHash)) {
      const attempts = await this.otpCodes.incrementAttempts(record.id)
      if (attempts >= this.opts.maxAttempts) await this.otpCodes.consume(record.id, now)
      throw new InvalidOtpError()
    }

    const consumed = await this.otpCodes.consume(record.id, now)
    if (!consumed) throw new InvalidOtpError()

    const baseVersion = user.version
    user.changePassword(await this.hasher.hash(command.newPassword), now)
    const updated = await this.users.update(user, baseVersion)
    if (!updated) throw new VersionConflictError()

    await this.refreshTokens.revokeAllForUser(user.id)
    return { ok: true }
  }
}
