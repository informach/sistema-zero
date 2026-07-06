import { InvalidOtpError } from '../../domain/otp/otp.errors'
import type { OtpCodeRepository } from '../../domain/ports/otp-code-repository.port'
import type { UserRepository } from '../../domain/ports/user-repository.port'
import { PasswordNotSetError, UserNotActiveError } from '../../domain/user/user.errors'
import { toUserView, type UserView } from '../mappers/user-view'
import type { AuthTokenService, AuthTokens } from '../tokens/auth-token.service'
import { codeMatchesHash } from './otp-code'

export interface VerifyOtpOptions {
  /** Tetos de palpites errados antes de o código travar (consumido). */
  maxAttempts: number
}

export interface VerifyOtpCommand {
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

    // Código correto, mas a conta NUNCA definiu a senha (convite/compra pendente):
    // barra o login por código — senão a pessoa entra numa sessão que a área dos
    // pais (valida a senha real) nunca deixa passar. Não consome o código (o login
    // não pode acontecer mesmo); a saída é o link de 1º acesso / "esqueci a senha".
    if (!user.isPasswordSet()) throw new PasswordNotSetError()

    const consumed = await this.otpCodes.consume(record.id, now)
    if (!consumed) throw new InvalidOtpError()
    const tokens = await this.tokens.issueForUser(user, {
      userAgent: command.userAgent,
      ip: command.ip,
    })
    return { user: toUserView(user), tokens }
  }
}
