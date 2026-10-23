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

type RewardTransaction = Parameters<Parameters<Database['transaction']>[0]>[0]
type RewardAwarder = Pick<AwardGamificationService, 'awardPensaMilestone'>
class RewardAwardFailed extends Error {}

/** The command event is the durable outbox; ledger keys make repeated delivery safe. */
export class DrizzlePensaRewardsRepository {
  constructor(
    readonly db: Database,
    readonly awardsForTransaction: (tx: RewardTransaction) => RewardAwarder,
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
      try {
        const delivered = await this.db.transaction(async (tx) => {
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
          if (fence || !pending) return false
          const reward = rewardSchema.parse(pending.reward)
          const result = await this.awardsForTransaction(tx).awardPensaMilestone({
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
            // The service is fail-open for ordinary learning. Here a null result
            // must roll back even non-SQL failures after a partial award.
            throw new RewardAwardFailed('Pensa reward delivery failed')
          }
          await tx
            .update(pensaExecutionEvents)
            .set({ rewardStatus: 'completed' })
            .where(eq(pensaExecutionEvents.id, event.id))
          return true
        })
        if (delivered) completed += 1
      } catch (error) {
        if (!(error instanceof RewardAwardFailed)) throw error
        // Count only after the shared transaction has rolled back successfully.
        failed += 1
      }
    }
    return { completed, failed }
  }
}
