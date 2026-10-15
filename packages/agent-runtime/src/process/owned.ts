import { type ChildProcessWithoutNullStreams, spawn } from 'node:child_process'
import { processEnvironment } from './environment'
import { windowsHelper } from './windows'
export interface ProcessOptions {
  executable: string
  args: string[]
  cwd: string
  env?: Record<string, string>
  memoryMb?: number
  pids?: number
  terminal?: { columns: number; rows: number }
}
export class OwnedProcess {
  readonly exited: Promise<{ code: number | null; signal: NodeJS.Signals | null }>
  private closed = false
  private canceled = false
  private inputClosed = false
  private failure: Error | undefined
  private constructor(
    readonly child: ChildProcessWithoutNullStreams,
    private windows: boolean,
    private terminal: boolean,
  ) {
    this.exited = new Promise((resolve, reject) => {
      child.once('error', (error) => {
        this.failure = error
        reject(error)
      })
      child.once('close', (code, signal) => {
        this.closed = true
        resolve({ code, signal })
      })
    })
    // A caller may still be initializing protocol handlers when the OS refuses spawn.
    void this.exited.catch((error) => {
      this.failure = error
    })
    child.stdin.on('error', (error) => {
      this.failure = error
      this.cancel()
    })
  }
  static async start(directory: string, options: ProcessOptions) {
    if (options.args.some((argument) => argument.includes(String.fromCharCode(0))))
      throw new Error('NUL is not permitted in arguments')
    const executable = Bun.which(options.executable, { PATH: process.env.PATH })
    if (!executable) throw new Error(`Executable unavailable: ${options.executable}`)
    const windows = process.platform === 'win32'
    if (options.terminal) {
      if (!windows) throw new Error('PTY is currently homologated only on Windows (ConPTY)')
      for (const dimension of [options.terminal.columns, options.terminal.rows])
        if (!Number.isInteger(dimension) || dimension < 2 || dimension > 500)
          throw new Error('Terminal dimensions must be integers between 2 and 500')
    }
    const memoryMb = options.memoryMb ?? 4096,
      pids = options.pids ?? 64
    if (
      !Number.isInteger(memoryMb) ||
      memoryMb < 64 ||
      memoryMb > 16384 ||
      !Number.isInteger(pids) ||
      pids < 1 ||
      pids > 256
    )
      throw new Error('Invalid process resource limits')
    if (!windows && (options.memoryMb !== undefined || options.pids !== undefined))
      throw new Error(
        'Host process resource quotas require the Windows Job adapter; use a container on this platform',
      )
    if (windows && !/\.exe$/i.test(executable))
      throw new Error('Invoke a Windows executable; scripts require an explicit shell')
    const env = processEnvironment(options.env)
    const command = windows ? await windowsHelper(directory) : executable
    const child = spawn(command, windows ? [] : options.args, {
      cwd: options.cwd,
      env: windows
        ? {
            ...env,
            ZERO_PROCESS_REQUEST: Buffer.from(
              JSON.stringify({
                executable,
                arguments: options.args,
                cwd: options.cwd,
                memoryMb,
                pids,
                terminal: options.terminal,
              }),
            ).toString('base64'),
          }
        : env,
      windowsHide: true,
      detached: !windows,
      stdio: 'pipe',
    })
    return new OwnedProcess(child, windows, Boolean(options.terminal))
  }
  get stdout() {
    return this.child.stdout
  }
  get stderr() {
    return this.child.stderr
  }
  send(data: string | Uint8Array) {
    if (this.failure) throw this.failure
    if (this.closed || this.inputClosed || this.canceled) throw new Error('Process input is closed')
    const bytes = typeof data === 'string' ? Buffer.from(data) : Buffer.from(data)
    if (bytes.length > 1_000_000 || this.child.stdin.writableLength > 2_000_000)
      throw new Error('Process input exceeds backpressure limit')
    this.child.stdin.write(
      this.windows
        ? `${JSON.stringify({ type: 'write', data: bytes.toString('base64') })}\n`
        : bytes,
    )
  }
  endInput() {
    if (this.inputClosed) return
    this.inputClosed = true
    if (this.windows) this.child.stdin.write('{"type":"eof"}\n')
    else this.child.stdin.end()
  }
  resize(columns: number, rows: number) {
    if (!this.terminal || this.closed || this.canceled) throw new Error('No live terminal')
    for (const dimension of [columns, rows])
      if (!Number.isInteger(dimension) || dimension < 2 || dimension > 500)
        throw new Error('Invalid terminal dimensions')
    this.child.stdin.write(`${JSON.stringify({ type: 'resize', columns, rows })}\n`)
  }
  cancel() {
    if (this.canceled || this.closed) return
    this.canceled = true
    if (this.windows) this.child.stdin.end()
    else if (this.child.pid) {
      try {
        process.kill(-this.child.pid, 'SIGKILL')
      } catch (error) {
        if (!(error instanceof Error) || !('code' in error) || error.code !== 'ESRCH') throw error
      }
    }
  }
  async close() {
    this.cancel()
    await this.exited
  }
}
