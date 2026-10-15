import { randomUUID } from 'node:crypto'
import type {
  StudioAiActor,
  StudioAiCostView,
  StudioAiFundingSource,
  StudioAiSettlement,
} from '@sistemazero/core/ai-credits'
import { and, eq, gt, isNull, sql } from 'drizzle-orm'
import { StudioAiConflictError } from '../../../domain/ai-usage/studio-ai.errors'
import type {
  StudioAiReserveInput,
  StudioAiReserveResult,
  StudioAiUsageRepository,
} from '../../../domain/ports/studio-ai-usage.port'
import { readAiUsageTotals } from './ai-usage.repository'
import type { Database } from './db'
import { aiUsageDaily, studioAiAccounts, studioAiAttempts, studioAiRuns } from './schema'
import { lockStudioAiAccount } from './studio-ai-account.repository'

type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0]
type Run = typeof studioAiRuns.$inferSelect
async function lock(tx: Transaction, accountId: string) {
  await lockStudioAiAccount(tx, accountId)
  await tx.execute(
    sql`select pg_advisory_xact_lock(hashtextextended(${`ai-usage:${accountId}`}, 0))`,
  )
}
async function ownedRun(tx: Transaction, actor: StudioAiActor, id: string): Promise<Run> {
  const [run] = await tx
    .select()
    .from(studioAiRuns)
    .where(
      and(
        eq(studioAiRuns.id, id),
        eq(studioAiRuns.accountId, actor.accountId),
        eq(studioAiRuns.userId, actor.userId),
      ),
    )
  if (!run) throw new StudioAiConflictError()
  return run
}
const active = (now: Date) => and(isNull(studioAiRuns.finishedAt), gt(studioAiRuns.expiresAt, now))!
function sameRequest(run: Run, input: StudioAiReserveInput) {
  const request = input.request
  return (
    run.userId === input.actor.userId &&
    run.projectId === request.projectId &&
    run.purpose === request.purpose &&
    run.model === request.model &&
    run.maxAttempts === request.maxAttempts &&
    run.inputBytes === request.inputBytes &&
    run.maxOutputTokens === request.maxOutputTokens
  )
}

async function liabilities(
  tx: Transaction,
  accountId: string,
  source: StudioAiFundingSource,
  day: string,
  now: Date,
) {
  // Outstanding reservations and uncertain dispatches are liabilities, not free balance.
  const liability = sql`case when ${active(now)} then greatest(${studioAiRuns.spentMicroUsd}, ${studioAiRuns.estimateMicroUsd} * ${studioAiRuns.maxAttempts}) else ${studioAiRuns.spentMicroUsd} end`
  const [costs] = await tx
    .select({
      today:
        sql<number>`coalesce(sum(case when ${studioAiRuns.day} = ${day} then ${liability} else 0 end), 0)`.mapWith(
          Number,
        ),
      month: sql<number>`coalesce(sum(${liability}), 0)`.mapWith(Number),
      runsToday: sql<number>`count(*) filter (where ${studioAiRuns.day} = ${day})`.mapWith(Number),
    })
    .from(studioAiRuns)
    .where(
      and(
        eq(studioAiRuns.accountId, accountId),
        eq(studioAiRuns.source, source),
        sql`${studioAiRuns.day} >= ${`${day.slice(0, 7)}-01`} and ${studioAiRuns.day} <= ${day}`,
      ),
    )
  return costs!
}

