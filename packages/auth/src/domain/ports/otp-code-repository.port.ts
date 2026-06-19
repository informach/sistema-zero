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
  /**
   * Emite um novo código de forma ATÔMICA: serializa por (usuário, finalidade),
   * aplica cooldown, consome os pendentes e cria a nova linha. Retorna `false`
   * quando o cooldown barra a emissão.
   */
  createReplacingActive(
    input: CreateOtpCodeInput,
    at: Date,
    cooldownSeconds?: number,
  ): Promise<boolean>
  /** O código ativo (não consumido, não expirado) do usuário p/ a finalidade. */
  findActive(userId: string, purpose: OtpPurpose, now: Date): Promise<OtpCodeRecord | null>
  /**
   * Marca o código como consumido de forma ATÔMICA. Retorna `false` quando outra
   * requisição já consumiu o mesmo código.
   */
  consume(id: string, at: Date): Promise<boolean>
  /** Consome os pendentes do usuário p/ a finalidade (ao emitir um novo). Idempotente. */
  consumeAllForUser(userId: string, purpose: OtpPurpose, at: Date): Promise<void>
  /** Incrementa o contador de tentativas e devolve o novo total. */
  incrementAttempts(id: string): Promise<number>
  /**
   * Quando foi a ÚLTIMA emissão (consumida ou não) do usuário p/ a finalidade —
   * base do cooldown anti-spam (`null` = nunca emitiu). Olha TODAS as linhas:
   * cada pedido consome os pendentes, então só o ativo não serviria de âncora.
   */
  lastIssuedAt(userId: string, purpose: OtpPurpose): Promise<Date | null>
  /** Apaga códigos expirados antes de `before` (purga periódica). Retorna o nº removido. */
  deleteExpired(before: Date): Promise<number>
}
