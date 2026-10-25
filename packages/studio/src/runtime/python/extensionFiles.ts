import { fetchPythonWebBytes } from './webFiles'

/** One bounded, cancellable batch for immutable extension files owned by the runtime. */
export async function loadPythonExtensionFiles(input: {
  base: URL
  files: readonly string[]
  maximum: number | ((filename: string) => number)
  label: string
  signal?: AbortSignal
}): Promise<ReadonlyMap<string, Uint8Array<ArrayBuffer>>> {
  const { files, maximum, label, signal } = input
  signal?.throwIfAborted()
  const directory = new URL(input.base.href)
  const scope = new AbortController()
  const withdraw = () => scope.abort(signal!.reason)
  signal?.addEventListener('abort', withdraw, { once: true })
  const timeout = setTimeout(
    () => scope.abort(new Error(`O carregamento ${label} excedeu o tempo limite.`)),
    30_000,
  )
  try {
    const result = await Promise.all(
      files.map(async (filename) => {
        const bytes = await fetchPythonWebBytes(
          new URL(filename, directory),
          typeof maximum === 'number' ? maximum : maximum(filename),
          scope.signal,
        )
        return [filename, bytes] as const
      }),
    )
    scope.signal.throwIfAborted()
    return new Map(result)
  } catch (error) {
    scope.abort(error)
    throw error
  } finally {
    clearTimeout(timeout)
    signal?.removeEventListener('abort', withdraw)
  }
}
