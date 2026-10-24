import { and, asc, eq, gt, lte, sql } from 'drizzle-orm'
import { z } from 'zod'
import { ValidationError } from '../../../domain/shared/errors'
import type { RecoveryMessageReceipt } from '../../../domain/subscription-recovery/recovery-messaging.port'
import type {
  RecoveryNoticeRepository,
  RecoveryNoticeSnapshot,
} from '../../../domain/subscription-recovery/recovery-notice.port'
import type { RecoveryLease } from '../../../domain/subscription-recovery/recovery-repository.port'
import { ConcurrencyConflictError } from './concurrency.error'
import type { Database } from './db'
import {
  subscriptionRecoveryCases as cases,
  subscriptionRecoveryNotices as notices,
} from './schema'

const envelopeSchema = z
  .strictObject({
    channel: z.enum(['email', 'whatsapp']),
    templateKey: z.string().min(1).max(64),
    recipient: z.strictObject({
      name: z.string().trim().min(1).max(200),
      email: z.email().max(254).optional(),
      phone: z.string().min(8).max(20).optional(),
    }),
    variables: z
      .record(z.string().min(1).max(64), z.string().max(2_000))
      .refine((value) => Object.keys(value).length <= 50),
  })
  .refine((value) =>
    value.channel === 'email' ? Boolean(value.recipient.email) : Boolean(value.recipient.phone),
  )

type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0]
function validTime(now: Date) {
  if (!Number.isFinite(now.getTime())) throw new ValidationError('Relógio do aviso inválido')
}
async function owned(tx: Transaction, lease: RecoveryLease, now: Date) {
  validTime(now)
  const snapshot = lease.item.toSnapshot()
  const [row] = await tx
    .select()
    .from(cases)
    .where(
      and(
        eq(cases.id, snapshot.id),
        eq(cases.version, snapshot.version),
        eq(cases.leaseId, lease.leaseId),
        gt(cases.leaseUntil, now),
      ),
    )
    .for('update')
  if (!row) throw new ConcurrencyConflictError(snapshot.id)
  return row
}
function restore(row: typeof notices.$inferSelect): RecoveryNoticeSnapshot {
  const { messageId, messageStatus, acceptedAt, deliveredAt, observedAt, ...data } = row
  return structuredClone({
    ...data,
    receipt:
      messageId && messageStatus && acceptedAt
        ? {
            id: messageId,
            status: messageStatus,
            acceptedAt,
            deliveredAt,
          }
        : null,
    observedAt,
  })
}
const statuses = [
  'QUEUED',
  'SCHEDULED',
  'SENDING',
  'SENT',
  'DELIVERED',
  'READ',
  'FAILED',
  'SUPPRESSED',
] as const

export class DrizzleRecoveryNoticeRepository implements RecoveryNoticeRepository {
  constructor(private readonly db: Database) {}

  async prepare(
    lease: RecoveryLease,
    input: Parameters<RecoveryNoticeRepository['prepare']>[1],
  ): Promise<RecoveryNoticeSnapshot> {
    validTime(input.now)
    const envelope = envelopeSchema.safeParse(input.request)
    if (
      !envelope.success ||
      !Number.isSafeInteger(input.day) ||
      new TextEncoder().encode(JSON.stringify(envelope.data)).byteLength > 32_768
    )
      throw new ValidationError('Conteúdo do aviso inválido')
    return this.db.transaction(async (tx) => {
      await owned(tx, lease, input.now)
      // The owned aggregate may already contain the freshly checked terminal transition.
      // Its final save and replay use this same fenced case authority.
      const item = lease.item.toSnapshot()
      const [existing] = await tx
        .select()
        .from(notices)
        .where(
          and(
            eq(notices.caseId, item.id),
            eq(notices.purpose, input.purpose),
            eq(notices.day, input.day),
          ),
        )
      // The original payload wins after a crash, even if account contact/template data changed.
      if (existing) return restore(existing)
      const initial =
        input.purpose === 'INITIAL' &&
        input.day === 0 &&
        item.state === 'OPEN' &&
        item.initialNoticeId === null
      const reminder =
        input.purpose === 'REMINDER' &&
        item.state === 'OPEN' &&
        item.initialNoticeAcceptedAt !== null &&
        item.deadlineAt !== null &&
        input.now < item.deadlineAt &&
        item.policy.reminderDays.includes(input.day) &&
        input.day > item.lastReminderDay &&
        input.now.getTime() >= item.initialNoticeAcceptedAt.getTime() + input.day * 86_400_000
      const closed =
        input.day === 0 &&
        ((input.purpose === 'RECOVERED' && item.state === 'RECOVERED') ||
          (input.purpose === 'CANCELED' && item.state === 'CANCELED'))
      if ((!initial && !reminder && !closed) || input.now < item.openedAt)
        throw new ValidationError('Aviso incompatível com o caso atual')
      const [created] = await tx
        .insert(notices)
        .values({
          id: crypto.randomUUID(),
          caseId: item.id,
          purpose: input.purpose,
          day: input.day,
          request: {
            ...envelope.data,
            idempotencyKey: `subscription-recovery:${item.id}:${input.purpose}:${input.day}`,
          },
          createdAt: input.now,
        })
        .returning()
      if (!created) throw new Error('Registro do aviso não confirmado')
      return restore(created)
    })
  }

