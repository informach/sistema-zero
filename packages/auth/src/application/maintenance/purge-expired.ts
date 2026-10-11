import type { Logger } from '@sistemazero/core/logging'
import type { StudyAccessRepository } from '../../domain/ports/study-access-repository.port'
import { STUDY_GRANT_RETENTION_MS } from '../../domain/study-access/policy'

interface Purgeable {
  deleteExpired(before: Date): Promise<number>
}

export interface PurgeDeps {
  logger: Logger
  study: Pick<StudyAccessRepository, 'deleteExpired'>
  refreshTokens: Purgeable
  passwordResetTokens: Purgeable
  otpCodes: Purgeable
  impersonationTokens: Purgeable
  auditLogs: Purgeable
  /** Folga dos tokens expirados (preserva a detecção tardia de reuso). */
  graceMs: number
  /** Retenção PRÓPRIA da auditoria (compliance, bem mais longa). */
  auditRetentionMs: number
}

/**
 * Um ciclo da purga periódica (quem chama segura o advisory lock entre réplicas).
 * ⚠️ A purga do acesso por aparelho roda isolada: se ela falhar, a das sessões, códigos
 * e auditoria segue no MESMO ciclo. Antes, um erro nela derrubava o ciclo inteiro e as
 * tabelas de tokens (que crescem a cada login) paravam de ser limpas.
 */
export async function purgeExpiredRecords(deps: PurgeDeps, now = Date.now()): Promise<void> {
  const cutoff = new Date(now - deps.graceMs)
  try {
    const study = await deps.study.deleteExpired(cutoff, new Date(now - STUDY_GRANT_RETENTION_MS))
    if (study.codes + study.attempts + study.grants + study.devices > 0)
      deps.logger.info('study_access.purged', { ...study })
  } catch (error) {
    deps.logger.error('study_access.purge.failed', {
      error: error instanceof Error ? error.message : String(error),
    })
  }
  const auditCutoff = new Date(now - deps.auditRetentionMs)
  const [refresh, reset, otp, impersonation, audit] = await Promise.all([
    deps.refreshTokens.deleteExpired(cutoff),
    deps.passwordResetTokens.deleteExpired(cutoff),
    deps.otpCodes.deleteExpired(cutoff),
    deps.impersonationTokens.deleteExpired(cutoff),
    deps.auditLogs.deleteExpired(auditCutoff),
  ])
  if (refresh + reset + otp + impersonation + audit > 0)
    deps.logger.info('tokens.purged', { refresh, reset, otp, impersonation, audit })
}
