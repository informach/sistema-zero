import { and, asc, eq, gt, gte, isNull, lt, lte, notExists, or, sql } from 'drizzle-orm'
import { ValidationError } from '../../../domain/shared/errors'
import type {
  RecoveryAdmissionLease,
  RecoveryAdmissionRepository,
} from '../../../domain/subscription-recovery/recovery-admission.port'
import { snapshotRecoveryPolicy } from '../../../domain/subscription-recovery/recovery-policy'
import { ConcurrencyConflictError } from './concurrency.error'
import type { Database } from './db'
import {
  subscriptionRecoveryAdmissions as admissions,
  subscriptionRecoveryCases as cases,
  payments,
  subscriptionRecoveryPolicy as policies,
  subscriptions,
} from './schema'

function validBatch(input: { now: Date; limit: number }) {
  if (
    !Number.isFinite(input.now.getTime()) ||
    !Number.isSafeInteger(input.limit) ||
    input.limit < 1 ||
    input.limit > 100
  )
    throw new ValidationError('Lote de entrada da regularização inválido')
}

export class DrizzleRecoveryAdmissionRepository implements RecoveryAdmissionRepository {
  constructor(private readonly db: Database) {}

  async discover(input: { now: Date; limit: number }): Promise<number> {
    validBatch(input)
    return this.db.transaction(async (tx) => {
      // A short shared lock freezes the operational policy; no provider I/O here.
      const [configuration] = await tx
        .select()
        .from(policies)
        .where(eq(policies.id, 1))
        .for('share')
      if (
        !configuration?.enabled ||
        !configuration.activatedAt ||
        configuration.activatedAt > input.now
      )
        return 0
      const activatedAt = configuration.activatedAt
      // A different case may have closed after this origin was ignored. Reconsider
      // bounded origins, retaining their frozen policy and total attempt count.
      const rearmed = await tx.execute<{ payment_id: string }>(sql`
        with eligible as (
          select a.payment_id from payments.subscription_recovery_admissions a
          join payments.payments p on p.id = a.payment_id
          join payments.subscriptions s on s.id = p.subscription_id and s.consumer_id = p.consumer_id
          where a.state = 'IGNORED' and a.reason = 'CASE_EXISTS' and a.attempts < 5
            and p.status = 'FAILED' and p.method = 'CREDIT_CARD' and p.updated_at >= a.activated_at
            and s.status = 'ACTIVE' and s.cancel_requested_at is null and s.cycles_completed > 0
            and p.provider = s.provider and p.currency = 'BRL' and p.amount_in_cents = s.amount_in_cents
            and s.currency = 'BRL' and p.provider_payment_id is not null and s.provider_subscription_id is not null
            and not exists (select 1 from payments.subscription_recovery_cases c where c.payment_id = p.id)
            and not exists (select 1 from payments.subscription_recovery_cases c where c.subscription_id = s.id
              and c.state in ('OPEN', 'PAYMENT_PENDING', 'CANCEL_PENDING', 'MANUAL_REVIEW'))
          order by a.discovered_at, a.payment_id limit ${input.limit} for update of a skip locked
        )
        update payments.subscription_recovery_admissions a
        set state = 'PENDING', reason = null, next_attempt_at = ${input.now.toISOString()}::timestamptz,
          lease_id = null, lease_until = null
        from eligible e where a.payment_id = e.payment_id returning a.payment_id
      `)
      const remaining = input.limit - rearmed.length
      if (!remaining) return rearmed.length
      const rows = await tx
        .select({ id: payments.id })
        .from(payments)
        .innerJoin(subscriptions, eq(subscriptions.id, payments.subscriptionId))
        .where(
          and(
            eq(payments.status, 'FAILED'),
            eq(payments.method, 'CREDIT_CARD'),
            gte(payments.updatedAt, configuration.activatedAt),
            lte(payments.updatedAt, input.now),
            eq(subscriptions.status, 'ACTIVE'),
            gt(subscriptions.cyclesCompleted, 0),
            isNull(subscriptions.cancelRequestedAt),
            notExists(
              tx
                .select({ id: admissions.paymentId })
                .from(admissions)
                .where(eq(admissions.paymentId, payments.id)),
            ),
          ),
        )
        .orderBy(asc(payments.updatedAt), asc(payments.id))
        .limit(remaining)
        .for('share')
      if (!rows.length) return rearmed.length
      const inserted = await tx
        .insert(admissions)
        .values(
          rows.map((row) => ({
            paymentId: row.id,
            policy: snapshotRecoveryPolicy({
              version: configuration.version,
              windowDays: configuration.windowDays,
              reminderDays: configuration.reminderDays,
            }),
            activatedAt,
            discoveredAt: input.now,
            state: 'PENDING' as const,
            nextAttemptAt: input.now,
          })),
        )
        .onConflictDoNothing()
        .returning({ id: admissions.paymentId })
      return inserted.length + rearmed.length
    })
  }

