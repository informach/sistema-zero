import type { EventEmitter } from 'node:events'
import type { RpcEvent } from './json-rpc'

/** Subscribe before starting login: completion can arrive before its RPC response. */
export function observeLogin(rpc: EventEmitter, signal?: AbortSignal, timeoutMs = 180000) {
  let expectedId: string | undefined
  const early: RpcEvent[] = []
  let settle!: (error?: Error) => void
  const completion = new Promise<void>((resolve, reject) => {
    let done = false
    settle = (error) => {
      if (done) return
      done = true
      clearTimeout(timer)
      rpc.off('closed', closed)
      rpc.off('notification', event)
      signal?.removeEventListener('abort', aborted)
      if (error) reject(error)
      else resolve()
    }
    const closed = () => settle(new Error('Login interrompido.'))
    const aborted = () => settle(new Error('Operação cancelada.'))
    const event = (value: RpcEvent) => {
      if (value.method !== 'account/login/completed') return
      if (!expectedId) {
        if (early.length < 10) early.push(value)
        return
      }
      if (value.params?.loginId !== expectedId) return
      settle(value.params?.success === true ? undefined : new Error('Login não concluído.'))
    }
    const timer = setTimeout(() => settle(new Error('Login expirou.')), timeoutMs)
    rpc.on('closed', closed)
    rpc.on('notification', event)
    signal?.addEventListener('abort', aborted, { once: true })
    if (signal?.aborted) aborted()
  })
  // The caller may still be awaiting the login/start response.
  void completion.catch(() => {})
  return {
    completion,
    identify(id: string) {
      expectedId = id
      const value = early.find((event) => event.params?.loginId === id)
      if (value)
        settle(value.params?.success === true ? undefined : new Error('Login não concluído.'))
      early.length = 0
    },
    cancel() {
      settle(new Error('Login interrompido.'))
    },
  }
}
