import { and, count, eq, inArray, isNotNull, isNull, max, ne } from 'drizzle-orm'
import { PALETTE_LIBRARY_KIND } from '../../../domain/creations/palette-library'
import type {
  LearnerCreationsUsage,
  LearnerDeliveriesUsage,
  LearnerPensaUsage,
  ToolUsageRepository,
} from '../../../domain/ports/tool-usage-repository.port'
import type { Database } from './db'
import { creations, lessonBlocks, pensaCycles, pensaProjects, studioSubmissions } from './schema'

/**
 * Agregações de USO por aprendiz (ficha admin), sempre em LOTE (GROUP BY
 * user_id). Índices que cobrem: `pensa_projects_user_idx`,
 * `creations_user_tool_idx` e `studio_submissions_user_block_uq`.
 */
export class DrizzleToolUsageRepository implements ToolUsageRepository {
  constructor(private readonly db: Database) {}

  async pensaUsageByUsers(userIds: string[]): Promise<Map<string, LearnerPensaUsage>> {
    if (userIds.length === 0) return new Map()
    const [projects, cycles] = await Promise.all([
      this.db
        .select({
          userId: pensaProjects.userId,
          projects: count(),
          lastActivityAt: max(pensaProjects.updatedAt),
        })
        .from(pensaProjects)
        .where(inArray(pensaProjects.userId, userIds))
        .groupBy(pensaProjects.userId),
      this.db
        .select({ userId: pensaProjects.userId, done: count() })
        .from(pensaCycles)
        .innerJoin(pensaProjects, eq(pensaCycles.projectId, pensaProjects.id))
        .where(and(inArray(pensaProjects.userId, userIds), eq(pensaCycles.stage, 'done')))
        .groupBy(pensaProjects.userId),
    ])
    const doneBy = new Map(cycles.map((r) => [r.userId, r.done]))
    const out = new Map<string, LearnerPensaUsage>()
    for (const r of projects) {
      out.set(r.userId, {
        projects: r.projects,
        cyclesCompleted: doneBy.get(r.userId) ?? 0,
        lastActivityAt: r.lastActivityAt ?? null,
      })
    }
    return out
  }

  async creationsUsageByUsers(
    userIds: string[],
    tool: 'studio' | 'pinta',
  ): Promise<Map<string, LearnerCreationsUsage>> {
    if (userIds.length === 0) return new Map()
    const rows = await this.db
      .select({
        userId: creations.userId,
        c: count(),
        lastActivityAt: max(creations.itemUpdatedAt),
      })
      .from(creations)
      // Viva E CONFIRMADA — o predicado do índice parcial `creations_usage_idx`
      // (uma reserva nunca-commitada tem `storage_ref` null e não é uma criação).
      // ⚠️ A biblioteca "Minhas paletas" do Pinta viaja como um item ESPECIAL
      // do mesmo canal (kind `palette-library`, itemId fixo `sz-pinta-palettes`)
      // e NÃO é um desenho — sem o filtro, todo perfil com paleta salva
      // ganharia "+1 desenho na nuvem" no cartão do admin.
      .where(
        and(
          inArray(creations.userId, userIds),
          eq(creations.tool, tool),
          isNull(creations.deletedAt),
          isNotNull(creations.storageRef),
          ne(creations.kind, PALETTE_LIBRARY_KIND),
        ),
      )
      .groupBy(creations.userId)
    return new Map(
      rows.map((r) => [r.userId, { count: r.c, lastActivityAt: r.lastActivityAt ?? null }]),
    )
  }

  async submissionsUsageByUsers(
    userIds: string[],
    kind: 'studio' | 'pinta',
  ): Promise<Map<string, LearnerDeliveriesUsage>> {
    if (userIds.length === 0) return new Map()
    // O kind AUTORITATIVO da entrega é o do BLOCO (mesma tabela p/ Estúdio e Pinta).
    const rows = await this.db
      .select({
        userId: studioSubmissions.userId,
        c: count(),
        lastActivityAt: max(studioSubmissions.submittedAt),
      })
      .from(studioSubmissions)
      .innerJoin(lessonBlocks, eq(studioSubmissions.blockId, lessonBlocks.id))
      .where(and(inArray(studioSubmissions.userId, userIds), eq(lessonBlocks.kind, kind)))
      .groupBy(studioSubmissions.userId)
    return new Map(
      rows.map((r) => [r.userId, { count: r.c, lastActivityAt: r.lastActivityAt ?? null }]),
    )
  }
}
