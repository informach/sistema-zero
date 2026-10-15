import { EventEmitter } from 'node:events'
import { dirname } from 'node:path'
import { z } from 'zod'
import { Artifacts } from './artifacts'
import type { StoreCommand } from './schema'

declare const ZERO_STORE_WORKER: string | undefined
export interface StoreMutation {
  op: string
  namespaces: string[]
}

const reply = z.discriminatedUnion('ok', [
  z.object({ id: z.string(), ok: z.literal(true), value: z.unknown() }),
  z.object({ id: z.string(), ok: z.literal(false), error: z.string() }),
])
export class Store extends EventEmitter {
  private worker: Worker
  private pending = new Map<
    string,
    {
      resolve: (value: unknown) => void
      reject: (error: Error) => void
      timer: ReturnType<typeof setTimeout>
    }
  >()
  private ready: Promise<unknown>
  private failure: Error | undefined
  private closing: Promise<void> | undefined
  constructor(private file: string) {
    super()
    Artifacts.bind(dirname(file), this)
    this.worker = new Worker(
      new URL(
        typeof ZERO_STORE_WORKER === 'undefined' ? './worker.ts' : ZERO_STORE_WORKER,
        import.meta.url,
      ).href,
    )
    this.worker.onmessage = (event) => {
      const parsed = reply.safeParse(event.data)
      if (!parsed.success) {
        this.fail(new Error('Invalid storage worker response'))
        return
      }
      const response = parsed.data
      const pending = this.pending.get(response.id)
      if (!pending) return
      this.pending.delete(response.id)
      clearTimeout(pending.timer)
      if (response.ok) pending.resolve(response.value)
      else pending.reject(new Error(response.error))
    }
    this.worker.onerror = (event) => {
      this.fail(new Error(event.message))
    }
    this.ready = this.send({ file })
    void this.ready.catch((error) =>
      this.fail(error instanceof Error ? error : new Error('Storage initialization failed')),
    )
  }
  private fail(error: Error) {
    if (this.failure) return
    this.failure = error
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer)
      pending.reject(error)
    }
    this.pending.clear()
    this.worker.terminate()
    Artifacts.unbind(dirname(this.file), this)
    this.emit('failure', error)
  }
  private send(body: { file?: string; command?: StoreCommand }) {
    if (this.failure) return Promise.reject(this.failure)
    if (this.pending.size >= 256) return Promise.reject(new Error('Storage queue full'))
    const id = crypto.randomUUID()
    return new Promise<unknown>((resolve, reject) => {
      const timer = setTimeout(
        () => this.fail(new Error('Storage did not acknowledge; journal requires recovery')),
        30000,
      )
      this.pending.set(id, { resolve, reject, timer })
      this.worker.postMessage({ id, ...body })
    })
  }
  async call(command: StoreCommand) {
    await this.ready
    if (this.closing) throw new Error('Storage is closed')
    const result = await this.send({ command })
    if (
      !command.op.endsWith('.get') &&
      !command.op.endsWith('.list') &&
      !command.op.endsWith('.page') &&
      !['event.tail', 'session.snapshot', 'run.cursor', 'artifact.usage'].includes(command.op) &&
      !['memory.search', 'event.last', 'effect.uncertain', 'effect.pending', 'close'].includes(
        command.op,
      )
    )
      this.emit('changed', {
        op: command.op,
        namespaces:
          'namespace' in command
            ? [command.namespace]
            : 'documents' in command
              ? [...new Set(command.documents.map((document) => document.namespace))]
              : [],
      } satisfies StoreMutation)
    return result
  }
  async close() {
    if (!this.closing) this.closing = this.finishClose()
    return this.closing
  }
  private async finishClose() {
    try {
      if (!this.failure) {
        await this.ready
        await this.send({ command: { op: 'close' } })
      }
    } finally {
      this.worker.terminate()
      Artifacts.unbind(dirname(this.file), this)
    }
  }
}
