import { execFile } from 'node:child_process'

/** Test infrastructure only. The caller may delete inputs only after retired=true. */
export async function runOwnedNodeProcess(options: {
  command: string[]
  timeoutMs: number
  signal?: AbortSignal
}) {
  options.signal?.throwIfAborted()
  if (!Number.isSafeInteger(options.timeoutMs) || options.timeoutMs < 1)
    throw new Error('Invalid owned-process deadline')
  const child = Bun.spawn(options.command, {
    stdin: 'ignore',
    stdout: 'pipe',
    stderr: 'pipe',
    windowsHide: true,
    detached: process.platform !== 'win32',
  })
  const output = { stdout: '', stderr: '' }
  async function drain(stream: ReadableStream<Uint8Array>, key: keyof typeof output) {
    const reader = stream.getReader()
    const chunks: Uint8Array[] = []
    let size = 0
    try {
      for (;;) {
        const { value, done } = await reader.read()
        if (done) return
        size += value.byteLength
        if (size > 65536) throw new Error(`Owned child ${key} exceeded 64 KiB`)
        chunks.push(value)
        output[key] = Buffer.concat(chunks).toString('utf8')
      }
    } finally {
      reader.releaseLock()
    }
  }
  const stdout = drain(child.stdout, 'stdout')
  const stderr = drain(child.stderr, 'stderr')
  const completion = Promise.all([child.exited, stdout, stderr])
  let timer: ReturnType<typeof setTimeout> | undefined
  let abortListener: (() => void) | undefined
  let failure: unknown
  let retired = false
  try {
    const deadline = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('Owned child deadline expired')), options.timeoutMs)
      abortListener = () => reject(options.signal?.reason ?? new Error('Owned child cancelled'))
      options.signal?.addEventListener('abort', abortListener, { once: true })
      if (options.signal?.aborted) abortListener()
    })
    await Promise.race([completion, deadline])
    retired = true
  } catch (error) {
    failure = error
    // A second, independent parent budget bounds tree retirement and pipe/exit ACK.
    // Never rely on the Node runner's event loop or cooperative Miniflare.dispose().
    let retirementTimer: ReturnType<typeof setTimeout> | undefined
    try {
      const retirement = (async () => {
        if (process.platform === 'win32') {
          if (child.exitCode === null) {
            await new Promise<void>((resolve, reject) => {
              execFile(
                'taskkill',
                ['/PID', String(child.pid), '/T', '/F'],
                { windowsHide: true, timeout: 4500, maxBuffer: 16384 },
                (killError) => {
                  if (killError && child.exitCode === null) reject(killError)
                  else resolve()
                },
              )
            })
          }
        } else {
          try {
            process.kill(-child.pid, 'SIGKILL')
          } catch (killError) {
            if (
              !(
                killError &&
                typeof killError === 'object' &&
                'code' in killError &&
                killError.code === 'ESRCH'
              )
            )
              throw killError
          }
        }
        await child.exited
        await Promise.allSettled([stdout, stderr])
      })()
      await Promise.race([
        retirement,
        new Promise<never>((_, reject) => {
          retirementTimer = setTimeout(
            () => reject(new Error('Owned child retirement was not acknowledged')),
            5000,
          )
        }),
      ])
      retired = true
    } catch (cleanupError) {
      failure = new AggregateError(
        [error, cleanupError],
        'Owned child failed and retirement was not confirmed',
      )
    } finally {
      clearTimeout(retirementTimer)
    }
  } finally {
    clearTimeout(timer)
    if (abortListener) options.signal?.removeEventListener('abort', abortListener)
  }
  return { exit: child.exitCode, ...output, retired, failure }
}
