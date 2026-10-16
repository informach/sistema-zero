import { z } from 'zod'
import { hash, readBounded, workspacePath } from '../tools/paths'
import type { ProjectIndex } from './index'

declare const ZERO_TYPESCRIPT_WORKER: string | undefined
const response = z.discriminatedUnion('ok', [
  z.object({ id: z.string(), ok: z.literal(true), value: z.unknown(), sha256: z.string() }),
  z.object({ id: z.string(), ok: z.literal(false), error: z.string() }),
])
export class TypeScriptService {
  private active = 0
  constructor(private index: ProjectIndex) {}
  async query(
    workspace: string,
    path: string,
    operation: 'diagnostics' | 'symbols' | 'definition',
    position: number,
    signal: AbortSignal,
  ) {
    if (this.active >= 2) throw new Error('TypeScript analysis capacity reached')
    signal.throwIfAborted()
    this.active++
    let worker: Worker | undefined
    try {
      const target = await workspacePath(workspace, path)
      const generation = this.index.observe(workspace).generation
      worker = new Worker(
        new URL(
          typeof ZERO_TYPESCRIPT_WORKER === 'undefined'
            ? './typescript-worker.ts'
            : ZERO_TYPESCRIPT_WORKER,
          import.meta.url,
        ).href,
      )
      const current = worker
      const id = crypto.randomUUID()
      const result = await new Promise<z.infer<typeof response>>((resolve, reject) => {
        const timer = setTimeout(() => {
          cleanup()
          reject(new Error('TypeScript analysis timed out'))
        }, 30000)
        const abort = () => {
          cleanup()
          reject(signal.reason ?? new Error('Canceled'))
        }
        const cleanup = () => {
          clearTimeout(timer)
          signal.removeEventListener('abort', abort)
        }
        signal.addEventListener('abort', abort, { once: true })
        current.onmessage = (event) => {
          const parsed = response.safeParse(event.data)
          cleanup()
          if (!parsed.success) {
            reject(new Error('Invalid TypeScript response'))
            return
          }
          resolve(parsed.data)
        }
        current.onerror = (event) => {
          cleanup()
          reject(new Error(event.message))
        }
        current.postMessage({ id, workspace, path: target, operation, position })
        if (signal.aborted) abort()
      })
      if (!result.ok) throw new Error(result.error)
      const stale =
        this.index.observe(workspace).generation !== generation ||
        hash(await readBounded(target, 2_000_000)) !== result.sha256
      return { path, sha256: result.sha256, stale, value: result.value }
    } finally {
      worker?.terminate()
      this.active--
    }
  }
}
