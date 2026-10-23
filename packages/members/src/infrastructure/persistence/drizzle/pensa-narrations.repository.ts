import type { PensaActor } from '@sistemazero/core/pensa'
import { and, eq, sql } from 'drizzle-orm'
import { z } from 'zod'
import { pensaError } from '../../../domain/pensa/project.errors'
import type { DrizzlePensaProjectRepository } from './pensa-project.repository'
import { lockPensaAccount } from './pensa-reservations'
import { accountDeletionFences, privateNarrations } from './schema'

export const PensaVoiceRequestSchema = z.strictObject({
  type: z.enum(['claim', 'commit', 'fail']),
  id: z.string().regex(/^[a-f0-9]{64}$/),
  chars: z.number().int().min(1).max(4_000),
  leaseId: z.uuid(),
  projectId: z.uuid().optional(),
})

export class DrizzlePensaNarrationsRepository {
  constructor(readonly projects: DrizzlePensaProjectRepository) {}
  async voice(actor: PensaActor, input: z.infer<typeof PensaVoiceRequestSchema>) {
    return this.projects.db.transaction(async (tx) => {
      await lockPensaAccount(tx, actor.accountId)
      const [fence] = await tx
        .select()
        .from(accountDeletionFences)
        .where(eq(accountDeletionFences.accountId, actor.accountId))
      if (fence) pensaError('PROJECT_GONE', 'Esta conta não está disponível.')
      if (input.projectId) await this.projects.load(tx, actor, input.projectId, true)
      const now = this.projects.clock()
      const [old] = await tx
        .select()
        .from(privateNarrations)
        .where(eq(privateNarrations.id, input.id))
        .for('update')
      if (
        old &&
        (old.profileId !== actor.profileId ||
          old.accountId !== actor.accountId ||
          old.projectId !== (input.projectId ?? null) ||
          old.chars !== input.chars)
      )
        pensaError('PROJECT_GONE', 'Esta voz não está disponível.')
      const prefix = input.projectId
        ? `creations/${actor.profileId}/pensa/${input.projectId}/voice/${input.id}`
        : `creations/${actor.profileId}/voice/${input.id}`
      const key = `${prefix}/${input.leaseId}.mp3`
      if (old?.status === 'ready' && input.type === 'claim')
        return { status: 'ready' as const, key: `${prefix}/${old.leaseId}.mp3` }
      if (input.type !== 'claim') {
        if (
          !old ||
          old.leaseId !== input.leaseId ||
          (old.status !== 'ready' && old.leaseUntil <= now)
        )
          pensaError('REVISION_CONFLICT', 'Este pedido de voz ficou antigo.')
        await tx
          .update(privateNarrations)
          .set({ status: input.type === 'commit' ? 'ready' : 'failed', leaseUntil: now })
          .where(eq(privateNarrations.id, input.id))
        return { status: input.type === 'commit' ? ('ready' as const) : ('waiting' as const), key }
      }
      if (old?.status === 'generating' && old.leaseUntil > now)
        return { status: 'waiting' as const, key: `${prefix}/${old.leaseId}.mp3` }
      const day = new Date(now)
      day.setUTCHours(0, 0, 0, 0)
      const month = new Date(day)
      month.setUTCDate(1)
      const [used] = await tx
        .select({
          day: sql<number>`coalesce(sum(case when ${privateNarrations.createdAt} >= ${day.toISOString()} then ${privateNarrations.chars} * ${privateNarrations.attempts} else 0 end),0)`,
          month: sql<number>`coalesce(sum(${privateNarrations.chars} * ${privateNarrations.attempts}),0)`,
        })
        .from(privateNarrations)
        .where(
          and(
            eq(privateNarrations.accountId, actor.accountId),
            sql`${privateNarrations.createdAt} >= ${month.toISOString()}`,
          ),
        )
      if (
        (old?.attempts ?? 0) >= 2 ||
        Number(used?.day ?? 0) + input.chars > 6_000 ||
        Number(used?.month ?? 0) + input.chars > 60_000
      )
        pensaError('QUOTA_EXCEEDED', 'A voz descansou por hoje. O texto continua disponível.')
      const leaseUntil = new Date(now.getTime() + 120_000)
      if (old)
        await tx
          .update(privateNarrations)
          .set({
            status: 'generating',
            attempts: old.attempts + 1,
            createdAt: now,
            leaseId: input.leaseId,
            leaseUntil,
          })
          .where(eq(privateNarrations.id, input.id))
      else
        await tx.insert(privateNarrations).values({
          id: input.id,
          projectId: input.projectId ?? null,
          profileId: actor.profileId,
          accountId: actor.accountId,
          chars: input.chars,
          status: 'generating',
          leaseId: input.leaseId,
          leaseUntil,
          createdAt: now,
        })
      return { status: 'generate' as const, key }
    })
  }
}
