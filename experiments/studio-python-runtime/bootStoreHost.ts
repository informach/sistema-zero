import { createPythonBootResourceBroker } from '../../packages/studio/src/runtime/python/bootResourceBroker'
import { PYTHON_BOOT_RESOURCE_NAMES } from '../../packages/studio/src/runtime/python/bootResourceContract'
import {
  capturePythonBootResourceManifest,
  PYTHON_BOOT_CACHE_PREFIX,
} from '../../packages/studio/src/runtime/python/bootResourceManifest'
import { createPythonBootResourceReader } from '../../packages/studio/src/runtime/python/bootResourceReader'
import {
  createPythonBootResourceStore,
  type PythonBootCacheStorage,
} from '../../packages/studio/src/runtime/python/bootResourceStore'
import { pythonWebBytesSha256 } from '../../packages/studio/src/runtime/python/webFiles'

export type BootStoreScenario = 'cache' | 'concurrent' | 'cancel' | 'repair'
function gate() {
  let release: () => void = () => {
    throw new Error('Gate unavailable')
  }
  const promise = new Promise<void>((resolve) => {
    release = resolve
  })
  return { promise, release }
}
async function waitForPendingResource() {
  const deadline = performance.now() + 3000
  while (performance.now() < deadline) {
    const state = await navigator.locks.query()
    if (state.pending?.some((lock) => lock.name?.startsWith('sz-python-boot-read-v1:'))) return
    await new Promise(requestAnimationFrame)
  }
  throw new Error('Waiting owner never queued behind the native resource lock')
}

async function readOwnedConfiguration() {
  const configuration: unknown = await (await fetch('/configuration')).json()
  if (
    !configuration ||
    typeof configuration !== 'object' ||
    !('directory' in configuration) ||
    typeof configuration.directory !== 'string' ||
    !('manifest' in configuration)
  )
    throw new Error('Invalid owned proof configuration')
  const manifest = capturePythonBootResourceManifest(configuration.manifest)
  const expected = manifest.files.find((file) => file.name === 'pyodide.asm.wasm')
  if (!expected) throw new Error('Missing owned WASM descriptor')
  const directory = new URL(configuration.directory)
  if (directory.origin === location.origin)
    throw new Error('Proof requires distinct parent/resource origins')
  return { manifest, expected, directory }
}

