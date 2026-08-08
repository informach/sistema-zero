export interface LatestTaskQueue<T> {
  enqueue(value: T): void
  flush(): Promise<void>
}

interface LatestTaskQueueOptions<T, R> {
  run(value: T): Promise<R>
  onLatestSuccess?(result: R): void
  onLatestError?(error: unknown): void
}

/**
 * Fila single-flight que preserva a ordem externa e coalesce o backlog: o
 * trabalho em voo termina, mas entre todas as versões pendentes só a mais nova
 * é executada. Callbacks visuais só recebem o resultado da versão mais atual.
 */
export function createLatestTaskQueue<T, R>(
  options: LatestTaskQueueOptions<T, R>,
): LatestTaskQueue<T> {
  let version = 0
  let pending: { value: T; version: number } | null = null
  let active: Promise<void> | null = null

  function drain(): Promise<void> {
    if (active) return active
    const loop = async (): Promise<void> => {
      while (pending) {
        const job = pending
        pending = null
        try {
          const result = await options.run(job.value)
          if (job.version === version) options.onLatestSuccess?.(result)
        } catch (error) {
          if (job.version === version) options.onLatestError?.(error)
        }
      }
    }
    active = loop().finally(() => {
      active = null
      if (pending) void drain()
    })
    return active
  }

  return {
    enqueue(value) {
      version += 1
      pending = { value, version }
      void drain()
    },
    async flush() {
      do {
        await drain()
      } while (active || pending)
    },
  }
}
