import type { DraftRecovery } from './lesson-draft-session'

interface Operation<T extends { kind: string }> {
  operationId: string
  expectedRevision?: string
  change: DraftRecovery<T>['pending'][number]['change']
}
interface Write<T extends { kind: string }> {
  epoch: number
  generation: number
  recovery: DraftRecovery<T> | null
}
export interface RecoveryBarrier {
  readonly epoch: number
  readonly generation: number
}
interface Waiter<T extends { kind: string }> {
  barrier: RecoveryBarrier
  operation?: Operation<T>
  empty: boolean
  resolve(): void
  reject(error: unknown): void
}

/** One active write and the latest complete pending recovery; no queue of large closures. */
export class LessonDraftRecoveryWriter<T extends { kind: string }> {
  private epoch = 0
  private generation = 0
  private pending: Write<T> | null = null
  private durable: Write<T> | null = null
  private failed: { write: Write<T>; error: unknown } | null = null
  private running: Promise<void> | null = null
  private waiters = new Set<Waiter<T>>()

  constructor(
    private readonly write: (value: DraftRecovery<T> | null) => Promise<void>,
    private readonly onFailure: (error: unknown) => void,
  ) {}

  request(recovery: DraftRecovery<T> | null): RecoveryBarrier {
    const write = { epoch: this.epoch, generation: ++this.generation, recovery }
    this.pending = write
    this.start()
    return { epoch: write.epoch, generation: write.generation }
  }

  private start() {
    if (!this.running) {
      this.running = Promise.resolve()
        .then(() => this.pump())
        .finally(() => {
          this.running = null
          // A resolved waiter can request another write before this finally microtask runs.
          if (this.pending) this.start()
        })
    }
  }

  wait(
    barrier: RecoveryBarrier,
    options: { operation?: Operation<T>; empty?: boolean } = {},
  ): Promise<void> {
    if (barrier.epoch !== this.epoch) return Promise.reject(this.retired())
    const waiter = { barrier, operation: options.operation, empty: options.empty === true }
    if (this.durable && this.matches(waiter, this.durable)) return Promise.resolve()
    if (this.durable && this.covers(waiter, this.durable))
      return Promise.reject(this.missingOperation())
    if (this.failed && this.covers(waiter, this.failed.write))
      return Promise.reject(this.failed.error)
    return new Promise((resolve, reject) => {
      this.waiters.add({ ...waiter, resolve, reject })
    })
  }

  /** Retire pending jobs/waiters; the physical active write still has to drain before a clear. */
  advanceEpoch() {
    this.epoch++
    this.pending = null
    this.durable = null
    this.failed = null
    for (const waiter of this.waiters) waiter.reject(this.retired())
    this.waiters.clear()
  }

  async drain() {
    while (this.running) await this.running
  }

  private retired() {
    return new Error('A confirmação local pertence a outra sessão de gravação.')
  }

  private missingOperation() {
    return new Error(
      'A cópia local não confirmou esta operação. A sincronização continua pendente.',
    )
  }

  private covers(waiter: Pick<Waiter<T>, 'barrier'>, write: Write<T>) {
    return write.epoch === waiter.barrier.epoch && write.generation >= waiter.barrier.generation
  }

  private matches(waiter: Pick<Waiter<T>, 'barrier' | 'operation' | 'empty'>, write: Write<T>) {
    if (!this.covers(waiter, write)) return false
    if (waiter.empty && write.recovery !== null) return false
    const operation = waiter.operation
    return (
      !operation ||
      write.recovery?.pending.some(
        (candidate) =>
          candidate.operationId === operation.operationId &&
          candidate.expectedRevision === operation.expectedRevision &&
          candidate.change === operation.change,
      ) === true
    )
  }

  private async pump() {
    while (this.pending) {
      const write = this.pending
      this.pending = null
      try {
        await this.write(write.recovery)
        if (write.epoch !== this.epoch) continue
        this.durable = write
        this.failed = null
        for (const waiter of this.waiters) {
          if (!this.covers(waiter, write)) continue
          this.waiters.delete(waiter)
          if (this.matches(waiter, write)) waiter.resolve()
          else waiter.reject(this.missingOperation())
        }
      } catch (error) {
        if (write.epoch !== this.epoch) continue
        this.failed = { write, error }
        for (const waiter of this.waiters) {
          if (!this.covers(waiter, write)) continue
          this.waiters.delete(waiter)
          waiter.reject(error)
        }
        this.onFailure(error)
      }
    }
  }
}
