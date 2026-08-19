import { eq, inArray, or, sql } from 'drizzle-orm'
import type { UserDataPurgeRepository } from '../../../domain/ports/user-data-purge-repository.port'
import type { Database } from './db'
import {
  accountDeletionFences,
  aiUsageDaily,
  avatarConfigs,
  avatarInventory,
  certificatesIssued,
  coinEvents,
  courseRatings,
  creationCleanupJobs,
  creations,
  entitlements,
  gamificationProfiles,
  leagueMembership,
  lessonCompletions,
  lessonProgress,
  missionClaims,
  parentReportPrefs,
  parentReportsSent,
  pensaProjects,
  quizAttempts,
  renewalRemindersSent,
  roomInventory,
  roomState,
  studioSubmissions,
  teacherThreads,
  userBadges,
  xpEvents,
  zappyConversations,
} from './schema'

/**
 * Purga os dados do aluno numa única transação. Cobre as tabelas keyadas em
 * `user_id` (e as que também têm `account_id`, p/ os dados kids dos perfis sob a
 * conta). `processed_webhooks` e o CONTEÚDO (cursos/aulas/blocos) NÃO são tocados.
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

  async purgeForUser({
    userIds,
    accountId,
    cleanup,
  }: {
    userIds: string[]
    accountId: string
    cleanup: {
      id: string
      prefixes: string[]
      notBefore: Date
      createdAt: Date
    }
  }): Promise<void> {
    if (userIds.length === 0) return
    await this.db.transaction(async (tx) => {
      // Usa o mesmo lock das reservas/commits, em ordem estável para evitar
      // deadlock entre duas purgas. Assim uma operação que já começou termina
      // antes do DELETE; as seguintes só prosseguem depois de enxergar a cerca.
      for (const ownerId of [...userIds].sort()) {
        await tx.execute(
          sql`select pg_advisory_xact_lock(hashtextextended(${`creation-quota:${ownerId}`}, 0))`,
        )
      }
      // Cerca novas reservas e agenda a limpeza final antes de apagar o índice.
      // Tudo commita junto: nunca perdemos as chaves sem deixar um job durável.
      await tx
        .insert(accountDeletionFences)
        .values({ accountId, createdAt: cleanup.createdAt })
        .onConflictDoNothing()
      await tx
        .insert(creationCleanupJobs)
        .values({
          id: cleanup.id,
          accountId,
          userIds,
          prefixes: cleanup.prefixes,
          notBefore: cleanup.notBefore,
          createdAt: cleanup.createdAt,
          updatedAt: cleanup.createdAt,
        })
        .onConflictDoUpdate({
          target: creationCleanupJobs.accountId,
          set: {
            prefixes: cleanup.prefixes,
            userIds,
            completedAt: null,
            lockedAt: null,
            lastError: null,
            updatedAt: cleanup.createdAt,
          },
        })
      // `renewal_reminders_sent` referencia a matrícula sem FK. Capture os ids
      // ANTES de apagá-las para não deixar rastros do vencimento de uma conta excluída.
      const ownedEntitlements = await tx
        .select({ id: entitlements.id })
        .from(entitlements)
        .where(inArray(entitlements.userId, userIds))
      const entitlementIds = ownedEntitlements.map((row) => row.id)
      if (entitlementIds.length > 0) {
        await tx
          .delete(renewalRemindersSent)
          .where(inArray(renewalRemindersSent.entitlementId, entitlementIds))
      }

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
      // Projetos Pensa e conversas do professor pertencem ao perfil. Seus filhos
      // têm FK CASCADE (ciclos/artefatos/tarefas e mensagens, respectivamente).
      await tx
        .delete(pensaProjects)
        .where(or(inArray(pensaProjects.userId, userIds), eq(pensaProjects.accountId, accountId)))
      await tx
        .delete(teacherThreads)
        .where(or(inArray(teacherThreads.userId, userIds), eq(teacherThreads.accountId, accountId)))
      await tx
        .delete(zappyConversations)
        .where(
          or(
            inArray(zappyConversations.userId, userIds),
            eq(zappyConversations.accountId, accountId),
          ),
        )
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
      // Índice das criações "guardadas na conta" (Estúdio Completo/Pinta). ⚠️ Só o
      // ÍNDICE: os blobs no R2 UGC ficam para o job durável acima (a chave leva o
      // perfil no prefixo, `creations/<perfil>/…`, então dá para varrer por prefixo).
      await tx
        .delete(creations)
        .where(or(inArray(creations.userId, userIds), eq(creations.accountId, accountId)))
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
      // Dados que pertencem exclusivamente à CONTA responsável (inclusive o uso
      // de IA compartilhado entre perfis e o opt-out/histórico dos relatórios).
      await tx.delete(aiUsageDaily).where(eq(aiUsageDaily.accountId, accountId))
      await tx.delete(parentReportsSent).where(eq(parentReportsSent.accountId, accountId))
      await tx.delete(parentReportPrefs).where(eq(parentReportPrefs.accountId, accountId))
    })
  }
}
