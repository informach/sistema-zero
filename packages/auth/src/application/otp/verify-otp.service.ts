import { InvalidOtpError } from '../../domain/otp/otp.errors'
import type { OtpCodeRepository } from '../../domain/ports/otp-code-repository.port'
import type { UserRepository } from '../../domain/ports/user-repository.port'
import { newParentKidsSession } from '../../domain/study-access/policy'
import { PasswordNotSetError, UserNotActiveError } from '../../domain/user/user.errors'
import { toUserView, type UserView } from '../mappers/user-view'
import type { AuthTokenService, AuthTokens } from '../tokens/auth-token.service'
import { codeMatchesHash } from './otp-code'

export interface VerifyOtpOptions {
  /** Tetos de palpites errados antes de o código travar (consumido). */
  maxAttempts: number
}

export interface VerifyOtpCommand {
  platform?: 'main' | 'kids'
  email: string
  code: string
  userAgent?: string | null
  ip?: string | null
}

/**
 * Login por OTP (passwordless): valida o código `sign_in` e emite tokens — mesmo
 * retorno do login por senha (`{ user, tokens }`). Erro GENÉRICO em qualquer falha
 * (anti-enumeração); o código é consumido no sucesso e TRAVA após `maxAttempts`
 * palpites errados (mitiga adivinhação online do código de 6 dígitos).
 */
export class VerifyOtpService {
  constructor(
    private readonly users: UserRepository,
    private readonly otpCodes: OtpCodeRepository,
    private readonly tokens: AuthTokenService,
    private readonly opts: VerifyOtpOptions,
  ) {}

  async execute(command: VerifyOtpCommand): Promise<{ user: UserView; tokens: AuthTokens }> {
    const email = command.email.trim().toLowerCase()
    const user = await this.users.findByEmail(email)
    if (!user) throw new InvalidOtpError()

    const now = new Date()
    const record = await this.otpCodes.findActive(user.id, 'sign_in', now)
    if (!record) throw new InvalidOtpError()

    if (!codeMatchesHash(command.code, record.codeHash)) {
      const attempts = await this.otpCodes.incrementAttempts(record.id)
      if (attempts >= this.opts.maxAttempts) await this.otpCodes.consume(record.id, now)
      throw new InvalidOtpError()
    }

    // Código correto, mas conta inativa → não consome (não pode logar mesmo).
    if (!user.isActive()) throw new UserNotActiveError('Conta inativa')

    // No Kids, o OTP autentica diretamente o responsável, inclusive antes de
    // definir uma senha. Os outros produtos conservam a política de primeiro acesso.
    if (!user.isPasswordSet() && command.platform !== 'kids') throw new PasswordNotSetError()

    const consumed = await this.otpCodes.consume(record.id, now)
    if (!consumed) throw new InvalidOtpError()
    const tokens = await this.tokens.issueForUser(user, {
      // Kids: sessão ADULTA com prazo absoluto de 12 h (sem deslizar no refresh).
      ...(command.platform === 'kids' ? newParentKidsSession() : {}),
      userAgent: command.userAgent,
      ip: command.ip,
    })
    return { user: toUserView(user), tokens }
  }
}
