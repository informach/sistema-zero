import { and, desc, eq, lte } from 'drizzle-orm'
import { ValidationError } from '../../../domain/shared/errors'
import type { SubscriptionRecoveryCase } from '../../../domain/subscription-recovery/recovery-case'
import {
  type ReviewedAdmissionAudit,
  type ReviewedAdmissionRepository,
  readReviewedAdmissionAudit,
} from '../../../domain/subscription-recovery/reviewed-admission.port'
import { ConcurrencyConflictError } from './concurrency.error'
import type { Database } from './db'
import {
  subscriptionRecoveryAdmissions as admissions,
  subscriptionRecoveryCases as cases,
  subscriptionRecoveryPolicy as policies,
  subscriptionRecoveryAdmissionReviews as reviews,
} from './schema'
import { insertNewRecoveryCase } from './subscription-recovery.repository'

export class DrizzleReviewedAdmissionRepository implements ReviewedAdmissionRepository {
  constructor(
    private readonly db: Database,
    private readonly clock: () => Date = () => new Date(),
  ) {}
  async findByPaymentId(paymentId: string): Promise<ReviewedAdmissionAudit | null> {
    const [row] = await this.db.select().from(reviews).where(eq(reviews.paymentId, paymentId))
    return row ? readReviewedAdmissionAudit(row) : null
  }
  async resolveAudience(input: Parameters<ReviewedAdmissionRepository['resolveAudience']>[0]) {
    if (!Number.isFinite(input.now.getTime()))
      throw new ValidationError('Instante de revisão inválido')
    const [row] = await this.db
      .select({ audience: reviews.audience })
      .from(reviews)
      .innerJoin(cases, eq(cases.id, reviews.caseId))
      .where(
        and(
          eq(cases.subscriptionId, input.subscriptionId),
          eq(cases.consumerId, input.consumerId),
          eq(cases.providerSubscriptionId, input.providerSubscriptionId),
          eq(cases.audience, reviews.audience),
          lte(reviews.approvedAt, input.now),
        ),
      )
      .orderBy(desc(reviews.approvedAt), desc(reviews.policyVersion), reviews.caseId)
      .limit(1)
    return row?.audience ?? null
  }
  async create(item: SubscriptionRecoveryCase, input: ReviewedAdmissionAudit): Promise<string> {
    const audit = readReviewedAdmissionAudit(input)
    const snapshot = item.toSnapshot()
    if (
      audit.caseId !== snapshot.id ||
      audit.paymentId !== snapshot.paymentId ||
      audit.audience !== snapshot.audience ||
      audit.policyVersion !== snapshot.policy.version ||
      audit.sourceChargeCreatedAt.getTime() !== snapshot.firstFailureAt.getTime()
    )
      throw new ValidationError('A revisão não corresponde ao acompanhamento')
    return this.db.transaction(async (tx) => {
      const [configuration] = await tx
        .select()
        .from(policies)
        .where(eq(policies.id, 1))
        .for('share')
      const now = this.clock()
      const replay = async () => {
        const [prior] = await tx
          .select()
          .from(reviews)
          .where(eq(reviews.paymentId, audit.paymentId))
        if (
          prior &&
          prior.actorId === audit.actorId &&
          prior.requestId === audit.requestId &&
          prior.audience === audit.audience
        )
          return prior.caseId
        return null
      }
      const priorId = await replay()
      if (priorId) return priorId
      if (
        !configuration?.enabled ||
        !configuration.activatedAt ||
        configuration.activatedAt > now ||
        configuration.version !== audit.policyVersion ||
        configuration.windowDays !== snapshot.policy.windowDays ||
        JSON.stringify(configuration.reminderDays) !== JSON.stringify(snapshot.policy.reminderDays)
      )
        throw new ValidationError(
          'A política mudou ou ainda não está ativa. Atualize a configuração.',
        )
      const inserted = await insertNewRecoveryCase(tx, item, audit.paymentVersion)
      if (!inserted) {
        const priorId = await replay()
        if (priorId) return priorId
        throw new ConcurrencyConflictError(snapshot.paymentId)
      }
      // Revalidate after locks. No durable review or case survives if the provider proof expired.
      const persistedAt = new Date(this.clock())
      if (persistedAt < audit.approvedAt) throw new ValidationError('Relógio da revisão divergente')
      const persisted = readReviewedAdmissionAudit({ ...audit, approvedAt: persistedAt })
      const saved = await tx
        .insert(reviews)
        .values(persisted)
        .onConflictDoNothing()
        .returning({ caseId: reviews.caseId })
      if (saved.length !== 1) throw new ConcurrencyConflictError(audit.paymentId)
      await tx
        .insert(admissions)
        .values({
          paymentId: snapshot.paymentId,
          policy: snapshot.policy,
          activatedAt: configuration.activatedAt,
          discoveredAt: persistedAt,
          state: 'ADMITTED',
          caseId: snapshot.id,
          reason: null,
          attempts: 0,
          nextAttemptAt: null,
        })
        .onConflictDoUpdate({
          target: admissions.paymentId,
          set: {
            state: 'ADMITTED',
            reason: null,
            caseId: snapshot.id,
            nextAttemptAt: null,
            leaseId: null,
            leaseUntil: null,
          },
        })
      // Admission/unique-key writes may also wait. Check again before commit, without moving the human decision time.
      const finishedAt = new Date(this.clock())
      if (finishedAt < persisted.approvedAt)
        throw new ValidationError('Relógio da revisão divergente')
      readReviewedAdmissionAudit({ ...persisted, approvedAt: finishedAt })
      return snapshot.id
    })
  }
}
