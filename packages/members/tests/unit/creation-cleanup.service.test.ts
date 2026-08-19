import { describe, expect, test } from 'bun:test'
import { CreationCleanupService } from '../../src/application/admin/creation-cleanup/creation-cleanup.service'

describe('CreationCleanupService', () => {
  test('falha agenda backoff exponencial monotônico a partir da tentativa', async () => {
    const now = new Date('2026-08-19T14:00:00.000Z')
    const retryAt: Date[] = []
    const service = new CreationCleanupService(
      {
        claimDue: async () => null,
        complete: async () => false,
        fail: async (_id, _error, _now, nextRetryAt) => {
          retryAt.push(nextRetryAt)
          return true
        },
      },
      () => now,
    )

    await service.fail('job-1', 'falhou', 1)
    await service.fail('job-1', 'falhou outra vez', 3)

    expect(retryAt.map((date) => date.toISOString())).toEqual([
      '2026-08-19T14:01:00.000Z',
      '2026-08-19T14:04:00.000Z',
    ])
  })
})
