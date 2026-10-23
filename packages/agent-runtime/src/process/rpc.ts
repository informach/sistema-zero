import { StringDecoder } from 'node:string_decoder'
import { sanitize } from '@sistemazero/agent-core'
import { z } from 'zod'
import type { OwnedProcess } from './owned'

const envelope = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  method: z.string().optional(),
  params: z.unknown().optional(),
  result: z.unknown().optional(),
  error: z.object({ code: z.number(), message: z.string() }).optional(),
})
export class ProcessRpcError extends Error {
  constructor(
    readonly code: number,
    message: string,
  ) {
    super(message)
    this.name = 'ProcessRpcError'
  }
}
export class ProcessRpc {
  private sequence = 0
  private pending = new Map<
    string | number,
    {
      resolve: (value: unknown) => void
      reject: (error: Error) => void
      timer: ReturnType<typeof setTimeout>
    }
  >()
  private failure: Error | undefined
  private incoming = 0
  private diagnosticTail = ''
  private stopped = false
  readonly done: Promise<void>
  onRequest: (method: string, params: unknown) => Promise<unknown> = async () => {
    throw new Error('Unsupported request')
  }
  onNotification: (method: string, params: unknown) => void = () => {}
  onFailure: (error: Error) => void = () => {}
  constructor(
    readonly process: OwnedProcess,
    private jsonrpc = false,
  ) {
    this.done = this.read().catch((error) =>
      this.fail(error instanceof Error ? error : new Error(String(error))),
    )
    void this.drainErrors().catch((error) =>
      this.fail(error instanceof Error ? error : new Error(String(error))),
    )
  }
  private async drainErrors() {
    for await (const chunk of this.process.stderr) {
      this.diagnosticTail = (this.diagnosticTail + Buffer.from(chunk).toString('utf8')).slice(-4000)
      /* Never merge diagnostics into the JSON protocol. */
    }
  }
  private async read() {
    const decoder = new StringDecoder('utf8')
    let buffer = ''
    for await (const chunk of this.process.stdout) {
      buffer += decoder.write(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
      let boundary = buffer.indexOf('\n')
      while (boundary >= 0) {
        if (Buffer.byteLength(buffer.slice(0, boundary)) > 1_000_000)
          throw new Error('Native protocol frame exceeds limit')
        const line = buffer.slice(0, boundary)
        buffer = buffer.slice(boundary + 1)
        if (line.trim()) this.receive(envelope.parse(JSON.parse(line)))
        boundary = buffer.indexOf('\n')
      }
      if (Buffer.byteLength(buffer) > 1_000_000)
        throw new Error('Native protocol frame exceeds limit')
    }
    buffer += decoder.end()
    if (buffer.trim()) throw new Error('Native protocol ended with an incomplete frame')
    if (!this.stopped)
      throw new Error(
        `Native process ended before client shutdown: ${sanitize(this.diagnosticTail)}`,
      )
  }
  private receive(message: z.infer<typeof envelope>) {
    if (message.method) {
      if (message.id === undefined) {
        this.onNotification(message.method, message.params)
        return
      }
      if (++this.incoming > 16) throw new Error('Too many native requests')
      const id = message.id
      void this.onRequest(message.method, message.params)
        .then(
          (result) => this.send({ id, result }),
          (error) =>
            this.send({
              id,
              error: {
                code: -32603,
                message: error instanceof Error ? error.message.slice(0, 1000) : 'Request failed',
              },
            }),
        )
        .catch((error) => this.fail(error))
        .finally(() => {
          this.incoming--
        })
      return
    }
    if (message.id === undefined) throw new Error('Native response has no request ID')
    const request = this.pending.get(message.id)
    if (!request) return
    clearTimeout(request.timer)
    this.pending.delete(message.id)
    if (message.error)
      request.reject(new ProcessRpcError(message.error.code, message.error.message.slice(0, 8000)))
    else request.resolve(message.result)
  }
  private send(value: unknown) {
    if (this.failure) throw this.failure
    this.process.send(
      `${JSON.stringify(this.jsonrpc ? { jsonrpc: '2.0', ...z.record(z.string(), z.unknown()).parse(value) } : value)}\n`,
    )
  }
  notify(method: string, params: unknown = {}) {
    this.send({ method, params })
  }
  request(method: string, params: unknown = {}, timeoutMs = 30000): Promise<unknown> {
    if (this.failure) return Promise.reject(this.failure)
    if (this.pending.size >= 32) return Promise.reject(new Error('Too many native RPC calls'))
    const id = ++this.sequence
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id)
        reject(new Error(`Native RPC timeout: ${method}`))
      }, timeoutMs)
      this.pending.set(id, { resolve, reject, timer })
      try {
        this.send({ id, method, params })
      } catch (error) {
        clearTimeout(timer)
        this.pending.delete(id)
        reject(error)
      }
    })
  }
  private fail(error: Error) {
    if (this.failure) return
    this.failure = error
    for (const item of this.pending.values()) {
      clearTimeout(item.timer)
      item.reject(error)
    }
    this.pending.clear()
    this.process.cancel()
    this.onFailure(error)
  }
  async close() {
    this.stopped = true
    this.fail(new Error('Native transport closed'))
    await this.process.close()
    await this.done
  }
}
