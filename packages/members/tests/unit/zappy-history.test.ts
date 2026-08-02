import { describe, expect, test } from 'bun:test'
import { ZappyHistoryService } from '../../src/application/zappy/zappy-history.service'
import type {
  ReserveZappyQuestionInput,
  ZappyRepository,
} from '../../src/domain/ports/zappy-repository.port'

describe('ZappyHistoryService', () => {
  test('renova a expiração deslizante em 30 dias sem receber snapshot', async () => {
    let reserved: ReserveZappyQuestionInput | null = null
    let prunedAt: Date | null = null
    const now = new Date('2026-08-02T12:00:00.000Z')
    const repository = {
      history: async () => [],
      reserveQuestion: async (input: ReserveZappyQuestionInput) => {
        reserved = input
        return { created: true, questionId: 'question-1' }
      },
      completeQuestion: async (input: { response: unknown }) => input.response,
      deleteHistory: async () => undefined,
      setFeedback: async () => true,
      pruneExpired: async (at) => {
        prunedAt = at
        return 0
      },
      metrics: async () => ({
        questions: 0,
        useful: 0,
        notUseful: 0,
        refusals: 0,
        needsContext: 0,
        quota: 0,
        errors: 0,
        averageLatencyMs: 0,
      }),
    } as ZappyRepository
    const service = new ZappyHistoryService(repository, () => now)
    await service.reserve({
      userId: 'profile-1',
      accountId: 'account-1',
      projectId: 'project-1',
      clientMessageId: 'message-1',
      question: 'Como pulo?',
    })
    const captured = reserved as ReserveZappyQuestionInput | null
    expect(captured?.expiresAt.toISOString()).toBe('2026-09-01T12:00:00.000Z')
    expect(Object.keys(captured ?? {})).not.toContain('context')
    expect(Object.keys(captured ?? {})).not.toContain('snapshot')
    await service.pruneExpired()
    const capturedPrunedAt = prunedAt as Date | null
    expect(capturedPrunedAt?.toISOString()).toBe(now.toISOString())
  })
})
