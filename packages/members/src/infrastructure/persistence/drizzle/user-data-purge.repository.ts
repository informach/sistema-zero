import { eq, inArray, or } from 'drizzle-orm'
import type { UserDataPurgeRepository } from '../../../domain/ports/user-data-purge-repository.port'
import type { Database } from './db'
import {
  avatarConfigs,
  avatarInventory,
  certificatesIssued,
  coinEvents,
  courseRatings,
  entitlements,
  gamificationProfiles,
  leagueMembership,
  lessonCompletions,
  lessonProgress,
  missionClaims,
  quizAttempts,
  roomInventory,
  roomState,
  studioSubmissions,
  userBadges,
  xpEvents,
} from './schema'

/**
 * Purga os dados do aluno numa única transação. Cobre as tabelas keyadas em
 * `user_id` (e as que também têm `account_id`, p/ os dados kids dos perfis sob a
 * conta). `processed_webhooks` e o CONTEÚDO (cursos/aulas/blocos) NÃO são tocados.
 */
export class DrizzleUserDataPurgeRepository implements UserDataPurgeRepository {
  constructor(private readonly db: Database) {}

  async purgeForUser({
    userIds,
    accountId,
  }: {
    userIds: string[]
    accountId: string
  }): Promise<void> {
    if (userIds.length === 0) return
    await this.db.transaction(async (tx) => {
      // Tabelas só com `user_id`.
      await tx.delete(entitlements).where(inArray(entitlements.userId, userIds))
      await tx.delete(lessonCompletions).where(inArray(lessonCompletions.userId, userIds))
      await tx.delete(lessonProgress).where(inArray(lessonProgress.userId, userIds))
      await tx.delete(quizAttempts).where(inArray(quizAttempts.userId, userIds))
      await tx.delete(courseRatings).where(inArray(courseRatings.userId, userIds))
      await tx.delete(xpEvents).where(inArray(xpEvents.userId, userIds))
      await tx.delete(userBadges).where(inArray(userBadges.userId, userIds))
      await tx.delete(coinEvents).where(inArray(coinEvents.userId, userIds))
      await tx.delete(avatarInventory).where(inArray(avatarInventory.userId, userIds))
      await tx.delete(missionClaims).where(inArray(missionClaims.userId, userIds))
      await tx.delete(roomInventory).where(inArray(roomInventory.userId, userIds))
      // Tabelas com `user_id` E `account_id` (dados kids ficam keyados na conta
      // responsável → `account_id = accountId` cobre todos os perfis de uma vez).
      await tx
        .delete(studioSubmissions)
        .where(
          or(
            inArray(studioSubmissions.userId, userIds),
            eq(studioSubmissions.accountId, accountId),
          ),
        )
      await tx
        .delete(gamificationProfiles)
        .where(
          or(
            inArray(gamificationProfiles.userId, userIds),
            eq(gamificationProfiles.accountId, accountId),
          ),
        )
      await tx
        .delete(avatarConfigs)
        .where(or(inArray(avatarConfigs.userId, userIds), eq(avatarConfigs.accountId, accountId)))
      await tx
        .delete(leagueMembership)
        .where(
          or(inArray(leagueMembership.userId, userIds), eq(leagueMembership.accountId, accountId)),
        )
      await tx
        .delete(roomState)
        .where(or(inArray(roomState.userId, userIds), eq(roomState.accountId, accountId)))
      await tx
        .delete(certificatesIssued)
        .where(
          or(
            inArray(certificatesIssued.userId, userIds),
            eq(certificatesIssued.accountId, accountId),
          ),
        )
    })
  }
}
