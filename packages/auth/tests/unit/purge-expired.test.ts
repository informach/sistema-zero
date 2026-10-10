import { describe, expect, test } from 'bun:test'
import type { Logger } from '@sistemazero/core/logging'
import { purgeExpiredRecords } from '../../src/application/maintenance/purge-expired'
import { STUDY_GRANT_RETENTION_MS } from '../../src/domain/study-access/policy'

function recordingLogger() {
  const events: { level: string; event: string }[] = []
  const log = (level: string) => (event: string) => void events.push({ level, event })
  const logger: Logger = {
    debug: log('debug'),
    info: log('info'),
    warn: log('warn'),
    error: log('error'),
  }
  return { logger, events }
}

describe('ciclo da purga', () => {
  const graceMs = 7 * 86_400_000
  const auditRetentionMs = 365 * 86_400_000
  const counting = (calls: Date[]) => ({
    deleteExpired: async (before: Date) => {
      calls.push(before)
      return 1
    },
  })

  test('falha na purga do acesso por aparelho não pula a dos tokens', async () => {
    const { logger, events } = recordingLogger()
    const calls: Date[] = []
    await purgeExpiredRecords(
      {
        logger,
        study: {
          deleteExpired: async () => {
            throw new Error('statement timeout')
          },
        },
        refreshTokens: counting(calls),
        passwordResetTokens: counting(calls),
        otpCodes: counting(calls),
        impersonationTokens: counting(calls),
        auditLogs: counting(calls),
        graceMs,
        auditRetentionMs,
      },
      1_800_000_000_000,
    )
    expect(calls).toHaveLength(5)
    expect(events).toContainEqual({ level: 'error', event: 'study_access.purge.failed' })
    expect(events).toContainEqual({ level: 'info', event: 'tokens.purged' })
  })

  test('autorizações encerradas usam a retenção própria de 90 dias', async () => {
    const { logger } = recordingLogger()
    const now = 1_800_000_000_000
    let received: Date[] = []
    await purgeExpiredRecords(
      {
        logger,
        study: {
          deleteExpired: async (expired, grants) => {
            received = [expired, grants]
            return { codes: 0, attempts: 0, grants: 0, devices: 0 }
          },
        },
        refreshTokens: counting([]),
        passwordResetTokens: counting([]),
        otpCodes: counting([]),
        impersonationTokens: counting([]),
        auditLogs: counting([]),
        graceMs,
        auditRetentionMs,
      },
      now,
    )
    expect(received).toEqual([new Date(now - graceMs), new Date(now - STUDY_GRANT_RETENTION_MS)])
    expect(STUDY_GRANT_RETENTION_MS).toBe(90 * 86_400_000)
  })
})
