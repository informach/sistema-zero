import type { KidsSessionClaim } from '@sistemazero/core/security'

export interface StudyGrant {
  id: string
  accountUserId: string
  profileId: string
  deviceId: string
  label: string
  expiresAt: Date
  revokedAt: Date | null
  lastUsedAt: Date | null
  createdAt: Date
}

export interface StudyDevice {
  id: string
  accountUserId: string
  activeSessionId: string | null
  expiresAt: Date
}

export interface StudyCodeInput {
  id: string
  codeHash: string
  accountUserId: string
  profileId: string
  label: string
  durationDays: number
  expiresAt: Date
}

/** Quantas linhas cada etapa da purga apagou (para o log do ciclo). */
export interface StudyPurgeResult {
  codes: number
  attempts: number
  grants: number
  devices: number
}

export interface StudyAccessRepository {
  createCode(input: StudyCodeInput): Promise<void>
  /**
   * Código + aparelho + autorização são reivindicados na mesma transação. Navegador de
   * OUTRA família com autorização viva → `DeviceOtherFamilyError` (o código não é consumido);
   * sem autorização viva, o navegador passa para a família do código no mesmo commit.
   */
  redeemCode(input: {
    codeHash: string
    deviceHash: string
    expectedProfileId?: string
    now: Date
  }): Promise<StudyGrant | null>
  /** Mesma regra de família do `redeemCode`, para o "Liberar este computador". */
  createGrant(input: {
    accountUserId: string
    profileId: string
    deviceHash: string
    label: string
    expiresAt: Date
    now: Date
  }): Promise<StudyGrant | null>
  getDevice(deviceHash: string, now: Date): Promise<StudyDevice | null>
  listGrants(accountUserId: string, profileId?: string): Promise<StudyGrant[]>
  /** Troca atômica do contexto ativo do navegador; revoga a família infantil anterior. */
  activate(
    deviceHash: string,
    profileId: string,
    sessionId: string,
    now: Date,
  ): Promise<StudyGrant | null>
  suspend(deviceHash: string, now: Date): Promise<void>
  /** Esquece o navegador da família do responsável; de outra família → `DeviceOtherFamilyError`. */
  forgetDevice(deviceHash: string, accountUserId: string, now: Date): Promise<void>
  renew(accountUserId: string, grantId: string, expiresAt: Date, now: Date): Promise<boolean>
  rename(accountUserId: string, grantId: string, label: string): Promise<boolean>
  /** Encerra a autorização E a sessão infantil que estiver aberta com ela no navegador. */
  revoke(accountUserId: string, grantId: string, now: Date): Promise<boolean>
  revokeOnDevice(deviceHash: string, profileId: string, now: Date): Promise<void>
  /** Consulta canônica em toda autorização: família, conta, perfil e aparelho. */
  validateSession(
    claim: KidsSessionClaim,
    accountUserId: string,
    profileId: string | null,
    now: Date,
  ): Promise<boolean>
  /** Conta UMA tentativa na chave; `false` quando ela passou do limite da janela. */
  takeAttempt(keyHash: string, now: Date): Promise<boolean>
  /** A chave já esgotou as tentativas da janela? Só LÊ (não conta). */
  attemptsExhausted(keyHash: string, now: Date): Promise<boolean>
  /**
   * Purga em lotes até esvaziar (com teto por ciclo): códigos, tentativas e aparelhos
   * expirados antes de `expiredBefore`; autorizações encerradas ou vencidas antes de
   * `grantsEndedBefore` (retenção própria, mais longa).
   */
  deleteExpired(expiredBefore: Date, grantsEndedBefore: Date): Promise<StudyPurgeResult>
}
