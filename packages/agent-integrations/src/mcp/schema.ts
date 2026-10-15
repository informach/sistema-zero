import { z } from 'zod'

declare const ZERO_MCP_SCHEMA_WORKER: string | undefined
const response = z.object({ id: z.string(), valid: z.boolean(), error: z.string() })
export class SchemaValidator {
  private worker: Worker | undefined
  private pending = new Map<
    string,
    { resolve: () => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> }
  >()
  async validate(schema: Record<string, unknown>, value: unknown, compileOnly = false) {
    if (Buffer.byteLength(JSON.stringify({ schema, value })) > 1_000_000)
      throw new Error('MCP schema input exceeds limit')
    if (this.pending.size >= 16) throw new Error('MCP validation capacity reached')
    if (!this.worker) {
      this.worker = new Worker(
        new URL(
          typeof ZERO_MCP_SCHEMA_WORKER === 'undefined'
            ? './schema-worker.ts'
            : ZERO_MCP_SCHEMA_WORKER,
          import.meta.url,
        ).href,
      )
      this.worker.onmessage = (event) => {
        const result = response.safeParse(event.data)
        if (!result.success) {
          this.close(new Error('Invalid schema worker response'))
          return
        }
        const pending = this.pending.get(result.data.id)
        if (!pending) return
        this.pending.delete(result.data.id)
        clearTimeout(pending.timer)
        if (result.data.valid) pending.resolve()
        else pending.reject(new Error(result.data.error))
      }
      this.worker.onerror = (event) => this.close(new Error(event.message))
    }
    const worker = this.worker
    const id = crypto.randomUUID()
    return new Promise<void>((resolve, reject) => {
      const timer = setTimeout(
        () => this.close(new Error('MCP schema validation deadline exceeded')),
        3000,
      )
      this.pending.set(id, { resolve, reject, timer })
      worker.postMessage({ id, schema, value, compileOnly })
    })
  }
  close(error = new Error('Schema validator closed')) {
    this.worker?.terminate()
    this.worker = undefined
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer)
      pending.reject(error)
    }
    this.pending.clear()
  }
}
