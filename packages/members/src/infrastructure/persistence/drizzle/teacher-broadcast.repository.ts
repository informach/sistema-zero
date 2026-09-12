import { randomUUID } from 'node:crypto'
import { and, desc, eq, gt, inArray, isNotNull, isNull, sql } from 'drizzle-orm'
import type {
  TeacherBroadcast,
  TeacherBroadcastRepository,
  TeacherRecipient,
} from '../../../domain/ports/teacher-broadcast-repository.port'
import { ValidationError } from '../../../domain/shared/errors'
import { stableJson } from '../../../domain/shared/stable-json'
import type { Database } from './db'
import {
  accountDeletionFences,
  teacherBroadcasts as broadcasts,
  teacherBroadcastRecipients as recipients,
  teacherMessages,
  teacherThreads,
} from './schema'

export class DrizzleTeacherBroadcastRepository implements TeacherBroadcastRepository {
  constructor(private readonly db: Database) {}

  async create(
    input: Omit<TeacherBroadcast, 'sentAt' | 'recipients' | 'delivered' | 'failed' | 'read'>,
    audience: TeacherRecipient[],
  ) {
    await this.db.transaction(async (tx) => {
      const [created] = await tx.insert(broadcasts).values(input).onConflictDoNothing().returning()
      if (!created) {
        const [existing] = await tx.select().from(broadcasts).where(eq(broadcasts.id, input.id))
        if (
          !existing ||
          existing.authorId !== input.authorId ||
          existing.body !== input.body ||
          existing.title !== input.title ||
          stableJson(existing.audience) !== stableJson(input.audience)
        )
          throw new ValidationError('Identificador de envio já utilizado.')
        return
      }
      const accounts = [...new Set(audience.map((r) => r.accountId))].sort()
      if (!accounts.length) throw new ValidationError('Nenhum destinatário disponível.')
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended('members-account:' || account_id, 0)) from unnest(array[${sql.join(
          accounts.map((id) => sql`${id}::uuid`),
          sql`, `,
        )}]) as a(account_id) order by account_id`,
      )
      const fences = new Set(
        (
          await tx
            .select()
            .from(accountDeletionFences)
            .where(inArray(accountDeletionFences.accountId, accounts))
        ).map((r) => r.accountId),
      )
      const selected = audience.filter((r) => !fences.has(r.accountId))
      if (!selected.length)
        throw new ValidationError('Nenhum destinatário disponível. Prepare novamente.')
      for (let i = 0; i < selected.length; i += 200) {
        await tx.insert(recipients).values(
          selected.slice(i, i + 200).map((recipient) => ({
            ...recipient,
            broadcastId: input.id,
            threadId: randomUUID(),
          })),
        )
      }
    })
  }

  async find(id: string): Promise<TeacherBroadcast | null> {
    const [broadcast] = await this.db.select().from(broadcasts).where(eq(broadcasts.id, id))
    if (!broadcast) return null
    const [counts] = await this.db
      .select({
        recipients: sql<number>`count(*)::int`,
        delivered: sql<number>`count(*) filter (where ${recipients.status} = 'delivered')::int`,
        failed: sql<number>`count(*) filter (where ${recipients.status} = 'failed')::int`,
        read: sql<number>`count(*) filter (where ${teacherThreads.studentLastReadAt} >= ${recipients.deliveredAt})::int`,
      })
      .from(recipients)
      .leftJoin(teacherThreads, eq(teacherThreads.id, recipients.threadId))
      .where(eq(recipients.broadcastId, id))
    return {
      ...broadcast,
      recipients: counts?.recipients ?? 0,
      delivered: counts?.delivered ?? 0,
      failed: counts?.failed ?? 0,
      read: counts?.read ?? 0,
    }
  }

  async list() {
    const rows = await this.db
      .select({ id: broadcasts.id })
      .from(broadcasts)
      .where(isNotNull(broadcasts.sentAt))
      .orderBy(desc(broadcasts.createdAt))
      .limit(50)
    const result = await Promise.all(rows.map((row) => this.find(row.id)))
    return result.filter((row): row is TeacherBroadcast => row !== null)
  }

  async recipients(id: string, offset: number, limit: number) {
    return this.db
      .select({
        profileId: recipients.profileId,
        accountId: recipients.accountId,
        name: recipients.name,
        accountName: recipients.accountName,
        accountEmail: recipients.accountEmail,
        threadId: recipients.threadId,
        status: recipients.status,
        read: sql<boolean>`coalesce(${teacherThreads.studentLastReadAt} >= ${recipients.deliveredAt}, false)`,
      })
      .from(recipients)
      .leftJoin(teacherThreads, eq(teacherThreads.id, recipients.threadId))
      .where(eq(recipients.broadcastId, id))
      .orderBy(recipients.name, recipients.profileId)
      .limit(limit)
      .offset(offset)
  }

  async confirm(id: string, authorId: string, now: Date) {
    const rows = await this.db
      .update(broadcasts)
      .set({ sentAt: sql`coalesce(${broadcasts.sentAt}, ${now.toISOString()}::timestamptz)` })
      .where(
        and(
          eq(broadcasts.id, id),
          eq(broadcasts.authorId, authorId),
          sql`(${broadcasts.sentAt} is not null or ${broadcasts.createdAt} > ${new Date(now.getTime() - 30 * 60_000).toISOString()}::timestamptz)`,
        ),
      )
      .returning({ id: broadcasts.id })
    return rows.length > 0
  }

  async retry(id: string) {
    await this.db
      .update(recipients)
      .set({ status: 'pending' })
      .where(and(eq(recipients.broadcastId, id), eq(recipients.status, 'failed')))
  }

  async deliverBatch(now: Date, limit: number) {
    // Prévias abandonadas têm retenção curta; nenhum envio ocorreu antes de confirmar.
    await this.db
      .delete(broadcasts)
      .where(
        and(
          isNull(broadcasts.sentAt),
          gt(sql`${now.toISOString()}::timestamptz - interval '1 day'`, broadcasts.createdAt),
        ),
      )
    let delivered = 0
    for (let i = 0; i < limit; i++) {
      const result = await this.db.transaction(async (tx) => {
        const [row] = await tx
          .select({ recipient: recipients, broadcast: broadcasts })
          .from(recipients)
          .innerJoin(broadcasts, eq(broadcasts.id, recipients.broadcastId))
          .where(and(eq(recipients.status, 'pending'), isNotNull(broadcasts.sentAt)))
          .orderBy(broadcasts.sentAt, recipients.profileId)
          .limit(1)
          .for('update', { skipLocked: true })
        if (!row) return 'empty'
        const { recipient, broadcast } = row
        const key = and(
          eq(recipients.broadcastId, broadcast.id),
          eq(recipients.profileId, recipient.profileId),
        )
        const lock = await tx.execute<{ locked: boolean }>(
          sql`select pg_try_advisory_xact_lock(hashtextextended(${`members-account:${recipient.accountId}`}, 0)) as locked`,
        )
        if (!lock[0]?.locked) return 'busy'
        try {
          await tx.transaction(async (delivery) => {
            const [deleted] = await delivery
              .select()
              .from(accountDeletionFences)
              .where(eq(accountDeletionFences.accountId, recipient.accountId))
              .limit(1)
            if (deleted) throw new Error('Conta removida')
            await delivery.insert(teacherThreads).values({
              id: recipient.threadId,
              userId: recipient.profileId,
              accountId: recipient.accountId,
              audience: 'kids',
              contextType: 'general',
              broadcastId: broadcast.id,
              courseId: broadcast.audience.kind === 'course' ? broadcast.audience.courseId : null,
              title: broadcast.title,
              lastMessageAt: now,
              createdAt: now,
            })
            await delivery.insert(teacherMessages).values({
              id: recipient.threadId,
              threadId: recipient.threadId,
              authorRole: 'teacher',
              authorId: broadcast.authorId,
              authorName: broadcast.authorName,
              body: broadcast.body,
              createdAt: now,
            })
            await delivery
              .update(recipients)
              .set({ status: 'delivered', deliveredAt: now })
              .where(key)
          })
          return 'delivered'
        } catch {
          await tx.update(recipients).set({ status: 'failed' }).where(key)
          return 'failed'
        }
      })
      if (result === 'empty') break
      if (result === 'delivered') delivered++
    }
    return delivered
  }
}
