import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import type { StudioAiActor } from '@sistemazero/core/ai-credits'
import type { StudioAiReserveInput } from '../../src/domain/ports/studio-ai-usage.port'
import { DrizzleAiUsageRepository } from '../../src/infrastructure/persistence/drizzle/ai-usage.repository'
import type { DbConnection } from '../../src/infrastructure/persistence/drizzle/db'
import { DrizzleStudioAiAccountRepository } from '../../src/infrastructure/persistence/drizzle/studio-ai-account.repository'
import { DrizzleStudioAiUsageRepository } from '../../src/infrastructure/persistence/drizzle/studio-ai-usage.repository'
import { openStudioReviewDatabase } from './studio-review-database'

const url = process.env.STUDIO_REVIEW_DATABASE_URL
describe.skipIf(!url)('Studio AI ledger — real PostgreSQL', () => {
  let db: DbConnection,
    repo: DrizzleStudioAiUsageRepository,
    accountsRepo: DrizzleStudioAiAccountRepository
  const accounts: string[] = []
  const now = new Date('2026-10-15T12:00:00Z')
  beforeAll(async () => {
    db = await openStudioReviewDatabase(url!)
    repo = new DrizzleStudioAiUsageRepository(db.db)
    accountsRepo = new DrizzleStudioAiAccountRepository(db.db)
  })
  afterAll(async () => {
    if (!db) return
    for (const id of accounts) {
      await db.sql`delete from members.studio_ai_accounts where account_id = ${id}`
      await db.sql`delete from members.ai_usage_daily where account_id = ${id}`
    }
    await db.close()
  })
  const actor = (): StudioAiActor => {
    const id = randomUUID()
    accounts.push(id)
    return { accountId: id, userId: randomUUID(), privileged: false }
  }
  // Await I/O before passing the result to Bun's synchronous rejection matcher.
  // Bun 1.3.11 on Windows stalls postgres-js BEGIN when .rejects.toThrow drives this promise.
  async function rejected(operation: Promise<unknown>) {
    const [result] = await Promise.allSettled([operation])
    expect(result).toMatchObject({ status: 'rejected', reason: { code: 'STUDIO_AI_CONFLICT' } })
  }
  const input = (a = actor()): StudioAiReserveInput => ({
    actor: a,
    now,
    day: '2026-10-15',
    estimateMicroUsd: 20,
    expiresAt: new Date(now.getTime() + 300_000),
    externalAvailable: true,
    request: {
      runId: randomUUID(),
      projectId: 'local-project',
      purpose: 'tutor',
      model: 'test/model',
      inputBytes: 1000,
      maxOutputTokens: 100,
      maxAttempts: 3,
    },
    limits: {
      dailyLimit: 2,
      monthlyLimit: 10,
      dailyMicroUsd: 1000,
      monthlyMicroUsd: 10_000,
      maxConcurrent: 2,
      externalDailyRuns: 200,
      priceCaps: { prompt: 1, completion: 4, request: 0 },
    },
  })
  test('siblings cannot overbook the family allowance; duplicate reservations do not add holds', async () => {
    const first = input(),
      second = input({ ...first.actor, userId: randomUUID() }),
      third = input(first.actor)
    const outcomes = await Promise.all([first, second, third].map((i) => repo.reserve(i)))
    expect(outcomes.filter((o) => o.allowed)).toHaveLength(2)
    expect(outcomes.find((o) => !o.allowed)).toMatchObject({ scope: 'day' })
    const accepted = [first, second, third].find((_, index) => outcomes[index]!.allowed)!
    expect(await repo.reserve(accepted)).toMatchObject({ allowed: true, usedDay: 2 })
    // The old Pensa/Mural counter sees the same outstanding holds.
    const legacy = await new DrizzleAiUsageRepository(db.db).consume({
      accountId: first.actor.accountId,
      day: first.day,
      month: '2026-10',
      feature: 'pensa-chat',
      privileged: false,
      dailyLimit: 2,
      monthlyLimit: 10,
      now,
    })
    expect(legacy.allowed).toBe(false)
    await repo.finish(accepted.actor, accepted.request.runId, now)
    expect(await repo.reserve(input(first.actor))).toMatchObject({ allowed: true, usedDay: 2 })
  })
  test('one-use dispatch, three confirmed repairs, one interaction, idempotent settlement', async () => {
    const i = input()
    await repo.reserve(i)
    const attempts = await Promise.allSettled([
      repo.dispatch(i.actor, i.request.runId, 1, now),
      repo.dispatch(i.actor, i.request.runId, 1, now),
    ])
    expect(attempts.filter((a) => a.status === 'fulfilled')).toHaveLength(1)
    for (let n = 1; n <= 3; n++) {
      if (n > 1) await repo.dispatch(i.actor, i.request.runId, n, now)
      const settlement = {
        attempt: n,
        status: 'confirmed' as const,
        actualMicroUsd: 3,
        generationId: `gen-${randomUUID()}`,
      }
      await repo.settle(i.actor, i.request.runId, settlement, now)
      await repo.settle(i.actor, i.request.runId, settlement, now)
    }
    await repo.finish(i.actor, i.request.runId, now)
    await repo.finish(i.actor, i.request.runId, now)
    const costs = await repo.costs(i.actor.accountId, i.day, now)
    expect(costs.platform.today).toEqual({
      confirmedMicroUsd: 9,
      uncertainMicroUsd: 0,
      reservedMicroUsd: 0,
      calls: 3,
    })
    expect(
      (
        await db.sql`select used from members.ai_usage_daily where account_id = ${i.actor.accountId}`
      )[0]?.used,
    ).toBe(1)
    const stats = await repo.stats('2026-10', now)
    expect(
      stats.some(
        (row) =>
          row.source === 'platform' && row.model === 'test/model' && row.confirmedMicroUsd >= 9,
      ),
    ).toBe(true)
  })
  test('timeout keeps conservative liability after lease expiry, blocks retry and accepts late usage', async () => {
    const i = input()
    await repo.reserve(i)
    await repo.dispatch(i.actor, i.request.runId, 1, now)
    const generationId = `gen-${randomUUID()}`
    await repo.settle(
      i.actor,
      i.request.runId,
      { attempt: 1, status: 'uncertain', generationId },
      now,
    )
    await rejected(repo.dispatch(i.actor, i.request.runId, 2, now))
    const later = new Date(now.getTime() + 600_000)
    expect((await repo.costs(i.actor.accountId, i.day, later)).platform.today).toEqual({
      confirmedMicroUsd: 0,
      uncertainMicroUsd: 20,
      reservedMicroUsd: 0,
      calls: 1,
    })
    await repo.settle(
      i.actor,
      i.request.runId,
      { attempt: 1, status: 'confirmed', actualMicroUsd: 7, generationId },
      later,
    )
    expect(
      (await repo.costs(i.actor.accountId, i.day, later)).platform.today.confirmedMicroUsd,
    ).toBe(7)
  })
  test('confirmed provider rejection refunds the single interaction; zero-cost valid response does not', async () => {
    const i = input()
    await repo.reserve(i)
    await repo.dispatch(i.actor, i.request.runId, 1, now)
    await repo.settle(i.actor, i.request.runId, { attempt: 1, status: 'rejected' }, now)
    await repo.finish(i.actor, i.request.runId, now)
    await repo.finish(i.actor, i.request.runId, now)
    expect(
      (
        await db.sql`select used from members.ai_usage_daily where account_id = ${i.actor.accountId}`
      )[0]?.used,
    ).toBe(0)
    const next = input(i.actor)
    await repo.reserve(next)
    await repo.dispatch(next.actor, next.request.runId, 1, now)
    await repo.settle(
      next.actor,
      next.request.runId,
      { attempt: 1, status: 'confirmed', actualMicroUsd: 0 },
      now,
    )
    await repo.finish(next.actor, next.request.runId, now)
    expect(
      (
        await db.sql`select used from members.ai_usage_daily where account_id = ${i.actor.accountId}`
      )[0]?.used,
    ).toBe(1)
  })
  test('concurrent reservations cannot exceed daily monetary budget even with free interactions', async () => {
    const i = input()
    i.limits.dailyMicroUsd = 100
    i.actor.privileged = true
    const second = { ...i, request: { ...i.request, runId: randomUUID() } }
    const result = await Promise.all([repo.reserve(i), repo.reserve(second)])
    expect(result.filter((r) => r.allowed)).toHaveLength(1)
    expect(result.find((r) => !r.allowed)).toMatchObject({ scope: 'cost-day' })
  })
  test('external key and source stay pinned; disconnect never spends included credits', async () => {
    const i = input()
    await accountsRepo.policy(
      i.actor.accountId,
      { source: 'platform', externalDailyLimitMicroUsd: 1000, externalMonthlyLimitMicroUsd: 5000 },
      now,
    )
    expect(
      await accountsRepo.connect(i.actor.accountId, 0, 'encrypted-only', 'a'.repeat(64), now),
    ).toBe(true)
    await accountsRepo.policy(
      i.actor.accountId,
      {
        source: 'openrouter',
        externalDailyLimitMicroUsd: 1000,
        externalMonthlyLimitMicroUsd: 5000,
      },
      now,
    )
    expect(await repo.reserve(i)).toMatchObject({ source: 'openrouter', usedDay: 0 })
    expect(await repo.dispatch(i.actor, i.request.runId, 1, now)).toEqual({
      source: 'openrouter',
      credential: 'encrypted-only',
    })
    await repo.settle(
      i.actor,
      i.request.runId,
      { attempt: 1, status: 'confirmed', actualMicroUsd: 2 },
      now,
    )
    await accountsRepo.policy(
      i.actor.accountId,
      { source: 'openrouter', externalDailyLimitMicroUsd: 10, externalMonthlyLimitMicroUsd: 5000 },
      now,
    )
    await rejected(repo.dispatch(i.actor, i.request.runId, 2, now))
    await accountsRepo.disconnect(i.actor.accountId, now)
    await rejected(repo.dispatch(i.actor, i.request.runId, 2, now))
    expect(await repo.reserve(input(i.actor))).toMatchObject({
      allowed: false,
      scope: 'connection',
    })
    expect(
      await db.sql`select used from members.ai_usage_daily where account_id = ${i.actor.accountId}`,
    ).toHaveLength(0)
  })
  test('another profile cannot dispatch/settle/finish a sibling run', async () => {
    const i = input()
    await repo.reserve(i)
    const sibling = { ...i.actor, userId: randomUUID() }
    await rejected(repo.dispatch(sibling, i.request.runId, 1, now))
    await rejected(repo.finish(sibling, i.request.runId, now))
    await rejected(repo.reserve({ ...i, actor: sibling }))
  })
  test('two reconciliation workers cannot claim the same generation; release applies backoff', async () => {
    const i = input()
    await repo.reserve(i)
    await repo.dispatch(i.actor, i.request.runId, 1, now)
    await repo.settle(
      i.actor,
      i.request.runId,
      { attempt: 1, status: 'uncertain', generationId: `gen-${randomUUID()}` },
      now,
    )
    const later = new Date(now.getTime() + 120_000)
    const jobs = (
      await Promise.all([repo.claimReconciliation(later, 25), repo.claimReconciliation(later, 25)])
    )
      .flat()
      .filter((job) => job.runId === i.request.runId)
    expect(jobs).toHaveLength(1)
    await repo.releaseReconciliation(i.request.runId, 1, jobs[0]!.claimId, later)
    expect(
      (await repo.claimReconciliation(later, 25)).some((job) => job.runId === i.request.runId),
    ).toBe(false)
    const next = await repo.claimReconciliation(new Date(later.getTime() + 120_000), 25)
    expect(next.some((job) => job.runId === i.request.runId)).toBe(true)
  })
  test('adult runs cannot be read, dispatched or finished through Kids, while account budgets stay shared', async () => {
    const adult = input()
    adult.actor = { ...adult.actor, userId: adult.actor.accountId, audience: 'adult' }
    expect(await repo.reserve(adult)).toMatchObject({ allowed: true, usedDay: 1 })
    const kids = { ...adult.actor, audience: 'kids' as const }
    await rejected(repo.reserve({ ...adult, actor: kids }))
    await rejected(repo.dispatch(kids, adult.request.runId, 1, now))
    await rejected(repo.finish(kids, adult.request.runId, now))
    const sibling = input({ ...kids, userId: randomUUID() })
    expect(await repo.reserve(sibling)).toMatchObject({ allowed: true, usedDay: 2 })
    expect(await repo.reserve(input(adult.actor))).toMatchObject({ allowed: false, scope: 'day' })
    const rows =
      await db.sql`select audience from members.studio_ai_runs where id = ${adult.request.runId}`
    expect(rows[0]?.audience).toBe('adult')
    await repo.finish(adult.actor, adult.request.runId, now)
    await repo.finish(sibling.actor, sibling.request.runId, now)
  })
})
