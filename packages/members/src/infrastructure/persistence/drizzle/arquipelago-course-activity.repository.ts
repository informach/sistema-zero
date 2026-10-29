import { and, asc, between, inArray } from 'drizzle-orm'
import type { Database } from './db'
import { lessonCompletions } from './schema'

/**
 * A hora das aulas concluídas, para o serviço do jogo cruzar com as sessões de jogo (a linha
 * "concluiu aula depois de jogar" da área dos pais, 29/10/2026). Só leitura.
 */
export class ArquipelagoCourseActivityRepository {
  constructor(private readonly db: Database) {}

  async completedBetween(
    userIds: readonly string[],
    from: Date,
    to: Date,
    limit: number,
  ): Promise<{ userId: string; completedAt: Date }[]> {
    if (userIds.length === 0) return []
    return this.db
      .select({ userId: lessonCompletions.userId, completedAt: lessonCompletions.completedAt })
      .from(lessonCompletions)
      .where(
        and(
          inArray(lessonCompletions.userId, [...userIds]),
          between(lessonCompletions.completedAt, from, to),
        ),
      )
      .orderBy(asc(lessonCompletions.completedAt))
      .limit(limit)
  }
}