  async listForCase(caseId: string): Promise<RecoveryNoticeSnapshot[]> {
    return (
      await this.db
        .select()
        .from(notices)
        .where(eq(notices.caseId, caseId))
        .orderBy(asc(notices.createdAt), asc(notices.id))
    ).map(restore)
  }

  async recordAttempt(lease: RecoveryLease, noticeId: string, now: Date): Promise<void> {
    await this.db.transaction(async (tx) => {
      const item = await owned(tx, lease, now)
      const [row] = await tx
        .update(notices)
        .set({ attemptCount: sql`${notices.attemptCount} + 1`, lastAttemptAt: now })
        .where(
          and(eq(notices.id, noticeId), eq(notices.caseId, item.id), lte(notices.createdAt, now)),
        )
        .returning({ id: notices.id })
      if (!row) throw new ValidationError('Aviso não pertence ao caso')
    })
  }

  async recordReceipt(
    lease: RecoveryLease,
    noticeId: string,
    receipt: RecoveryMessageReceipt,
    now: Date,
  ): Promise<void> {
    validTime(now)
    if (
      !z.uuid().safeParse(receipt.id).success ||
      !statuses.includes(receipt.status) ||
      !Number.isFinite(receipt.acceptedAt.getTime()) ||
      receipt.acceptedAt > now ||
      (['DELIVERED', 'READ'].includes(receipt.status) && receipt.deliveredAt === null) ||
      (receipt.deliveredAt &&
        (!Number.isFinite(receipt.deliveredAt.getTime()) ||
          receipt.deliveredAt < receipt.acceptedAt ||
          receipt.deliveredAt > now))
    )
      throw new ValidationError('Recibo do aviso inválido')
    await this.db.transaction(async (tx) => {
      const item = await owned(tx, lease, now)
      const [existing] = await tx
        .select()
        .from(notices)
        .where(and(eq(notices.id, noticeId), eq(notices.caseId, item.id)))
      if (
        !existing ||
        receipt.acceptedAt < existing.createdAt ||
        (existing.messageId !== null &&
          (existing.messageId !== receipt.id ||
            existing.acceptedAt?.getTime() !== receipt.acceptedAt.getTime())) ||
        (existing.observedAt && now < existing.observedAt)
      )
        throw new ValidationError('Recibo não corresponde ao aviso persistido')
      // Terminal evidence cannot be replaced by an older queued observation.
      if (
        existing.messageStatus &&
        ['READ', 'DELIVERED', 'FAILED', 'SUPPRESSED'].includes(existing.messageStatus) &&
        receipt.status !== existing.messageStatus &&
        !(existing.messageStatus === 'DELIVERED' && receipt.status === 'READ')
      )
        throw new ValidationError('Recibo tenta regredir uma conclusão de entrega')
      if (existing.deliveredAt && existing.deliveredAt.getTime() !== receipt.deliveredAt?.getTime())
        throw new ValidationError('Evidência de entrega não pode ser retirada')
      await tx
        .update(notices)
        .set({
          messageId: receipt.id,
          messageStatus: receipt.status,
          acceptedAt: receipt.acceptedAt,
          deliveredAt: receipt.deliveredAt,
          observedAt: now,
        })
        .where(eq(notices.id, existing.id))
    })
  }
}
