/** Finalidade do código OTP: login sem senha (`sign_in`) ou recuperação de senha. */
export const OTP_PURPOSES = ['sign_in', 'password_reset'] as const
export type OtpPurpose = (typeof OTP_PURPOSES)[number]

/** Linha persistida de um código OTP (somente o HASH do código é guardado). */
export interface OtpCodeRecord {
  id: string
  userId: string
  purpose: OtpPurpose
  codeHash: string
  expiresAt: Date
  consumedAt: Date | null
  attempts: number
}

export interface CreateOtpCodeInput {
  id: string
  userId: string
  purpose: OtpPurpose
  codeHash: string
  expiresAt: Date
}

/**
 * Persistência de códigos OTP de uso único. O código (6 dígitos) NUNCA é guardado
 * — só o `codeHash` (sha256). Um código ativo por (usuário, finalidade): emitir um
 * novo consome os pendentes. `attempts` limita a adivinhação online (lock por tentativas).
 */
export interface OtpCodeRepository {
  create(input: CreateOtpCodeInput): Promise<void>
  /** O código ativo (não consumido, não expirado) do usuário p/ a finalidade. */
  findActive(userId: string, purpose: OtpPurpose, now: Date): Promise<OtpCodeRecord | null>
  /** Marca o código como consumido (uso único). Idempotente. */
  consume(id: string, at: Date): Promise<void>
  /** Consome os pendentes do usuário p/ a finalidade (ao emitir um novo). Idempotente. */
  consumeAllForUser(userId: string, purpose: OtpPurpose, at: Date): Promise<void>
  /** Incrementa o contador de tentativas e devolve o novo total. */
  incrementAttempts(id: string): Promise<number>
}
