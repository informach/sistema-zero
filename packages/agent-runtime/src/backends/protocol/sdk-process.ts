import { EventEmitter } from 'node:events'
import { Transform, Writable } from 'node:stream'
import type { SpawnedProcess, SpawnOptions } from '@anthropic-ai/claude-agent-sdk'
import type { Processes } from '../../process/manager'
import type { OwnedProcess } from '../../process/owned'

/** Official SDK process contract, backed by the same owned process tree as coding tools. */
export class SdkProcess extends EventEmitter implements SpawnedProcess {
  readonly stdin: Writable
  readonly stdout: Transform
  killed = false
  exitCode: number | null = null
  signalCode: NodeJS.Signals | null = null
  private owned: Promise<OwnedProcess>
  readonly done: Promise<void>
  constructor(processes: Processes, options: SpawnOptions) {
    super()
    const env: Record<string, string> = {}
    for (const [key, value] of Object.entries(options.env))
      if (value !== undefined) env[key] = value
    this.owned = processes.open({
      executable: options.command,
      args: options.args,
      cwd: options.cwd ?? process.cwd(),
      env,
    })
    this.stdin = new Writable({
      highWaterMark: 64000,
      write: (chunk, _encoding, callback) => {
        void this.owned
          .then((child) => child.send(chunk))
          .then(
            () => callback(),
            (error) => callback(error),
          )
      },
      final: (callback) => {
        void this.owned
          .then((child) => child.endInput())
          .then(
            () => callback(),
            (error) => callback(error),
          )
      },
    })
    let lineBytes = 0
    let total = 0
    this.stdout = new Transform({
      highWaterMark: 64000,
      transform: (chunk: Buffer, _encoding, callback) => {
        total += chunk.length
        if (total > 16_000_000) {
          callback(new Error('Native output exceeds 16 MB'))
          return
        }
        for (const byte of chunk) {
          if (byte === 10) lineBytes = 0
          else if (++lineBytes > 1_000_000) {
            callback(new Error('Native protocol frame exceeds limit'))
            return
          }
        }
        callback(null, chunk)
      },
    })
    const abort = () => this.kill('SIGKILL')
    this.stdout.on('error', abort)
    this.stdin.on('error', abort)
    options.signal.addEventListener('abort', abort, { once: true })
    if (options.signal.aborted) this.killed = true
    this.done = this.owned
      .then(async (child) => {
        if (this.killed) child.cancel()
        child.stdout.pipe(this.stdout)
        // Drain diagnostic output without logging account information or private payloads.
        const stderr = (async () => {
          for await (const _chunk of child.stderr) {
          }
        })()
        const result = await child.exited
        await stderr
        this.exitCode = result.code
        this.signalCode = result.signal
        this.emit('exit', result.code, result.signal)
      })
      .catch((error) => {
        this.emit('error', error)
        this.stdout.destroy(error instanceof Error ? error : new Error(String(error)))
      })
      .finally(() => options.signal.removeEventListener('abort', abort))
  }
  kill(_signal: NodeJS.Signals) {
    this.killed = true
    void this.owned.then((child) => child.cancel()).catch((error) => this.emit('error', error))
    return true
  }
}
