import type { Run } from '@sistemazero/agent-core'
import { z } from 'zod'

export const backendEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('session'), sessionId: z.string(), turnId: z.string().optional() }),
  z.object({ type: z.literal('text'), text: z.string().max(128000) }),
  z.object({ type: z.literal('progress'), name: z.string(), detail: z.string().max(16000) }),
  z.object({ type: z.literal('usage'), value: z.unknown() }),
  z.object({ type: z.literal('completed'), text: z.string().max(128000) }),
])
export type BackendEvent = z.infer<typeof backendEventSchema>
export interface BackendRequest {
  run: Run
  workspace: string
  nativeSessionId?: string
  instructions: string
  bridge?: { url: string; token: string }
  ask: (
    prompt: string,
    options: string[],
    kind: 'input' | 'approval',
    signal: AbortSignal,
  ) => Promise<string>
}
export interface InterruptReceipt {
  requested: boolean
  acknowledged: boolean
  reason?: string
}
export interface AgentBackend {
  start(request: BackendRequest, signal: AbortSignal): AsyncIterable<BackendEvent>
  interrupt(runId: string): Promise<InterruptReceipt>
}

/** Bounded mailbox. Slow consumers cause a defined failure, never unbounded allocation. */
export class Mailbox<T> {
  private items: { value: T; bytes: number }[] = []
  private bytes = 0
  private wake: (() => void) | undefined
  private error: Error | undefined
  push(value: T) {
    if (this.error) throw this.error
    const bytes = Buffer.byteLength(JSON.stringify(value))
    if (this.items.length >= 256 || this.bytes + bytes > 2_000_000)
      throw new Error('Native event consumer is too slow')
    this.items.push({ value, bytes })
    this.bytes += bytes
    this.wake?.()
  }
  fail(error: Error) {
    this.error = error
    this.wake?.()
  }
  async take(signal: AbortSignal): Promise<T> {
    while (true) {
      signal.throwIfAborted()
      const item = this.items.shift()
      if (item) {
        this.bytes -= item.bytes
        return item.value
      }
      if (this.error) throw this.error
      await new Promise<void>((resolve, reject) => {
        const abort = () => {
          cleanup()
          reject(signal.reason)
        }
        const cleanup = () => {
          signal.removeEventListener('abort', abort)
          this.wake = undefined
        }
        this.wake = () => {
          cleanup()
          resolve()
        }
        signal.addEventListener('abort', abort, { once: true })
        if (signal.aborted) abort()
      })
    }
  }
}
