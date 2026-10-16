import { randomUUID } from 'node:crypto'
import type { AiAttemptView, AiRunView, KnowledgeGapView } from '@sistemazero/helpdesk-contracts'
import { and, desc, eq, lt, sql } from 'drizzle-orm'
import type { AiRunRepository } from '../../../domain/ports/ai-run-repository.port'
import type { DbConnection } from './db'
import { aiFeedback, aiRuns } from './schema'

export class DrizzleAiRunRepository implements AiRunRepository {
  constructor(private readonly db: DbConnection['db']) {}
  async byTicket(ticketId: string) {
    return (
      await this.db
        .select({ detail: aiRuns.detail })
        .from(aiRuns)
        .where(eq(aiRuns.ticketId, ticketId))
        .orderBy(desc(aiRuns.createdAt), desc(aiRuns.id))
        .limit(20)
    ).map((r) => r.detail)
  }
  async create(run: AiRunView): Promise<void> {
    await this.db.insert(aiRuns).values({
      id: run.id,
      ticketId: run.ticketId,
      generation: run.generation,
      detail: run,
      createdAt: new Date(run.createdAt),
    })
  }
  async byId(id: string): Promise<AiRunView | null> {
    return (
      (await this.db.select().from(aiRuns).where(eq(aiRuns.id, id)).limit(1))[0]?.detail ?? null
    )
  }
  async attempt(id: string, attempt: AiAttemptView): Promise<void> {
    await this.db.transaction(async (tx) => {
      const [row] = await tx.select().from(aiRuns).where(eq(aiRuns.id, id)).for('update')
      if (row?.detail.status !== 'running') return
      const attempts = row.detail.attempts.filter((item) => item.attempt !== attempt.attempt)
      attempts.push(attempt)
      await tx
        .update(aiRuns)
        .set({ detail: { ...row.detail, attempts } })
        .where(eq(aiRuns.id, id))
    })
  }
  async finish(run: AiRunView): Promise<void> {
    await this.db.update(aiRuns).set({ detail: run }).where(eq(aiRuns.id, run.id))
  }
  async feedback(input: Parameters<AiRunRepository['feedback']>[0]): Promise<boolean> {
    return this.db.transaction(async (tx) => {
      const [run] = await tx
        .select()
        .from(aiRuns)
        .where(and(eq(aiRuns.id, input.runId), eq(aiRuns.ticketId, input.ticketId)))
        .for('share')
      if (run?.detail.purpose !== 'copilot' || run.detail.status !== 'completed') return false
      await tx
        .insert(aiFeedback)
        .values({
          id: randomUUID(),
          runId: input.runId,
          actorId: input.actorId,
          kind: input.kind,
          reason: input.reason,
          createdAt: input.at,
        })
        .onConflictDoNothing()
      return true
    })
  }
  async gaps(limit: number): Promise<KnowledgeGapView[]> {
    const rows = await this.db
      .select()
      .from(aiRuns)
      .where(
        sql`${aiRuns.detail}->>'coverage' <> 'covered' and ${aiRuns.detail}->>'status' <> 'running' and ${aiRuns.resolvedArticleId} is null`,
      )
      .orderBy(desc(aiRuns.createdAt), desc(aiRuns.id))
      .limit(Math.min(100, Math.max(1, limit)))
    return rows.map(({ detail, resolvedArticleId }) => ({
      runId: detail.id,
      ticketId: detail.ticketId,
      reason: detail.reason ?? 'insufficient_sources',
      audience: detail.audience,
      product: detail.product,
      createdAt: detail.createdAt,
      resolvedArticleId,
    }))
  }
  async resolveGap(runId: string, articleId: string, at: Date): Promise<boolean> {
    const result = await this.db
      .update(aiRuns)
      .set({ resolvedArticleId: articleId, resolvedAt: at })
      .where(eq(aiRuns.id, runId))
      .returning({ id: aiRuns.id })
    return result.length > 0
  }
  async purge(before: Date): Promise<number> {
    const rows = await this.db
      .delete(aiRuns)
      .where(lt(aiRuns.createdAt, before))
      .returning({ id: aiRuns.id })
    return rows.length
  }
}
