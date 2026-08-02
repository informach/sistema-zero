import type {
  CompleteZappyQuestionInput,
  ReserveZappyQuestionInput,
  ZappyRepository,
  ZappyStoredResponse,
} from '../../domain/ports/zappy-repository.port'

const RETENTION_MS = 30 * 24 * 60 * 60 * 1_000
const PROCESSING_LEASE_MS = 2 * 60 * 1_000

export class ZappyHistoryService {
  constructor(
    private readonly repository: ZappyRepository,
    private readonly clock: () => Date,
  ) {}

  private window(): { now: Date; expiresAt: Date } {
    const now = this.clock()
    return { now, expiresAt: new Date(now.getTime() + RETENTION_MS) }
  }

  history(userId: string, projectId: string, before?: string) {
    const { now, expiresAt } = this.window()
    return this.repository.history(userId, projectId, now, expiresAt, before)
  }

  reserve(input: Omit<ReserveZappyQuestionInput, 'now' | 'expiresAt' | 'processingUntil'>) {
    const window = this.window()
    return this.repository.reserveQuestion({
      ...input,
      ...window,
      processingUntil: new Date(window.now.getTime() + PROCESSING_LEASE_MS),
    })
  }

  complete(input: Omit<CompleteZappyQuestionInput, 'now' | 'expiresAt'>) {
    return this.repository.completeQuestion({ ...input, ...this.window() })
  }

  delete(userId: string, projectId: string) {
    return this.repository.deleteHistory(userId, projectId)
  }

  feedback(userId: string, projectId: string, responseId: string, useful: boolean) {
    return this.repository.setFeedback(userId, projectId, responseId, useful, this.clock())
  }

  metrics(from: Date, to: Date) {
    return this.repository.metrics(from, to)
  }

  pruneExpired() {
    return this.repository.pruneExpired(this.clock())
  }
}

export type { ZappyStoredResponse }
