import { ForbiddenError } from '@sistemazero/core/http'
import { eq, sql } from 'drizzle-orm'
import type { LearningOwner } from '../../../domain/ports/learning-repository.port'
import type { Database } from './db'
import { accountDeletionFences } from './schema'

type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0]

/** Account → owner → block/lesson, in the same order as purge and broadcast delivery. */
export async function lockLearningOwner(tx: Transaction, owner: LearningOwner): Promise<void> {
  // Covers a profile created after the deletion job enumerated the account's children.
  await tx.execute(
    sql`select pg_advisory_xact_lock(hashtextextended(${`members-account:${owner.accountId}`}, 0))`,
  )
  await tx.execute(
    sql`select pg_advisory_xact_lock(hashtextextended(${`creation-quota:${owner.userId}`}, 0))`,
  )
  const [fence] = await tx
    .select({ accountId: accountDeletionFences.accountId })
    .from(accountDeletionFences)
    .where(eq(accountDeletionFences.accountId, owner.accountId))
    .limit(1)
  if (fence) throw new ForbiddenError('Esta conta foi excluída.')
}
