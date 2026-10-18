import { and, eq, sql } from 'drizzle-orm'
import { z } from 'zod'
import type { AwardGamificationService } from '../../../application/gamification/award-gamification.service'
import type { Database } from './db'
import { accountDeletionFences, pensaExecutionEvents } from './schema'

const rewardSchema = z.strictObject({
  audience: z.enum(['adult', 'kids']).optional(),
  xp: z.number().int().positive(),
  coins: z.number().int().nonnegative(),
  privileged: z.boolean(),
  sourceType: z.enum(['pensa_stage_complete', 'pensa_cycle_complete']),
})

/** The command event is the durable outbox; ledger keys make repeated delivery safe. */
export class DrizzlePensaRewardsRepository {
  constructor(
    readonly db: Database,
    readonly awards: AwardGamificationService,
  ) {}
  async work() {
    const rows = await this.db
      .select()
      .from(pensaExecutionEvents)
      .where(eq(pensaExecutionEvents.rewardStatus, 'pending'))
      .limit(25)
    let completed = 0,
      failed = 0
    for (const event of rows) {
      await this.db.transaction(async (tx) => {
        await tx.execute(
          sql`select pg_advisory_xact_lock(hashtextextended(${`members-account:${event.accountId}`}, 0))`,
        )
        const [fence] = await tx
          .select()
          .from(accountDeletionFences)
          .where(eq(accountDeletionFences.accountId, event.accountId))
        const [pending] = await tx
          .select()
          .from(pensaExecutionEvents)
          .where(
            and(
              eq(pensaExecutionEvents.id, event.id),
              eq(pensaExecutionEvents.rewardStatus, 'pending'),
            ),
          )
          .for('update')
        if (fence || !pending) return
        const reward = rewardSchema.parse(pending.reward)
        const result = await this.awards.awardPensaMilestone({
          userId: event.profileId,
          audience: reward.audience,
          accountId: event.accountId,
          eventId: event.id,
          projectCompleted: reward.sourceType === 'pensa_cycle_complete',
          xp: reward.xp,
          coins: reward.coins,
          privileged: reward.privileged,
        })
        if (!result) {
          failed += 1
          return
        }
        await tx
          .update(pensaExecutionEvents)
          .set({ rewardStatus: 'completed' })
          .where(eq(pensaExecutionEvents.id, event.id))
        completed += 1
      })
    }
    return { completed, failed }
  }
}
