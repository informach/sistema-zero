import type { EventEmitter } from 'node:events'
import { z } from 'zod'
import type { RpcEvent } from './json-rpc'

const loginCompletionSchema = z.object({ loginId: z.string().nullish(), success: z.boolean() })

/** Subscribe before starting login: completion can arrive before its RPC response. */
export function observeLogin(rpc: EventEmitter, signal?: AbortSignal, timeoutMs = 180000) {
  let expectedId: string | undefined
  const early: z.infer<typeof loginCompletionSchema>[] = []
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
      const parsed = loginCompletionSchema.safeParse(value.params)
      if (!parsed.success) {
        settle(new Error('O cliente retornou uma confirmação de login inválida.'))
        return
      }
      if (!parsed.data.loginId) return
      if (!expectedId) {
        if (early.length < 10) early.push(parsed.data)
        return
      }
      if (parsed.data.loginId !== expectedId) return
      settle(parsed.data.success ? undefined : new Error('Login não concluído.'))
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
      const value = early.find((event) => event.loginId === id)
      if (value) settle(value.success ? undefined : new Error('Login não concluído.'))
      early.length = 0
    },
    cancel() {
      settle(new Error('Login interrompido.'))
    },
  }
}
