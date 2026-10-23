import { fetchPythonWebBytes } from '../webFiles'
import { TURTLE_MODULE_FILES } from './contract'

const sourceByteLimit = 1024 * 1024
const sourceTimeoutMs = 30_000

/** Closed, immutable extension sources; never accepts a project filename or executable URL. */
export async function loadTurtleModuleSources(
  base: URL,
  signal?: AbortSignal,
): Promise<ReadonlyMap<string, Uint8Array<ArrayBuffer>>> {
  signal?.throwIfAborted()
  const directory = new URL(base.href)
  const scope = new AbortController()
  const withdraw = () => scope.abort(signal!.reason)
  signal?.addEventListener('abort', withdraw, { once: true })
  const timeout = setTimeout(
    () => scope.abort(new Error('O carregamento da extensão Turtle excedeu o tempo limite.')),
    sourceTimeoutMs,
  )
  try {
    const sources = await Promise.all(
      TURTLE_MODULE_FILES.map(async (filename) => {
        const bytes = await fetchPythonWebBytes(
          new URL(`turtle/${filename}`, directory),
          sourceByteLimit,
          scope.signal,
        )
        return [filename, bytes] as const
      }),
    )
    scope.signal.throwIfAborted()
    return new Map(sources)
  } catch (error) {
    scope.abort(error)
    throw error
  } finally {
    clearTimeout(timeout)
    signal?.removeEventListener('abort', withdraw)
  }
}