export async function runBootStoreProof(scenario: BootStoreScenario) {
  const { manifest, expected, directory } = await readOwnedConfiguration()
  const url = new URL('pyodide.asm.wasm', directory).href
  for (const key of await caches.keys())
    if (key.startsWith(PYTHON_BOOT_CACHE_PREFIX)) await caches.delete(key)
  let fetches = 0
  const nativeFetch = globalThis.fetch
  const request = async (url: URL, init: RequestInit) => {
    if (
      init.credentials !== 'omit' ||
      init.redirect !== 'error' ||
      init.referrerPolicy !== 'no-referrer'
    )
      throw new Error('Unsafe resource request')
    fetches++
    const response = await nativeFetch(url, init)
    if (
      url.pathname.endsWith('/pyodide-lock.json') &&
      (Number(response.headers.get('Content-Length')) <= expected.bytes ||
        response.headers.has('Content-Encoding'))
    )
      throw new Error('Proof requires a longer gzip wire body with CORS-hidden encoding')
    return response
  }
  const makeStore = (storage: PythonBootCacheStorage = caches, read = request) =>
    createPythonBootResourceStore({
      directory,
      manifest,
      cacheStorage: storage,
      fetch: read,
    })
  const a = new AbortController(),
    b = new AbortController()
  const store = makeStore()
  const hash = async (bytes: Uint8Array<ArrayBuffer>) => {
    if (bytes.length !== expected.bytes || (await pythonWebBytesSha256(bytes)) !== expected.sha256)
      throw new Error('Wrong public bytes')
  }
  let cancelled = false,
    corruptedReadRefused = false
  if (scenario === 'cache') {
    await hash(await store.read('pyodide.asm.wasm', a.signal))
    await hash(await store.read('pyodide.asm.wasm', a.signal))
    // Server sends a real gzip body whose wire length exceeds the decoded body size.
    await hash(await store.read('pyodide-lock.json', a.signal))
    if (fetches !== 2) throw new Error('Unexpected cold/cache resource fetch count')
  } else if (scenario === 'concurrent') {
    const results = await Promise.all([
      store.read('pyodide.asm.wasm', a.signal),
      makeStore().read('pyodide.asm.wasm', b.signal),
    ])
    for (const bytes of results) await hash(bytes)
    if (fetches !== 1)
      throw new Error('Concurrent owners downloaded the same immutable bytes twice')
  } else if (scenario === 'cancel') {
    const entered = gate(),
      deliver = gate()
    const holder = makeStore(caches, async (url, init) => {
      const response = await request(url, init)
      entered.release()
      await deliver.promise
      return response
    })
    const first = holder.read('pyodide.asm.wasm', a.signal)
    await entered.promise
    const second = makeStore()
      .read('pyodide.asm.wasm', b.signal)
      .then(
        () => {
          throw new Error('Cancelled waiter produced bytes')
        },
        (error) => {
          if (String(error).includes('Waiting owner retired')) cancelled = true
          else throw error
        },
      )
    try {
      await waitForPendingResource()
      b.abort(new Error('Waiting owner retired'))
      await second
    } finally {
      deliver.release()
    }
    await hash(await first)
    if (!cancelled || a.signal.aborted || fetches !== 1)
      throw new Error('Waiting owner affected the holder')
    await hash(await store.read('pyodide.asm.wasm', a.signal))
    if (fetches !== 1) throw new Error('Holder did not publish reusable bytes')
  } else {
    await hash(await store.read('pyodide.asm.wasm', a.signal))
    const cacheName = (await caches.keys()).find((key) => key.startsWith(PYTHON_BOOT_CACHE_PREFIX))
    if (!cacheName) throw new Error('No native cache')
    const cache = await caches.open(cacheName)
    await cache.put(url, new Response(new Uint8Array(expected.bytes)))
    const captured = gate(),
      deliver = gate()
    let intercepted = false
    const delayed: PythonBootCacheStorage = {
      keys: () => caches.keys(),
      delete: (name) => caches.delete(name),
      async open(name) {
        const real = await caches.open(name)
        return {
          delete: (key) => real.delete(key),
          put: (key, value) => real.put(key, value),
          async match(key) {
            const response = await real.match(key)
            if (intercepted || !response) return response
            intercepted = true
            const bytes = new Uint8Array(await response.arrayBuffer())
            captured.release()
            return new Response(
              new ReadableStream({
                async start(controller) {
                  await deliver.promise
                  controller.enqueue(bytes)
                  controller.close()
                },
              }),
            )
          },
        }
      },
    }
    const old = makeStore(delayed)
      .read('pyodide.asm.wasm', a.signal)
      .then(
        () => {
          throw new Error('Corruption accepted')
        },
        (error) => {
          if (String(error).includes('integridade')) corruptedReadRefused = true
          else throw error
        },
      )
    await captured.promise
    const repaired = makeStore().read('pyodide.asm.wasm', b.signal)
    try {
      await waitForPendingResource()
    } finally {
      deliver.release()
    }
    await old
    await hash(await repaired)
    const current = await cache.match(url)
    if (!current) throw new Error('Old reader removed the repaired entry')
    await hash(new Uint8Array(await current.arrayBuffer()))
    if (!corruptedReadRefused || fetches !== 2) throw new Error('Wrong repair lifecycle')
  }
  const state = await navigator.locks.query()
  if (state.held?.length || state.pending?.length) throw new Error('Resource lock leaked')
  if (globalThis.fetch !== nativeFetch) throw new Error('Native fetch was modified')
  return {
    scenario,
    fetches,
    cancelled,
    corruptedReadRefused,
    nativeCache: true,
    nativeLocks: true,
    nativeFetchUnchanged: true,
    locks: state,
  }
}

