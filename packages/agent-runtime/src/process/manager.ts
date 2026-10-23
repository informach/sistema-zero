import { randomUUID } from 'node:crypto'
import { mkdir, open } from 'node:fs/promises'
import { join } from 'node:path'
import { Locks } from '../execution/locks'
import { OwnedProcess, type ProcessOptions } from './owned'
import { Spool } from './spool'

export { processEnvironment } from './environment'
export interface ProcessRequest extends ProcessOptions {
  timeoutMs?: number
  maxBytes?: number
  logMode?: 'combined' | 'stdout'
  input?: string
}
export interface ProcessResult {
  id: string
  code: number | null
  signal: NodeJS.Signals | null
  reason: string
  bytes: number
  output: string
  log: string
}
export interface ProcessHandle {
  id: string
  pid: number
  completion: Promise<ProcessResult>
  cancel: () => void
  inspect: () => { running: boolean; bytes: number; output: string; log: string }
}
export class Processes {
  readonly active = new Map<
    string,
    { pid: number; executable: string; jobName?: string; cancel: () => void }
  >()
  constructor(private directory: string) {}
  collect() {
    return new Spool(this.directory).collect()
  }
  async open(request: ProcessOptions) {
    return OwnedProcess.start(this.directory, request)
  }
  async start(request: ProcessRequest, signal: AbortSignal): Promise<ProcessHandle> {
    signal.throwIfAborted()
    if (request.input && Buffer.byteLength(request.input) > 128000)
      throw new Error('Process input exceeds 128 KB')
    const id = randomUUID()
    const directory = join(this.directory, 'logs')
    await mkdir(directory, { recursive: true, mode: 0o700 })
    const release = await new Spool(this.directory).reserve(
      id + '.log',
      request.maxBytes ?? 4_000_000,
    )
    const log = await open(join(directory, id + '.log'), 'wx', 0o600).catch(async (error) => {
      await release(0)
      throw error
    })
    let process: OwnedProcess
    try {
      process = await this.open(request)
      if (!process.child.pid) {
        await process.close()
        throw new Error('Process did not start')
      }
    } catch (error) {
      await log.close()
      await release(0)
      throw error
    }
    let reason = ''
    let running = true
    let total = 0
    let tail = Buffer.alloc(0)
    const abort = () => {
      reason = 'canceled'
      process.cancel()
    }
    const timer = setTimeout(() => {
      reason = 'timeout'
      process.cancel()
    }, request.timeoutMs ?? 120000)
    signal.addEventListener('abort', abort, { once: true })
    if (signal.aborted) abort()
    const pid = process.child.pid
    if (!pid) {
      await process.close()
      await log.close()
      throw new Error('Missing process identity')
    }
    this.active.set(id, {
      pid,
      executable: request.executable,
      jobName: process.jobName,
      cancel: abort,
    })
    try {
      if (request.input) process.send(request.input)
      if (!request.terminal) process.endInput()
    } catch (error) {
      clearTimeout(timer)
      signal.removeEventListener('abort', abort)
      this.active.delete(id)
      await process.close()
      await log.close()
      await release(0)
      throw error
    }
    const writes = new Locks()
    const consume = async (stream: NodeJS.ReadableStream, stdout: boolean) => {
      for await (const data of stream) {
        const chunk = Buffer.isBuffer(data) ? data : Buffer.from(data)
        const accepted = chunk.subarray(0, Math.max(0, (request.maxBytes ?? 4_000_000) - total))
        total += accepted.length
        if (accepted.length && (request.logMode !== 'stdout' || stdout))
          await writes.with('log', () => log.writeFile(accepted))
        tail = Buffer.concat([tail, chunk.subarray(-32000)]).subarray(-32000)
        if (accepted.length < chunk.length && !reason) {
          reason = 'output_limit'
          process.cancel()
        }
      }
    }
    const consumers = [consume(process.stdout, true), consume(process.stderr, false)]
    const completion = (async (): Promise<ProcessResult> => {
      try {
        const [result] = await Promise.all([process.exited, Promise.all(consumers)])
        return {
          id,
          ...result,
          reason: reason || 'exited',
          bytes: total,
          output: tail.toString('utf8'),
          log: id + '.log',
        }
      } catch (error) {
        process.cancel()
        throw error
      } finally {
        running = false
        clearTimeout(timer)
        signal.removeEventListener('abort', abort)
        await Promise.allSettled(consumers)
        this.active.delete(id)
        try {
          await log.close()
        } finally {
          await release(total)
          await process.close()
        }
      }
    })()
    // Consumers can fail while a service is still being registered; completion remains rejected for its owner.
    void completion.catch(() => {})
    return {
      id,
      pid,
      completion,
      cancel: abort,
      inspect: () => ({ running, bytes: total, output: tail.toString('utf8'), log: id + '.log' }),
    }
  }
  async run(request: ProcessRequest, signal: AbortSignal) {
    return (await this.start(request, signal)).completion
  }
}
