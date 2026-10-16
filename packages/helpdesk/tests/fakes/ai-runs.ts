import type { AiAttemptView, AiRunView, KnowledgeGapView } from '@sistemazero/helpdesk-contracts'
import type { AiRunRepository } from '../../src/domain/ports/ai-run-repository.port'

export class InMemoryAiRunRepository implements AiRunRepository {
  readonly items = new Map<string, AiRunView>()
  readonly events: Parameters<AiRunRepository['feedback']>[0][] = []
  readonly resolved = new Map<string, string>()
  async byTicket(ticketId: string) {
    return [...this.items.values()]
      .filter((r) => r.ticketId === ticketId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 20)
      .map((r) => structuredClone(r))
  }
  async create(run: AiRunView) {
    this.items.set(run.id, structuredClone(run))
  }
  async byId(id: string) {
    return structuredClone(this.items.get(id) ?? null)
  }
  async attempt(id: string, attempt: AiAttemptView) {
    const run = this.items.get(id)
    if (run)
      run.attempts = [
        ...run.attempts.filter((a) => a.attempt !== attempt.attempt),
        structuredClone(attempt),
      ]
  }
  async finish(run: AiRunView) {
    this.items.set(run.id, structuredClone(run))
  }
  async feedback(input: Parameters<AiRunRepository['feedback']>[0]) {
    const run = this.items.get(input.runId)
    if (
      !run ||
      run.ticketId !== input.ticketId ||
      run.purpose !== 'copilot' ||
      run.status !== 'completed'
    )
      return false
    if (
      !this.events.some(
        (e) => e.runId === input.runId && e.actorId === input.actorId && e.kind === input.kind,
      )
    )
      this.events.push(input)
    return true
  }
  async gaps(limit: number): Promise<KnowledgeGapView[]> {
    return [...this.items.values()]
      .filter((r) => r.coverage !== 'covered' && !this.resolved.has(r.id))
      .slice(0, limit)
      .map((r) => ({
        runId: r.id,
        ticketId: r.ticketId,
        reason: r.reason ?? 'insufficient_sources',
        audience: r.audience,
        product: r.product,
        createdAt: r.createdAt,
        resolvedArticleId: null,
      }))
  }
  async resolveGap(id: string, article: string) {
    this.resolved.set(id, article)
    return this.items.has(id)
  }
  async purge(before: Date) {
    let count = 0
    for (const r of this.items.values())
      if (new Date(r.createdAt) < before) {
        this.items.delete(r.id)
        count++
      }
    return count
  }
}