Object.defineProperty(window, '__pythonBootStoreProof', { value: runBootStoreProof })

export type BootChannelScenario = 'complete' | 'forged' | 'abort' | 'timeout'
export async function runBootChannelProof(scenario: BootChannelScenario) {
  const { manifest, expected, directory } = await readOwnedConfiguration()
  const channel = new MessageChannel(),
    owner = new AbortController(),
    entered = gate(),
    completed = gate()
  const store = createPythonBootResourceStore({
    directory,
    manifest,
    cacheStorage: caches,
    fetch: (url, init) => fetch(url, init),
  })
  const errors: string[] = []
  let reads = 0,
    readSignal: AbortSignal | undefined
  // Observer precedes reader's closing handler. No product test hooks or global API replacement.
  channel.port2.addEventListener('message', (event) => {
    if (event.data.type === 'complete') completed.release()
  })
  const broker = createPythonBootResourceBroker({
    port: channel.port1,
    manifest,
    signal: owner.signal,
    onError: (error) => errors.push(error.message),
    store: {
      manifestKey: store.manifestKey,
      read(name, signal) {
        reads++
        readSignal = signal
        entered.release()
        if (scenario === 'complete' || scenario === 'forged') return store.read(name, signal)
        Object.defineProperty(window, '__pythonBootChannelWaiting', { value: true })
        return new Promise((_, reject) =>
          signal.addEventListener('abort', () => reject(signal.reason), { once: true }),
        )
      },
    },
  })
  let reader: ReturnType<typeof createPythonBootResourceReader> | undefined
  let rejection: string | undefined
  try {
    if (scenario === 'forged') {
      const failure = new Promise<unknown>((resolve) =>
        channel.port2.addEventListener('message', (event) => resolve(event.data), { once: true }),
      )
      channel.port2.start()
      channel.port2.postMessage({
        protocol: 1,
        type: 'read',
        id: 1,
        name: 'pyodide.asm.wasm',
        url: 'https://private.test/',
      })
      const result = await failure
      if (
        !result ||
        typeof result !== 'object' ||
        !('type' in result) ||
        result.type !== 'failed' ||
        reads !== 0 ||
        errors.length !== 1
      )
        throw new Error('Forged channel request was not rejected')
    } else {
      const currentReader = createPythonBootResourceReader({ port: channel.port2, directory })
      reader = currentReader
      if (scenario === 'complete') {
        for (const response of await Promise.all(
          PYTHON_BOOT_RESOURCE_NAMES.map((name) => currentReader.fetch(new URL(name, directory))),
        )) {
          const bytes = new Uint8Array(await response.arrayBuffer())
          if (
            bytes.length !== expected.bytes ||
            (await pythonWebBytesSha256(bytes)) !== expected.sha256
          )
            throw new Error('Wrong channel bytes')
        }
        await completed.promise
        if (reads !== 3 || errors.length) throw new Error('Incomplete data channel')
      } else {
        const pending = reader.fetch(new URL('pyodide.asm.wasm', directory)).then(
          () => {
            throw new Error('Retired channel returned bytes')
          },
          (error) => {
            rejection = String(error)
          },
        )
        await entered.promise
        if (scenario === 'abort') owner.abort(new Error('Owner retired'))
        await pending
      }
    }
    if (!broker.closed || (reader && !reader.closed))
      throw new Error('Data capability remained open')
    if (
      scenario === 'timeout' &&
      (!readSignal?.aborted || errors.length !== 1 || !errors[0]?.includes('demorou'))
    )
      throw new Error('Trusted deadline did not cancel owned IO')
    return {
      scenario,
      reads,
      errors,
      rejection,
      brokerClosed: broker.closed,
      readerClosed: reader?.closed,
      readAborted: readSignal?.aborted,
      ownerAborted: owner.signal.aborted,
    }
  } finally {
    reader?.dispose()
    broker.dispose()
    channel.port2.close()
  }
}
Object.defineProperty(window, '__pythonBootChannelProof', { value: runBootChannelProof })
