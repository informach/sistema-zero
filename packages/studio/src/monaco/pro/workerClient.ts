import type { ProLanguageQueries, ProLanguageRequest, ProLanguageResponse } from './protocol'

export function createProLanguageClient() {
  const worker = new Worker(new URL('../workers/pro-language.worker.ts', import.meta.url), {
    type: 'module',
  })
  let sequence = 0
  let disposed = false
  let failure: string | null = null
  const pending = new Map<
    number,
    {
      resolve(value: unknown): void
      reject(error: Error): void
      timer: ReturnType<typeof setTimeout>
    }
  >()
  const fail = (message: string) => {
    for (const item of pending.values()) {
      clearTimeout(item.timer)
      item.reject(new Error(message))
    }
    pending.clear()
  }
  worker.onmessage = (event: MessageEvent<ProLanguageResponse>) => {
    const item = pending.get(event.data.id)
    if (!item) return
    clearTimeout(item.timer)
    pending.delete(event.data.id)
    if ('error' in event.data) item.reject(new Error(event.data.error))
    else item.resolve(event.data.result)
  }
  worker.onerror = (event) => {
    failure = event.message || 'O serviço de linguagem parou. Reinicie a análise de código.'
    fail(failure)
    worker.terminate()
  }
  const send = (message: ProLanguageRequest): Promise<unknown> => {
    if (disposed) return Promise.reject(new Error('Serviço de linguagem encerrado.'))
    if (failure) return Promise.reject(new Error(failure))
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        failure = 'O serviço de linguagem demorou demais. Reinicie a análise de código.'
        fail(failure)
        worker.terminate()
      }, 15_000)
      pending.set(message.id, { resolve, reject, timer })
      try {
        worker.postMessage(message)
      } catch (error) {
        clearTimeout(timer)
        pending.delete(message.id)
        reject(error instanceof Error ? error : new Error(String(error)))
      }
    })
  }
  return {
    update(patch: Record<string, string | null>, availableFiles?: readonly string[]) {
      return send({ id: ++sequence, method: 'update', patch, availableFiles })
    },
    async query<K extends keyof ProLanguageQueries>(
      method: K,
      ...args: ProLanguageQueries[K]['args']
    ): Promise<ProLanguageQueries[K]['result']> {
      // The worker switch has one implementation per protocol discriminant.
      return (await send({
        id: ++sequence,
        method,
        args,
      } as ProLanguageRequest)) as ProLanguageQueries[K]['result']
    },
    dispose() {
      disposed = true
      fail('Serviço de linguagem encerrado.')
      worker.terminate()
    },
  }
}