export class DrizzleStudioAiUsageRepository implements StudioAiUsageRepository {
  constructor(private readonly db: Database) {}
  reserve(input: StudioAiReserveInput): Promise<StudioAiReserveResult> {
    return this.db.transaction(async (tx) => {
      const { actor, request, now, limits, day } = input
      await lock(tx, actor.accountId)
      const totals = await readAiUsageTotals(tx, {
        accountId: actor.accountId,
        day,
        month: day.slice(0, 7),
        now,
      })
      const [existing] = await tx
        .select()
        .from(studioAiRuns)
        .where(eq(studioAiRuns.id, request.runId))
      if (existing) {
        if (
          existing.accountId !== actor.accountId ||
          !sameRequest(existing, input) ||
          existing.finishedAt ||
          existing.expiresAt <= now
        )
          throw new StudioAiConflictError()
        return {
          ...totals,
          allowed: true,
          source: existing.source,
          priceCaps: existing.priceCaps,
          expiresAt: existing.expiresAt,
        }
      }
      await tx
        .insert(studioAiAccounts)
        .values({ accountId: actor.accountId, updatedAt: now })
        .onConflictDoNothing()
      const [account] = await tx
        .select()
        .from(studioAiAccounts)
        .where(eq(studioAiAccounts.accountId, actor.accountId))
      const source = account!.source
      const deny = (
        scope: Extract<StudioAiReserveResult, { allowed: false }>['scope'],
      ): StudioAiReserveResult => ({ ...totals, allowed: false, source, scope })
      if (
        source === 'openrouter' &&
        (!input.externalAvailable ||
          !account!.credential ||
          !account!.externalDailyLimitMicroUsd ||
          !account!.externalMonthlyLimitMicroUsd)
      )
        return deny('connection')
      if (source === 'platform' && !actor.privileged) {
        if (totals.usedDay >= limits.dailyLimit) return deny('day')
        if (totals.usedMonth >= limits.monthlyLimit) return deny('month')
      }
      const [inflight] = await tx
        .select({ count: sql<number>`count(*)`.mapWith(Number) })
        .from(studioAiRuns)
        .where(and(eq(studioAiRuns.accountId, actor.accountId), active(now)))
      if (inflight!.count >= limits.maxConcurrent) return deny('busy')
      const costs = await liabilities(tx, actor.accountId, source, day, now)
      if (source === 'openrouter' && costs!.runsToday >= limits.externalDailyRuns)
        return deny('day')
      const reserve = input.estimateMicroUsd * request.maxAttempts
      if (
        costs!.today + reserve >
        (source === 'platform' ? limits.dailyMicroUsd : account!.externalDailyLimitMicroUsd!)
      )
        return deny('cost-day')
      if (
        costs!.month + reserve >
        (source === 'platform' ? limits.monthlyMicroUsd : account!.externalMonthlyLimitMicroUsd!)
      )
        return deny('cost-month')
      await tx.insert(studioAiRuns).values({
        id: request.runId,
        accountId: actor.accountId,
        userId: actor.userId,
        projectId: request.projectId,
        purpose: request.purpose,
        model: request.model,
        source,
        keyHash: account!.keyHash,
        day,
        inputBytes: request.inputBytes,
        maxOutputTokens: request.maxOutputTokens,
        maxAttempts: request.maxAttempts,
        estimateMicroUsd: input.estimateMicroUsd,
        priceCaps: limits.priceCaps,
        privileged: actor.privileged,
        expiresAt: input.expiresAt,
        createdAt: now,
      })
      const held = source === 'platform' ? 1 : 0
      return {
        allowed: true,
        source,
        priceCaps: limits.priceCaps,
        expiresAt: input.expiresAt,
        usedDay: totals.usedDay + held,
        usedMonth: totals.usedMonth + held,
      }
    })
  }
  dispatch(actor: StudioAiActor, runId: string, attempt: number, now: Date) {
    return this.db.transaction(async (tx) => {
      await lock(tx, actor.accountId)
      const run = await ownedRun(tx, actor, runId)
      if (
        run.finishedAt ||
        run.expiresAt <= now ||
        attempt !== run.dispatched + 1 ||
        attempt > run.maxAttempts ||
        run.spentMicroUsd + run.estimateMicroUsd > run.estimateMicroUsd * run.maxAttempts
      )
        throw new StudioAiConflictError()
      const [account] = await tx
        .select()
        .from(studioAiAccounts)
        .where(eq(studioAiAccounts.accountId, actor.accountId))
      if (
        !account ||
        account.source !== run.source ||
        (run.source === 'openrouter' && (!account.credential || account.keyHash !== run.keyHash))
      )
        throw new StudioAiConflictError()
      if (run.source === 'openrouter') {
        const outstanding = await liabilities(tx, actor.accountId, run.source, run.day, now)
        if (
          !account.externalDailyLimitMicroUsd ||
          !account.externalMonthlyLimitMicroUsd ||
          outstanding.today > account.externalDailyLimitMicroUsd ||
          outstanding.month > account.externalMonthlyLimitMicroUsd
        )
          throw new StudioAiConflictError()
      }
      if (attempt > 1) {
        const [previous] = await tx
          .select()
          .from(studioAiAttempts)
          .where(and(eq(studioAiAttempts.runId, runId), eq(studioAiAttempts.attempt, attempt - 1)))
        if (!previous || !['confirmed', 'rejected'].includes(previous.status))
          throw new StudioAiConflictError()
      }
      await tx
        .insert(studioAiAttempts)
        .values({ runId, attempt, status: 'dispatched', createdAt: now, updatedAt: now })
      if (run.source === 'platform' && !run.allowanceCharged) {
        await tx
          .insert(aiUsageDaily)
          .values({
            accountId: actor.accountId,
            day: run.day,
            feature: `studio-${run.purpose === 'tutor' ? 'zappy' : 'builder'}`,
            used: 1,
            privileged: run.privileged,
            updatedAt: now,
          })
          .onConflictDoUpdate({
            target: [aiUsageDaily.accountId, aiUsageDaily.day, aiUsageDaily.feature],
            set: {
              used: sql`${aiUsageDaily.used} + 1`,
              privileged: sql`${aiUsageDaily.privileged} or ${run.privileged}`,
              updatedAt: now,
            },
          })
      }
      await tx
        .update(studioAiRuns)
        .set({
          dispatched: attempt,
          spentMicroUsd: run.spentMicroUsd + run.estimateMicroUsd,
          allowanceCharged: run.source === 'platform' || run.allowanceCharged,
        })
        .where(eq(studioAiRuns.id, runId))
      return {
        source: run.source,
        credential: run.source === 'openrouter' ? account.credential : null,
      }
    })
  }
  settle(actor: StudioAiActor, runId: string, settlement: StudioAiSettlement, now: Date) {
    return this.db.transaction(async (tx) => {
      await lock(tx, actor.accountId)
      const run = await ownedRun(tx, actor, runId)
      const predicate = and(
        eq(studioAiAttempts.runId, runId),
        eq(studioAiAttempts.attempt, settlement.attempt),
      )!
      const [attempt] = await tx.select().from(studioAiAttempts).where(predicate)
      if (
        !attempt ||
        (attempt.generationId &&
          settlement.generationId &&
          attempt.generationId !== settlement.generationId)
      )
        throw new StudioAiConflictError()
      if (attempt.status === 'confirmed' || attempt.status === 'rejected') {
        // Lost acknowledgement can replay the same settlement, never alter a final amount.
        if (
          attempt.status === settlement.status &&
          attempt.actualMicroUsd === (settlement.actualMicroUsd ?? null)
        )
          return
        throw new StudioAiConflictError()
      }
      const cost =
        settlement.status === 'confirmed'
          ? settlement.actualMicroUsd!
          : settlement.status === 'rejected'
            ? 0
            : run.estimateMicroUsd
      await tx
        .update(studioAiAttempts)
        .set({ ...settlement, actualMicroUsd: settlement.actualMicroUsd ?? null, updatedAt: now })
        .where(predicate)
      await tx
        .update(studioAiRuns)
        .set({ spentMicroUsd: run.spentMicroUsd - run.estimateMicroUsd + cost })
        .where(eq(studioAiRuns.id, runId))
      if (run.finishedAt || settlement.status === 'rejected')
        await this.refundRejected(tx, run, now)
    })
  }
  private async refundRejected(tx: Transaction, run: Run, now: Date) {
    if (!run.allowanceCharged) return
    const [pending] = await tx
      .select({ count: sql<number>`count(*)`.mapWith(Number) })
      .from(studioAiAttempts)
      .where(and(eq(studioAiAttempts.runId, run.id), sql`${studioAiAttempts.status} <> 'rejected'`))
    if (pending!.count) return
    await tx
      .update(aiUsageDaily)
      .set({ used: sql`greatest(0, ${aiUsageDaily.used} - 1)`, updatedAt: now })
      .where(
        and(
          eq(aiUsageDaily.accountId, run.accountId),
          eq(aiUsageDaily.day, run.day),
          eq(aiUsageDaily.feature, `studio-${run.purpose === 'tutor' ? 'zappy' : 'builder'}`),
        ),
      )
    await tx
      .update(studioAiRuns)
      .set({ allowanceCharged: false })
      .where(eq(studioAiRuns.id, run.id))
  }
  finish(actor: StudioAiActor, runId: string, now: Date) {
    return this.db.transaction(async (tx) => {
      await lock(tx, actor.accountId)
      const run = await ownedRun(tx, actor, runId)
      if (run.finishedAt) return
      await tx.update(studioAiRuns).set({ finishedAt: now }).where(eq(studioAiRuns.id, runId))
      await this.refundRejected(tx, run, now)
    })
  }
  async costs(accountId: string, day: string, now: Date): Promise<StudioAiCostView> {
    const confirmed = sql`coalesce((select sum(${studioAiAttempts.actualMicroUsd}) from ${studioAiAttempts} where ${studioAiAttempts.runId} = ${studioAiRuns.id}), 0)`
    const rows = await this.db
      .select({
        source: studioAiRuns.source,
        day: studioAiRuns.day,
        confirmed: sql<number>`${confirmed}`.mapWith(Number),
        uncertain: sql<number>`${studioAiRuns.spentMicroUsd} - ${confirmed}`.mapWith(Number),
        reserved:
          sql<number>`case when ${active(now)} then greatest(0, ${studioAiRuns.estimateMicroUsd} * ${studioAiRuns.maxAttempts} - ${studioAiRuns.spentMicroUsd}) else 0 end`.mapWith(
            Number,
          ),
        calls: studioAiRuns.dispatched,
      })
      .from(studioAiRuns)
      .where(
        and(
          eq(studioAiRuns.accountId, accountId),
          sql`${studioAiRuns.day} >= ${`${day.slice(0, 7)}-01`} and ${studioAiRuns.day} <= ${day}`,
        ),
      )
    const empty = () => ({
      confirmedMicroUsd: 0,
      uncertainMicroUsd: 0,
      reservedMicroUsd: 0,
      calls: 0,
    })
    const view: StudioAiCostView = {
      day,
      month: day.slice(0, 7),
      platform: { today: empty(), month: empty() },
      openrouter: { today: empty(), month: empty() },
    }
    for (const row of rows)
      for (const period of row.day === day ? (['today', 'month'] as const) : (['month'] as const)) {
        const total = view[row.source as StudioAiFundingSource][period]
        total.confirmedMicroUsd += row.confirmed
        total.uncertainMicroUsd += row.uncertain
        total.reservedMicroUsd += row.reserved
        total.calls += row.calls
      }
    return view
  }
  claimReconciliation(now: Date, limit: number) {
    return this.db.transaction(async (tx) => {
      const rows = await tx
        .select()
        .from(studioAiAttempts)
        .where(
          and(
            sql`${studioAiAttempts.status} in ('dispatched', 'uncertain')`,
            sql`${studioAiAttempts.generationId} is not null and ${studioAiAttempts.reconcileAttempts} < 8`,
            sql`${studioAiAttempts.createdAt} < ${new Date(now.getTime() - 90_000).toISOString()}::timestamptz`,
            sql`(${studioAiAttempts.reconcileAfter} is null or ${studioAiAttempts.reconcileAfter} <= ${now.toISOString()}::timestamptz)`,
          ),
        )
        .orderBy(studioAiAttempts.createdAt)
        .limit(Math.max(1, Math.min(25, limit)))
        .for('update', { skipLocked: true })
      const jobs = []
      for (const attempt of rows) {
        // Lock only queue rows. Locking joined account rows in the opposite order to purge
        // could deadlock; these MVCC reads never acquire an account row lock.
        const [run] = await tx.select().from(studioAiRuns).where(eq(studioAiRuns.id, attempt.runId))
        if (!run) continue
        const [account] = await tx
          .select()
          .from(studioAiAccounts)
          .where(eq(studioAiAccounts.accountId, run.accountId))
        if (!account) continue
        const claimId = randomUUID()
        const usable =
          run.source === 'platform' ||
          (account.keyHash === run.keyHash && account.credential !== null)
        await tx
          .update(studioAiAttempts)
          .set({
            reconcileClaimId: claimId,
            reconcileAttempts: usable ? attempt.reconcileAttempts + 1 : 8,
            reconcileAfter: new Date(now.getTime() + 90_000),
          })
          .where(
            and(eq(studioAiAttempts.runId, run.id), eq(studioAiAttempts.attempt, attempt.attempt)),
          )
        if (usable)
          jobs.push({
            actor: { accountId: run.accountId, userId: run.userId, privileged: run.privileged },
            runId: run.id,
            attempt: attempt.attempt,
            claimId,
            generationId: attempt.generationId!,
            source: run.source,
            credential: run.source === 'openrouter' ? account.credential : null,
          })
      }
      return jobs
    })
  }
  async releaseReconciliation(runId: string, attempt: number, claimId: string, now: Date) {
    await this.db
      .update(studioAiAttempts)
      .set({
        reconcileClaimId: null,
        // Exponential backoff, capped at an hour. Eight failed attempts retain an explicit uncertain cost.
        reconcileAfter: sql`${now.toISOString()}::timestamptz + least(3600, 30 * power(2, ${studioAiAttempts.reconcileAttempts})) * interval '1 second'`,
      })
      .where(
        and(
          eq(studioAiAttempts.runId, runId),
          eq(studioAiAttempts.attempt, attempt),
          eq(studioAiAttempts.reconcileClaimId, claimId),
        ),
      )
  }
  stats(month: string, now: Date) {
    const confirmed = sql`coalesce((select sum(${studioAiAttempts.actualMicroUsd}) from ${studioAiAttempts} where ${studioAiAttempts.runId} = ${studioAiRuns.id}), 0)`
    return this.db
      .select({
        source: studioAiRuns.source,
        model: studioAiRuns.model,
        purpose: studioAiRuns.purpose,
        privileged: studioAiRuns.privileged,
        confirmedMicroUsd: sql<number>`coalesce(sum(${confirmed}), 0)`.mapWith(Number),
        uncertainMicroUsd:
          sql<number>`coalesce(sum(${studioAiRuns.spentMicroUsd} - ${confirmed}), 0)`.mapWith(
            Number,
          ),
        reservedMicroUsd:
          sql<number>`coalesce(sum(case when ${active(now)} then greatest(0, ${studioAiRuns.estimateMicroUsd} * ${studioAiRuns.maxAttempts} - ${studioAiRuns.spentMicroUsd}) else 0 end), 0)`.mapWith(
            Number,
          ),
        calls: sql<number>`coalesce(sum(${studioAiRuns.dispatched}), 0)`.mapWith(Number),
      })
      .from(studioAiRuns)
      .where(
        sql`${studioAiRuns.day} >= ${`${month}-01`}::date and ${studioAiRuns.day} < ${`${month}-01`}::date + interval '1 month'`,
      )
      .groupBy(
        studioAiRuns.source,
        studioAiRuns.model,
        studioAiRuns.purpose,
        studioAiRuns.privileged,
      )
      .orderBy(
        studioAiRuns.source,
        studioAiRuns.model,
        studioAiRuns.purpose,
        studioAiRuns.privileged,
      )
  }
}
