import { fetchPythonWebBytes } from '../webFiles'
import { PYGAME_CE_WHEEL, PYGAME_MODULE_FILES } from './contract'

const sourceByteLimit = 256 * 1024
const fontByteLimit = 1024 * 1024
const sourceTimeoutMs = 30_000

/**
 * The host bridge and the pinned pygame-ce wheel. Closed and immutable: never a project
 * filename or an executable URL. The distribution manifest pins every file by SHA-256 and the
 * host verifies it; the worker (not always a secure context) checks the exact size.
 */
export async function loadPygameModuleSources(
  base: URL,
  signal?: AbortSignal,
): Promise<{
  sources: ReadonlyMap<string, Uint8Array<ArrayBuffer>>
  wheel: Uint8Array<ArrayBuffer>
}> {
  signal?.throwIfAborted()
  const scope = new AbortController()
  const withdraw = () => scope.abort(signal!.reason)
  signal?.addEventListener('abort', withdraw, { once: true })
  const timeout = setTimeout(
    () => scope.abort(new Error('O carregamento do Pygame-ce excedeu o tempo limite.')),
    sourceTimeoutMs,
  )
  try {
    const [wheel, ...sources] = await Promise.all([
      fetchPythonWebBytes(new URL(PYGAME_CE_WHEEL.file, base), PYGAME_CE_WHEEL.bytes, scope.signal),
      ...PYGAME_MODULE_FILES.map(
        async (filename) =>
          [
            filename,
            await fetchPythonWebBytes(
              new URL(`pygame/${filename}`, base),
              filename.endsWith('.ttf') ? fontByteLimit : sourceByteLimit,
              scope.signal,
            ),
          ] as const,
      ),
    ])
    scope.signal.throwIfAborted()
    if (wheel.byteLength !== PYGAME_CE_WHEEL.bytes)
      throw new Error('O pacote do Pygame-ce não corresponde à distribuição aprovada.')
    return { sources: new Map(sources), wheel }
  } catch (error) {
    scope.abort(error)
    throw error
  } finally {
    clearTimeout(timeout)
    signal?.removeEventListener('abort', withdraw)
  }
}