  async claim(input: {
    now: Date
    leaseMs: number
    limit: number
  }): Promise<RecoveryAdmissionLease[]> {
    validBatch(input)
    if (!Number.isSafeInteger(input.leaseMs) || input.leaseMs < 60_000 || input.leaseMs > 900_000)
      throw new ValidationError('Lease de entrada da regularização inválido')
    return this.db.transaction(async (tx) => {
      const [configuration] = await tx
        .select({ enabled: policies.enabled })
        .from(policies)
        .where(eq(policies.id, 1))
        .for('share')
      if (!configuration?.enabled) return []
      // A process can crash on its final attempt. Make the exhausted row visible,
      // rather than leave it permanently PENDING and out of the claim index.
      await tx
        .update(admissions)
        .set({
          state: 'REVIEW',
          reason: 'PROVIDER_UNAVAILABLE',
          nextAttemptAt: null,
          leaseId: null,
          leaseUntil: null,
        })
        .where(
          and(
            eq(admissions.state, 'PENDING'),
            eq(admissions.attempts, 5),
            or(isNull(admissions.leaseUntil), lte(admissions.leaseUntil, input.now)),
          ),
        )
      const rows = await tx
        .select()
        .from(admissions)
        .where(
          and(
            eq(admissions.state, 'PENDING'),
            lt(admissions.attempts, 5),
            lte(admissions.nextAttemptAt, input.now),
            or(isNull(admissions.leaseUntil), lte(admissions.leaseUntil, input.now)),
          ),
        )
        .orderBy(asc(admissions.nextAttemptAt), asc(admissions.paymentId))
        .limit(input.limit)
        .for('update', { skipLocked: true })
      const leases: RecoveryAdmissionLease[] = []
      for (const row of rows) {
        const leaseId = crypto.randomUUID()
        const leaseUntil = new Date(input.now.getTime() + input.leaseMs)
        await tx
          .update(admissions)
          .set({ leaseId, leaseUntil, attempts: row.attempts + 1 })
          .where(eq(admissions.paymentId, row.paymentId))
        leases.push({
          paymentId: row.paymentId,
          policy: snapshotRecoveryPolicy(row.policy),
          activatedAt: row.activatedAt,
          discoveredAt: row.discoveredAt,
          attempts: row.attempts + 1,
          leaseId,
          leaseUntil,
        })
      }
      return leases
    })
  }

  async complete(
    lease: RecoveryAdmissionLease,
    decision: Parameters<RecoveryAdmissionRepository['complete']>[1],
    now: Date,
  ): Promise<void> {
    if (!Number.isFinite(now.getTime())) throw new ValidationError('Relógio inválido')
    await this.db.transaction(async (tx) => {
      if (decision.state === 'ADMITTED') {
        const [origin] = await tx
          .select({ paymentId: cases.paymentId })
          .from(cases)
          .where(eq(cases.id, decision.caseId))
          .for('share')
        if (origin?.paymentId !== lease.paymentId)
          throw new ValidationError('O caso não pertence à origem da regularização')
      }
      const rows = await tx
        .update(admissions)
        .set({ ...decision, nextAttemptAt: null, leaseId: null, leaseUntil: null })
        .where(
          and(
            eq(admissions.paymentId, lease.paymentId),
            eq(admissions.state, 'PENDING'),
            eq(admissions.leaseId, lease.leaseId),
            gt(admissions.leaseUntil, now),
          ),
        )
        .returning({ id: admissions.paymentId })
      if (rows.length !== 1) throw new ConcurrencyConflictError(lease.paymentId)
    })
  }

  async retry(lease: RecoveryAdmissionLease, now: Date): Promise<void> {
    if (lease.attempts >= 5)
      return this.complete(
        lease,
        { state: 'REVIEW', reason: 'PROVIDER_UNAVAILABLE', caseId: null },
        now,
      )
    if (!Number.isFinite(now.getTime())) throw new ValidationError('Relógio inválido')
    const rows = await this.db
      .update(admissions)
      .set({ nextAttemptAt: new Date(now.getTime() + 120_000), leaseId: null, leaseUntil: null })
      .where(
        and(
          eq(admissions.paymentId, lease.paymentId),
          eq(admissions.state, 'PENDING'),
          eq(admissions.leaseId, lease.leaseId),
          gt(admissions.leaseUntil, now),
        ),
      )
      .returning({ id: admissions.paymentId })
    if (rows.length !== 1) throw new ConcurrencyConflictError(lease.paymentId)
  }
}
