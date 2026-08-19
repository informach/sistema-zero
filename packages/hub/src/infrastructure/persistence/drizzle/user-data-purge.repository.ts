import { eq, inArray } from 'drizzle-orm'
import type { UserDataPurgeRepository } from '../../../domain/ports/user-data-purge-repository.port'
import type { Database } from './db'
import { accountDeletionFences, mutesBans, reactions, readState } from './schema'

/**
 * Purga o estado de interação do usuário (reações, leitura, mutes/bans) numa
 * transação. Conteúdo autorado (threads/comments) NÃO é tocado — é histórico
 * imutável (`author_id` é snapshot do auth, sem FK).
 */
export class DrizzleUserDataPurgeRepository implements UserDataPurgeRepository {
  constructor(private readonly db: Database) {}

  async isFenced(accountId: string): Promise<boolean> {
    const [fence] = await this.db
      .select({ accountId: accountDeletionFences.accountId })
      .from(accountDeletionFences)
      .where(eq(accountDeletionFences.accountId, accountId))
      .limit(1)
    return Boolean(fence)
  }

  async purgeForUser(userIds: string[], accountId: string): Promise<void> {
    if (userIds.length === 0) return
    await this.db.transaction(async (tx) => {
      await tx.insert(accountDeletionFences).values({ accountId }).onConflictDoNothing()
      await tx.delete(reactions).where(inArray(reactions.userId, userIds))
      await tx.delete(readState).where(inArray(readState.userId, userIds))
      await tx.delete(mutesBans).where(inArray(mutesBans.userId, userIds))
    })
  }
}
