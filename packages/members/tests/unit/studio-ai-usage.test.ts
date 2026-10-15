import { expect, test } from 'bun:test'
import { StudioAiUsageService } from '../../src/application/ai-usage/studio-ai-usage.service'
import type { StudioAiReserveInput } from '../../src/domain/ports/studio-ai-usage.port'

const actor = { accountId: crypto.randomUUID(), userId: crypto.randomUUID(), privileged: false }
const request = {
  runId: crypto.randomUUID(),
  projectId: 'local',
  purpose: 'tutor' as const,
  model: 'test/model',
  inputBytes: 1000,
  maxOutputTokens: 2000,
  maxAttempts: 3,
}
const limits = {
  dailyLimit: 50,
  monthlyLimit: 500,
  dailyMicroUsd: 1_000_000,
  monthlyMicroUsd: 10_000_000,
  maxConcurrent: 2,
  externalDailyRuns: 200,
  priceCaps: { prompt: 1, completion: 4, request: 0 as const },
}
test('service reserves conservative text/schema/repair cost and limits tutor attempts before any provider permission', async () => {
  const reserved: StudioAiReserveInput[] = []
  const service = new StudioAiUsageService({
    vault: null,
    limits,
    clock: () => new Date('2026-10-15T02:59:00Z'),
    repository: {
      reserve: async (input: StudioAiReserveInput) => {
        reserved.push(input)
        return {
          allowed: true,
          source: 'platform',
          priceCaps: limits.priceCaps,
          usedDay: 1,
          usedMonth: 1,
          expiresAt: input.expiresAt,
        }
      },
    } as never,
  })
  const outcome = await service.reserve(actor, request)
  expect(reserved[0]).toMatchObject({
    day: '2026-10-14',
    estimateMicroUsd: 14_096,
    externalAvailable: false,
  })
  expect(outcome.credits).toMatchObject({ dayRemaining: 49, studioSource: 'platform' })
  for (const invalid of [
    { ...request, maxAttempts: 4 },
    { ...request, inputBytes: 256_001 },
    { ...request, maxOutputTokens: 8001 },
  ]) {
    const [result] = await Promise.allSettled([service.reserve(actor, invalid)])
    expect(result?.status).toBe('rejected')
  }
  expect(reserved).toHaveLength(1)
})
test('vault failure before returning a permit records a confirmed non-dispatch and never leaks ciphertext', async () => {
  const records: unknown[] = []
  const service = new StudioAiUsageService({
    limits,
    vault: {
      seal: () => '',
      open: () => {
        throw new Error('secret-ciphertext')
      },
    },
    repository: {
      dispatch: async () => ({ source: 'openrouter', credential: 'encrypted' }),
      settle: async (...args: unknown[]) => {
        records.push(args[2])
      },
    } as never,
  })
  const [result] = await Promise.allSettled([service.dispatch(actor, request.runId, 1)])
  expect(records).toEqual([{ attempt: 1, status: 'rejected' }])
  expect(result?.status).toBe('rejected')
  if (result?.status === 'rejected')
    expect(result.reason.message).not.toContain('secret-ciphertext')
})
