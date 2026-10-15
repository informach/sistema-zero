import { createHash, randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { processEnvironment } from './environment'

declare const ZERO_JOB_HELPER: string | undefined
declare const ZERO_JOB_BINARY: string | undefined
const compiling = new Map<string, Promise<string>>()
export function windowsLaunchError(error: unknown, executable: string): Error {
  if (!(error instanceof Error)) return new Error('Windows process launch failed', { cause: error })
  if (!('code' in error) || error.code !== 'EUNKNOWN') return error
  return new Error(
    `Windows rejected native helper ${executable} (EUNKNOWN). Inspect Code Integrity events 3033/3077. If this binary is blocked by signing policy, use a release signed by a publisher trusted by this machine. The operation was not retried.`,
    { cause: error },
  )
}
export async function verifyWindowsPort(
  directory: string,
  jobName: string,
  port: number,
  signal: AbortSignal,
) {
  signal.throwIfAborted()
  const executable = await windowsHelper(directory)
  signal.throwIfAborted()
  const child = Bun.spawn([executable], {
    env: {
      ...processEnvironment(),
      ZERO_PROCESS_REQUEST: Buffer.from(JSON.stringify({ jobName, portProbe: port })).toString(
        'base64',
      ),
    },
    stdin: 'ignore',
    stdout: 'pipe',
    stderr: 'pipe',
    windowsHide: true,
  })
  const deadline = AbortSignal.any([signal, AbortSignal.timeout(5000)])
  const abort = () => {
    child.kill()
  }
  deadline.addEventListener('abort', abort, { once: true })
  if (deadline.aborted) abort()
  try {
    const [output, errors, code] = await Promise.all([
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
      child.exited,
    ])
    deadline.throwIfAborted()
    if (code !== 0 || output.trim() !== 'OWNED')
      throw new Error(`Could not establish port ownership (exit ${code}): ${errors.slice(-4000)}`)
  } finally {
    deadline.removeEventListener('abort', abort)
  }
}
export function windowsHelper(directory: string): Promise<string> {
  if (typeof ZERO_JOB_BINARY !== 'undefined')
    return Promise.resolve(fileURLToPath(new URL(ZERO_JOB_BINARY, import.meta.url)))
  let promise = compiling.get(directory)
  if (!promise) {
    promise = compile(directory)
    compiling.set(directory, promise)
    void promise.catch(() => compiling.delete(directory))
  }
  return promise
}
async function compile(directory: string) {
  const source = fileURLToPath(
    new URL(
      typeof ZERO_JOB_HELPER === 'undefined' ? './windows-job.ps1' : ZERO_JOB_HELPER,
      import.meta.url,
    ),
  )
  const digest = createHash('sha256')
    .update(await readFile(source))
    .digest('hex')
  const bin = join(directory, 'bin')
  await mkdir(bin, { recursive: true, mode: 0o700 })
  const target = join(bin, `windows-job-${digest}.exe`)
  try {
    if ((await stat(target)).isFile()) return target
  } catch (error) {
    if (!(error instanceof Error) || !('code' in error) || error.code !== 'ENOENT') throw error
  }
  const temporary = join(bin, `${randomUUID()}.exe`)
  const powershell = join(
    process.env.SystemRoot ?? 'C:\\Windows',
    'System32',
    'WindowsPowerShell',
    'v1.0',
    'powershell.exe',
  )
  const child = Bun.spawn(
    [
      powershell,
      '-NoProfile',
      '-NonInteractive',
      '-ExecutionPolicy',
      'Bypass',
      '-File',
      source,
      '-OutputFile',
      temporary,
    ],
    { env: processEnvironment(), stdout: 'pipe', stderr: 'pipe', windowsHide: true },
  )
  const timer = setTimeout(() => child.kill(), 30000)
  try {
    const [output, errors, code] = await Promise.all([
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
      child.exited,
    ])
    if (code !== 0)
      throw new Error(
        `Windows process helper compilation failed: ${output.slice(-4000)} ${errors.slice(-4000)}`,
      )
    await rename(temporary, target)
    return target
  } finally {
    clearTimeout(timer)
  }
}
