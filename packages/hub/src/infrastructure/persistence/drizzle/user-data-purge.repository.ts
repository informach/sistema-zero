import { eq, inArray } from 'drizzle-orm'
import type { UserDataPurgeRepository } from '../../../domain/ports/user-data-purge-repository.port'
import type { Database } from './db'
import { retirePendingStudioReservations } from './retire-studio-reservations'
import { accountDeletionFences, mutesBans, reactions, readState } from './schema'
import { lockStudioAccount } from './thread.repository'

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
    const owners = [...userIds]
    const retiredAt = new Date()
    await this.db.transaction(async (tx) => {
      await lockStudioAccount(tx, accountId)
      await tx.insert(accountDeletionFences).values({ accountId }).onConflictDoNothing()
      // Retire only unpublished intents. Public history keeps its canonical thread status.
      await retirePendingStudioReservations(tx, accountId, owners, retiredAt)
      await tx.delete(reactions).where(inArray(reactions.userId, owners))
      await tx.delete(readState).where(inArray(readState.userId, owners))
      await tx.delete(mutesBans).where(inArray(mutesBans.userId, owners))
    })
  }
}
