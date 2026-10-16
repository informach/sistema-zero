import type { StudioAiActor } from '@sistemazero/core/ai-credits'
import type { StudioProBuilderJob } from '@sistemazero/core/studio'

export interface StudioBuilderExecution {
  id: string
  projectId: string
  parentOrigin: string
  actor: StudioAiActor
}

/** The database is the queue. Delivery is retryable; only the existing job lease authorizes work. */
export function createStudioBuilderCoordinator(deps: {
  pending(now: Date, limit: number): Promise<StudioBuilderExecution[]>
  reconcile(job: StudioBuilderExecution): Promise<StudioProBuilderJob | null>
  deliver(job: StudioBuilderExecution, signal: AbortSignal): Promise<void>
  finish(job: StudioBuilderExecution): Promise<void>
  report(error: unknown): void
  clock?: () => Date
  intervalMs?: number
  concurrency?: number
}) {
  const concurrency = Math.min(4, Math.max(1, deps.concurrency ?? 2))
  const active = new Map<string, Promise<void>>()
  const abort = new AbortController()
  let reading: Promise<void> | null = null
  let timer: ReturnType<typeof setInterval> | undefined
  const processJob = async (execution: StudioBuilderExecution) => {
    const job = await deps.reconcile(execution)
    if (!job) return
    if (['review', 'failed', 'cancelled'].includes(job.phase)) {
      if (job.modelCalls > 0) await deps.finish(execution)
      return
    }
    if (abort.signal.aborted) return
    await deps.deliver(execution, abort.signal)
  }
  const readPending = async () => {
    try {
      const jobs = await deps.pending((deps.clock ?? (() => new Date()))(), 20)
      for (const job of jobs) {
        if (abort.signal.aborted || active.size >= concurrency) break
        if (active.has(job.id)) continue
        const task = processJob(job)
          .catch(deps.report)
          .finally(() => {
            active.delete(job.id)
          })
        active.set(job.id, task)
      }
    } catch (error) {
      deps.report(error)
    }
  }
  const tick = () => {
    if (reading) return reading
    if (abort.signal.aborted || active.size >= concurrency) return Promise.resolve()
    reading = readPending().finally(() => {
      reading = null
    })
    return reading
  }
  return {
    tick,
    async idle() {
      await reading
      await Promise.all([...active.values()])
    },
    start() {
      if (timer || abort.signal.aborted) return
      void tick()
      timer = setInterval(() => void tick(), deps.intervalMs ?? 2000)
      timer.unref?.()
    },
    async stop() {
      if (timer) clearInterval(timer)
      timer = undefined
      abort.abort()
      await reading
      await Promise.all([...active.values()])
    },
  }
}
