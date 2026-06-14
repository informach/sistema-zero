import { randomUUID } from 'node:crypto'
import { and, count, eq, inArray, sql } from 'drizzle-orm'
import type {
  ReactionRepository,
  ReactionSummaryItem,
  ReactionTarget,
} from '../../../domain/ports/reaction-repository.port'
import type { Database } from './db'
import { reactions } from './schema'

export class DrizzleReactionRepository implements ReactionRepository {
  constructor(private readonly db: Database) {}

  async add(
    target: ReactionTarget,
    targetId: string,
    userId: string,
    emoji: string,
    now: Date,
  ): Promise<void> {
    await this.db
      .insert(reactions)
      .values({ id: randomUUID(), targetType: target, targetId, userId, emoji, createdAt: now })
      .onConflictDoNothing()
  }

  async remove(
    target: ReactionTarget,
    targetId: string,
    userId: string,
    emoji: string,
  ): Promise<boolean> {
    const rows = await this.db
      .delete(reactions)
      .where(
        and(
          eq(reactions.targetType, target),
          eq(reactions.targetId, targetId),
          eq(reactions.userId, userId),
          eq(reactions.emoji, emoji),
        ),
      )
      .returning({ id: reactions.id })
    return rows.length > 0
  }

  async summarize(
    target: ReactionTarget,
    targetIds: string[],
    userId: string,
  ): Promise<Map<string, ReactionSummaryItem[]>> {
    const result = new Map<string, ReactionSummaryItem[]>()
    if (targetIds.length === 0) return result
    const rows = await this.db
      .select({
        targetId: reactions.targetId,
        emoji: reactions.emoji,
        count: count(),
        reactedByMe: sql<boolean>`bool_or(${reactions.userId} = ${userId})`,
      })
      .from(reactions)
      .where(and(eq(reactions.targetType, target), inArray(reactions.targetId, targetIds)))
      .groupBy(reactions.targetId, reactions.emoji)
      .orderBy(reactions.targetId)
    for (const r of rows) {
      const list = result.get(r.targetId) ?? []
      list.push({ emoji: r.emoji, count: Number(r.count), reactedByMe: Boolean(r.reactedByMe) })
      result.set(r.targetId, list)
    }
    return result
  }
}
