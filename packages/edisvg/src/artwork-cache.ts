const MAX_BYTES = 10_000_000
const CACHE_BYTES = 20_000_000
const CACHE_ENTRIES = 24

interface Entry {
  controller: AbortController
  promise: Promise<string>
  users: number
  settled: boolean
  bytes: number
}
const cache = new Map<string, Entry>()

async function readBounded(response: Response): Promise<{ text: string; bytes: number }> {
  if (!response.ok) throw new Error('Não foi possível carregar a animação.')
  const declared = response.headers.get('content-length')
  if (declared && Number(declared) > MAX_BYTES) {
    await response.body?.cancel()
    throw new Error('A animação excede 10 MB.')
  }
  const reader = response.body?.getReader()
  if (!reader) throw new Error('A animação não tem conteúdo.')
  let bytes = 0
  const decoder = new TextDecoder('utf-8', { fatal: true })
  const parts: string[] = []
  try {
    for (;;) {
      const result = await reader.read()
      if (result.done) break
      bytes += result.value.byteLength
      if (bytes > MAX_BYTES) throw new Error('A animação excede 10 MB.')
      parts.push(decoder.decode(result.value, { stream: true }))
    }
    parts.push(decoder.decode())
    return { text: parts.join(''), bytes }
  } catch (error) {
    await reader.cancel().catch(() => {})
    throw error
  } finally {
    reader.releaseLock()
  }
}

function trim() {
  let bytes = [...cache.values()].reduce((sum, entry) => sum + entry.bytes, 0)
  for (const [url, entry] of cache) {
    if (cache.size <= CACHE_ENTRIES && bytes <= CACHE_BYTES) break
    if (entry.users || !entry.settled) continue
    cache.delete(url)
    bytes -= entry.bytes
  }
}

/** Shared downloads, independent player sessions. Last consumer leaving cancels an in-flight fetch. */
export function acquireArtwork(url: string): { content: Promise<string>; release: () => void } {
  let entry = cache.get(url)
  if (!entry) {
    const controller = new AbortController()
    const created: Entry = {
      controller,
      users: 0,
      settled: false,
      bytes: 0,
      promise: Promise.resolve(''),
    }
    created.promise = fetch(url, {
      signal: controller.signal,
      credentials: 'same-origin',
      redirect: 'error',
    })
      .then(readBounded)
      .then((result) => {
        created.bytes = result.bytes
        created.settled = true
        trim()
        return result.text
      })
      .catch((error) => {
        if (cache.get(url) === created) cache.delete(url)
        throw error
      })
    entry = created
    cache.set(url, entry)
  } else {
    cache.delete(url)
    cache.set(url, entry)
  }
  entry.users++
  const acquired = entry
  let released = false
  return {
    content: acquired.promise,
    release() {
      if (released) return
      released = true
      acquired.users--
      if (!acquired.users && !acquired.settled) {
        if (cache.get(url) === acquired) cache.delete(url)
        acquired.controller.abort()
      }
      trim()
    },
  }
}
