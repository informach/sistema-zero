import { createHash } from 'node:crypto'
import { mkdir, mkdtemp, readFile, rename, rmdir, stat, unlink } from 'node:fs/promises'
import { resolve } from 'node:path'
import manifest from './stdlib-manifest.json'

const digest = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex')
const isMissing = (error: unknown) =>
  error !== null && typeof error === 'object' && 'code' in error && error.code === 'ENOENT'

async function readVerified(path: string, signal: AbortSignal): Promise<boolean> {
  signal.throwIfAborted()
  try {
    const info = await stat(path)
    signal.throwIfAborted()
    if (!info.isFile() || info.size !== manifest.bytes) return false
    const bytes = await readFile(path, { signal })
    signal.throwIfAborted()
    return bytes.length === manifest.bytes && digest(bytes) === manifest.sha256
  } catch (error) {
    if (isMissing(error)) return false
    throw error
  }
}

async function readBounded(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  try {
    for (;;) {
      const { value, done } = await reader.read()
      if (done) return Buffer.concat(chunks).toString('utf8')
      total += value.byteLength
      if (total > 16384)
        throw new Error('A saída do compilador da biblioteca padrão excedeu o limite.')
      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }
}

/** One owned compiler per miss; no project inputs or shared cancellable work. */
export async function preparePythonStandardLibrary(options: {
  vendorDirectory: string
  cacheDirectory: string
  signal?: AbortSignal
  nodeExecutable?: string
  timeoutMs?: number
}) {
  const vendorDirectory = resolve(options.vendorDirectory)
  const nodeExecutable = options.nodeExecutable ?? process.env.STUDIO_PYTHON_BUILD_NODE ?? 'node'
  const timeoutMs = options.timeoutMs ?? 60000
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 60000)
    throw new Error('Prazo inválido para preparar a biblioteca padrão.')
  const signal = AbortSignal.any([
    AbortSignal.timeout(timeoutMs),
    ...(options.signal ? [options.signal] : []),
  ])
  const cacheDirectory = resolve(options.cacheDirectory)
  const destination = resolve(cacheDirectory, `${manifest.sha256}.zip`)
  const result = { path: destination, sha256: manifest.sha256, recipe: manifest.recipe }
  signal.throwIfAborted()
  await mkdir(cacheDirectory, { recursive: true })
  signal.throwIfAborted()
  const cached = await readVerified(destination, signal)
  signal.throwIfAborted()
  if (cached) return result

  // Each call owns this directory. Never recursively remove a computed target.
  const temporary = await mkdtemp(resolve(cacheDirectory, '.compile-'))
  const output = resolve(temporary, 'compiled.zip')
  let child: ReturnType<typeof Bun.spawn> | undefined
  let exited = false
  let abortListener: (() => void) | undefined
  let drain: Promise<unknown> | undefined
  try {
    signal.throwIfAborted()
    const environment: Record<string, string> = { NODE_OPTIONS: '--max-old-space-size=768' }
    // Node needs OS paths, not application credentials or provider configuration.
    for (const key of [
      'PATH',
      'Path',
      'SystemRoot',
      'SYSTEMROOT',
      'WINDIR',
      'TEMP',
      'TMP',
      'TMPDIR',
    ]) {
      const value = process.env[key]
      if (value !== undefined) environment[key] = value
    }
    const compiler = Bun.spawn(
      [nodeExecutable, resolve(import.meta.dirname, 'compile-stdlib.mjs'), vendorDirectory, output],
      { env: environment, stdin: 'ignore', stdout: 'pipe', stderr: 'pipe', windowsHide: true },
    )
    child = compiler
    const onExit = compiler.exited.then((code) => {
      exited = true
      return code
    })
    const aborted = new Promise<never>((_, reject) => {
      abortListener = () => reject(signal.reason)
      signal.addEventListener('abort', abortListener, { once: true })
      if (signal.aborted) abortListener()
    })
    const collected = Promise.all([
      onExit,
      readBounded(compiler.stdout),
      readBounded(compiler.stderr),
    ])
    drain = collected
    const [code, stdout, stderr] = await Promise.race([collected, aborted])
    signal.throwIfAborted()
    if (code !== 0)
      throw new Error(`Falha ao preparar a biblioteca padrão (exit ${code}): ${stderr}`)
    const receipt: unknown = JSON.parse(stdout)
    if (receipt === null || typeof receipt !== 'object' || Array.isArray(receipt))
      throw new Error('Recibo inválido do compilador da biblioteca padrão.')
    for (const key of [
      'recipe',
      'pythonVersion',
      'magic',
      'sourceSha256',
      'compiledModules',
      'bytes',
      'sha256',
    ] as const) {
      if (!(key in receipt) || Reflect.get(receipt, key) !== manifest[key])
        throw new Error(`Recibo do compilador divergente: ${key}.`)
    }
    if (!('sourcesPreserved' in receipt) || receipt.sourcesPreserved !== true)
      throw new Error('O compilador não confirmou a preservação das fontes.')
    if (!(await readVerified(output, signal)))
      throw new Error('Integridade inválida da biblioteca padrão compilada.')
    if (stderr.trim()) console.warn(stderr.trim())
    signal.throwIfAborted()
    try {
      await rename(output, destination)
    } catch (error) {
      // Windows may refuse replacing another writer's completed cache file.
      // Only a fully verified identical winner makes that publication successful.
      if (!(await readVerified(destination, signal))) throw error
    }
    signal.throwIfAborted()
    if (!(await readVerified(destination, signal)))
      throw new Error('Integridade inválida do cache da biblioteca padrão.')
  } finally {
    if (abortListener) signal.removeEventListener('abort', abortListener)
    if (child && !exited) {
      child.kill('SIGKILL')
      // Retirement has its own bounded acknowledgement after the caller deadline.
      let timer: ReturnType<typeof setTimeout> | undefined
      try {
        await Promise.race([
          child.exited,
          new Promise<never>((_, reject) => {
            timer = setTimeout(
              () => reject(new Error('O processo do compilador não confirmou encerramento.')),
              5000,
            )
          }),
        ])
        exited = true
      } finally {
        clearTimeout(timer)
      }
    }
    // Do not remove a directory still owned by an unretired process.
    if (!child || exited) {
      await drain?.catch(() => undefined)
      await unlink(output).catch((error: unknown) => {
        if (!isMissing(error)) throw error
      })
      await rmdir(temporary)
    }
  }
  // A return inside try would still await cleanup and could accept a retired owner.
  signal.throwIfAborted()
  return result
}
