import {
  capturePythonBootResourceManifest,
  PYTHON_BOOT_CACHE_GENERATIONS,
  PYTHON_BOOT_CACHE_PREFIX,
  type PythonBootResourceName,
  pythonBootResourceManifestKey,
} from './bootResourceManifest'
import { pythonWebBytesSha256, readPythonWebBytesExact } from './webFiles'

/** Narrow browser CacheStorage subset, not a generic authenticated response cache. */
export interface PythonBootCacheStorage {
  keys(): Promise<string[]>
  delete(name: string): Promise<boolean>
  open(name: string): Promise<{
    match(url: string): Promise<Response | undefined>
    put(url: string, response: Response): Promise<void>
    delete(url: string): Promise<boolean>
  }>
}

type CacheLock = <Value>(
  name: string,
  signal: AbortSignal,
  operation: () => Promise<Value>,
) => Promise<Value>

const browserCacheLock: CacheLock = async (name, signal, operation) => {
  const locks = globalThis.navigator?.locks
  if (!locks) throw new Error('O navegador não oferece coordenação do cache Python.')
  return await locks.request(name, { mode: 'exclusive', signal }, operation)
}

/** Only immutable public interpreter bytes persist; no learner state or execution authority. */
export function createPythonBootResourceStore(options: {
  directory: URL
  manifest: unknown
  cacheStorage: PythonBootCacheStorage
  fetch(url: URL, init: RequestInit): Promise<Response>
  /** Controlled port in unit proofs; production uses the origin's native Web Locks. */
  withCacheLock?: CacheLock
}) {
  const directory = new URL(options.directory.href)
  if (
    !['http:', 'https:'].includes(directory.protocol) ||
    directory.username ||
    directory.password ||
    directory.search ||
    directory.hash ||
    !directory.pathname.endsWith('/') ||
    directory.href.length > 2048 ||
    (directory.protocol === 'http:' &&
      !['localhost', '127.0.0.1', '[::1]'].includes(directory.hostname))
  )
    throw new Error('Diretório de boot Python inválido.')
  const manifest = capturePythonBootResourceManifest(options.manifest)
  const manifestKey = pythonBootResourceManifestKey(manifest)
  const files = new Map(manifest.files.map((file) => [file.name, file]))
  const cacheName = `${PYTHON_BOOT_CACHE_PREFIX}${encodeURIComponent(directory.href)}:${manifest.runtimeManifestSha256}`
  const storage = {
    keys: options.cacheStorage.keys.bind(options.cacheStorage),
    open: options.cacheStorage.open.bind(options.cacheStorage),
    delete: options.cacheStorage.delete.bind(options.cacheStorage),
  }
  const request = options.fetch
  const withCacheLock = options.withCacheLock ?? browserCacheLock

  async function openCache(signal: AbortSignal) {
    return withCacheLock('sz-python-boot-cache-v1', signal, async () => {
      signal.throwIfAborted()
      const keys = await storage.keys()
      signal.throwIfAborted()
      // CacheStorage keys preserve creation order. Only our public-byte caches are eligible.
      const previous = keys.filter(
        (key) => key.startsWith(PYTHON_BOOT_CACHE_PREFIX) && key !== cacheName,
      )
      while (previous.length >= PYTHON_BOOT_CACHE_GENERATIONS) {
        const oldest = previous.shift()
        if (oldest === undefined) throw new Error('Ordem de cache Python inválida.')
        await storage.delete(oldest)
        signal.throwIfAborted()
      }
      const cache = await storage.open(cacheName)
      signal.throwIfAborted()
      return cache
    })
  }

  async function readLocked(name: PythonBootResourceName, signal: AbortSignal) {
    signal.throwIfAborted()
    const file = files.get(name)
    if (!file) throw new Error('Recurso de boot Python não autorizado.')
    const url = new URL(file.name, directory)
    const cache = await openCache(signal)
    signal.throwIfAborted()
    let response = await cache.match(url.href)
    if (signal.aborted) {
      await response?.body?.cancel(signal.reason)
      signal.throwIfAborted()
    }
    const cached = response !== undefined
    if (!response)
      response = await request(url, {
        credentials: 'omit',
        redirect: 'error',
        referrerPolicy: 'no-referrer',
        signal,
      })
    if (signal.aborted) {
      await response.body?.cancel(signal.reason)
      signal.throwIfAborted()
    }
    let bytes: Uint8Array<ArrayBuffer>
    try {
      bytes = await readPythonWebBytesExact(response, file.bytes, signal)
      signal.throwIfAborted()
      const sha256 = await pythonWebBytesSha256(bytes)
      signal.throwIfAborted()
      if (bytes.byteLength !== file.bytes || sha256 !== file.sha256)
        throw new Error(`Falha de integridade do boot Python: ${file.name}.`)
    } catch (error) {
      // Eviction permits a later explicit attempt; this read never masks corruption by refetching.
      if (cached && !signal.aborted) {
        try {
          await cache.delete(url.href)
        } catch (cleanup) {
          throw new AggregateError([error, cleanup], 'Falha ao retirar cache Python inválido.')
        }
      }
      throw error
    }
    if (!cached) {
      // Browser decoding already happened; do not retain wire Content-Encoding/Length headers.
      await cache.put(
        url.href,
        new Response(bytes, {
          status: 200,
          headers: { 'Content-Type': file.mime, 'Content-Length': String(bytes.length) },
        }),
      )
      signal.throwIfAborted()
    }
    return bytes
  }

  return Object.freeze({
    manifestKey,
    read(name: PythonBootResourceName, signal: AbortSignal): Promise<Uint8Array<ArrayBuffer>> {
      signal.throwIfAborted()
      if (!files.has(name))
        return Promise.reject(new Error('Recurso de boot Python não autorizado.'))
      // Every mutation of this entry, including corrupt eviction, shares the same lock.
      // Resource -> generation is the only nesting order; pruning never waits for a resource.
      return withCacheLock(`sz-python-boot-read-v1:${cacheName}:${name}`, signal, () =>
        readLocked(name, signal),
      )
    },
  })
}
