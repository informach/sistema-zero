import type { LearningAttemptView, LearningBlockProgress } from '@sistemazero/core/learning'
import type { LiveProgram } from '@sistemazero/core/live'
import { LiveNotFoundError } from '../../src/domain/live/live.errors'
import type {
  LiveCatalogQuery,
  LiveCohortAggregate,
  LiveRepository,
  LiveTransactionReads,
} from '../../src/domain/ports/live-repository.port'

export class InMemoryLiveRepository implements LiveRepository {
  readonly programs = new Map<string, LiveProgram>()
  readonly cohorts = new Map<string, LiveCohortAggregate>()
  readonly positions = new Map<string, number>()
  readonly learning = new Map<string, LearningBlockProgress>()
  readonly attempts = new Map<string, LearningAttemptView>()
  /** Every audit entry appended by transactions, in order (the real repository inserts them). */
  readonly auditLog: LiveCohortAggregate['audit'] = []
  async readLearningProgress(sessionId: string, learnerId: string, accountId: string) {
    return structuredClone(
      [...this.learning]
        .filter(([key]) => key.startsWith(`${sessionId}:${learnerId}:${accountId}:`))
        .map(([, value]) => value),
    )
  }
  async findLearningAttempt(sessionId: string, learnerId: string, accountId: string, id: string) {
    return structuredClone(
      this.attempts.get(`${sessionId}:${learnerId}:${accountId}:${id}`) ?? null,
    )
  }
  async readReplayPosition(sessionId: string, learnerId: string, version: number) {
    return this.positions.get(`${sessionId}:${learnerId}:${version}`) ?? 0
  }
  private locks = new Map<string, Promise<void>>()
  async listPrograms() {
    return structuredClone([...this.programs.values()])
  }
  async findProgram(id: string) {
    return structuredClone(this.programs.get(id) ?? null)
  }
  async createProgram(program: LiveProgram) {
    this.programs.set(program.id, structuredClone(program))
  }
  private async lock<T>(id: string, operation: () => Promise<T>): Promise<T> {
    const previous = this.locks.get(id) ?? Promise.resolve()
    let release!: () => void
    const current = new Promise<void>((resolve) => {
      release = resolve
    })
    this.locks.set(id, current)
    await previous
    try {
      return await operation()
    } finally {
      release()
      if (this.locks.get(id) === current) this.locks.delete(id)
    }
  }
  async updateProgram(id: string, mutate: (program: LiveProgram) => void) {
    return this.lock(`program:${id}`, async () => {
      const program = await this.findProgram(id)
      if (!program) throw new LiveNotFoundError()
      mutate(program)
      this.programs.set(id, structuredClone(program))
      return program
    })
  }
  async createCohort(aggregate: LiveCohortAggregate) {
    this.cohorts.set(aggregate.cohort.id, structuredClone(aggregate))
  }
  async listCohorts(query?: LiveCatalogQuery) {
    return structuredClone(
      [...this.cohorts.values()]
        .filter(
          (item) =>
            !query ||
            ((!query.cursor || item.cohort.id > query.cursor) &&
              (query.mode === 'admin' ||
                (item.cohort.status === 'open' &&
                  this.programs.get(item.cohort.programId)?.status === 'published') ||
                item.enrollments.some(
                  (enrollment) =>
                    enrollment.accountId === query.actor.accountId &&
                    (query.mode === 'parents' || enrollment.learnerId === query.actor.id),
                ) ||
                (query.actor.staff && item.cohort.teacherIds.includes(query.actor.id)))),
        )
        .sort((a, b) => a.cohort.id.localeCompare(b.cohort.id))
        .slice(0, query?.limit ?? 50),
    )
  }
  async overdueOccurrences(now: Date) {
    return [...this.cohorts.values()]
      .flatMap((item) => item.occurrences)
      .filter(
        (item) =>
          ['live', 'lobby', 'scheduled'].includes(item.state) &&
          Date.parse(item.hardEndsAt) <= now.getTime(),
      )
      .slice(0, 100)
      .map((item) => item.id)
  }
  async findCohort(id: string) {
    return structuredClone(this.cohorts.get(id) ?? null)
  }
  async findBySession(id: string) {
    return structuredClone(
      [...this.cohorts.values()].find((item) =>
        item.sessions.some((session) => session.id === id),
      ) ?? null,
    )
  }
  async findByOccurrence(id: string) {
    return structuredClone(
      [...this.cohorts.values()].find((item) =>
        item.occurrences.some((occurrence) => occurrence.id === id),
      ) ?? null,
    )
  }
  async cohortIdForSession(id: string) {
    return (
      [...this.cohorts.values()].find((item) => item.sessions.some((session) => session.id === id))
        ?.cohort.id ?? null
    )
  }
  async findByEnrollment(id: string) {
    return structuredClone(
      [...this.cohorts.values()].find((item) =>
        item.enrollments.some((enrollment) => enrollment.id === id),
      ) ?? null,
    )
  }
  async transaction<T>(
    id: string,
    mutate: (aggregate: LiveCohortAggregate, reads: LiveTransactionReads) => T | Promise<T>,
  ): Promise<T> {
    return this.lock(id, async () => {
      const aggregate = await this.findCohort(id)
      if (!aggregate) throw new LiveNotFoundError()
      aggregate.audit = []
      const result = await mutate(aggregate, {
        learningProgress: (sessionId, learnerId, accountId) =>
          this.readLearningProgress(sessionId, learnerId, accountId),
        learningAttempt: (sessionId, learnerId, accountId, attemptId) =>
          this.findLearningAttempt(sessionId, learnerId, accountId, attemptId),
      })
      this.auditLog.push(...structuredClone(aggregate.audit))
      for (const position of aggregate.replayPositions ?? [])
        this.positions.set(
          `${position.sessionId}:${position.learnerId}:${position.version}`,
          position.positionSeconds,
        )
      aggregate.replayPositions = []
      for (const write of aggregate.learningWrites ?? []) {
        this.learning.set(
          `${write.sessionId}:${write.learnerId}:${write.accountId}:${write.progress.blockId}:${write.progress.revision}`,
          structuredClone(write.progress),
        )
        if (write.attempt)
          this.attempts.set(
            `${write.sessionId}:${write.learnerId}:${write.accountId}:${write.attempt.id}`,
            structuredClone(write.attempt),
          )
      }
      aggregate.learningWrites = []
      this.cohorts.set(id, structuredClone(aggregate))
      return result
    })
  }
}
