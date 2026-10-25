import { eq } from 'drizzle-orm'
import { ValidationError } from '../../../domain/shared/errors'
import {
  INITIAL_RECOVERY_POLICY,
  snapshotRecoveryPolicy,
} from '../../../domain/subscription-recovery/recovery-policy'
import type {
  RecoveryPolicyConfiguration,
  RecoveryPolicyRepository,
} from '../../../domain/subscription-recovery/recovery-policy-repository.port'
import { ConcurrencyConflictError } from './concurrency.error'
import type { Database } from './db'
import {
  subscriptionRecoveryPolicyAudit as audit,
  subscriptionRecoveryPolicy as policy,
} from './schema'

function configuration(row: typeof policy.$inferSelect): RecoveryPolicyConfiguration {
  return {
    policy: snapshotRecoveryPolicy({
      version: row.version,
      windowDays: row.windowDays,
      reminderDays: row.reminderDays,
    }),
    enabled: row.enabled,
    activatedAt: row.activatedAt,
    updatedAt: row.updatedAt,
    updatedBy: row.updatedBy,
  }
}
function auditValues(row: typeof policy.$inferSelect) {
  return {
    version: row.version,
    actorId: row.updatedBy,
    createdAt: row.updatedAt,
    snapshot: {
      ...row,
      updatedAt: row.updatedAt.toISOString(),
      activatedAt: row.activatedAt?.toISOString() ?? null,
    },
  }
}

export class DrizzleRecoveryPolicyRepository implements RecoveryPolicyRepository {
  constructor(private readonly db: Database) {}
  async get(): Promise<RecoveryPolicyConfiguration | null> {
    const [row] = await this.db.select().from(policy).where(eq(policy.id, 1))
    return row ? configuration(row) : null
  }
  async initialize(now: Date): Promise<RecoveryPolicyConfiguration> {
    if (!Number.isFinite(now.getTime())) throw new ValidationError('Relógio inválido')
    return this.db.transaction(async (tx) => {
      const [inserted] = await tx
        .insert(policy)
        .values({
          id: 1,
          ...INITIAL_RECOVERY_POLICY,
          enabled: false,
          activatedAt: null,
          updatedAt: now,
          updatedBy: 'system:initial-policy',
        })
        .onConflictDoNothing()
        .returning()
      if (inserted) {
        await tx.insert(audit).values(auditValues(inserted))
        return configuration(inserted)
      }
      const [current] = await tx.select().from(policy).where(eq(policy.id, 1))
      if (!current) throw new Error('Inicialização da política não confirmada')
      return configuration(current)
    })
  }
  async update(
    input: Parameters<RecoveryPolicyRepository['update']>[0],
  ): Promise<RecoveryPolicyConfiguration> {
    if (
      !Number.isSafeInteger(input.expectedVersion) ||
      input.expectedVersion < 1 ||
      !Number.isFinite(input.now.getTime()) ||
      !input.actorId.trim() ||
      input.actorId.length > 128
    )
      throw new ValidationError('Alteração da política inválida')
    const next = snapshotRecoveryPolicy({
      version: input.expectedVersion + 1,
      windowDays: input.windowDays,
      reminderDays: input.reminderDays,
    })
    return this.db.transaction(async (tx) => {
      const [current] = await tx.select().from(policy).where(eq(policy.id, 1)).for('update')
      if (!current || current.version !== input.expectedVersion)
        throw new ConcurrencyConflictError('subscription-recovery-policy')
      if (input.now < current.updatedAt)
        throw new ValidationError('Relógio anterior à configuração atual')
      const [updated] = await tx
        .update(policy)
        .set({
          ...next,
          enabled: input.enabled,
          activatedAt: input.enabled && !current.enabled ? input.now : current.activatedAt,
          updatedAt: input.now,
          updatedBy: input.actorId,
        })
        .where(eq(policy.id, 1))
        .returning()
      if (!updated) throw new Error('Alteração da política não confirmada')
      await tx.insert(audit).values(auditValues(updated))
      return configuration(updated)
    })
  }
}
