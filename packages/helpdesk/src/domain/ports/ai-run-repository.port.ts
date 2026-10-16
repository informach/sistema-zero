import type {
  AiAttemptView,
  AiFeedbackKind,
  AiRunView,
  KnowledgeGapView,
} from '@sistemazero/helpdesk-contracts'

export interface AiRunRepository {
  create(run: AiRunView): Promise<void>
  byId(id: string): Promise<AiRunView | null>
  byTicket(ticketId: string): Promise<AiRunView[]>
  attempt(id: string, attempt: AiAttemptView): Promise<void>
  finish(run: AiRunView): Promise<void>
  feedback(input: {
    runId: string
    ticketId: string
    actorId: string
    kind: AiFeedbackKind
    reason: string | null
    at: Date
  }): Promise<boolean>
  gaps(limit: number): Promise<KnowledgeGapView[]>
  resolveGap(runId: string, articleId: string, at: Date): Promise<boolean>
  purge(before: Date): Promise<number>
}
