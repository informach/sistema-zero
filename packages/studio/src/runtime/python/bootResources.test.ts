import { expect, test } from 'bun:test'
import { StudioPythonDistributionSchema } from '@sistemazero/core/studio/python-runtime-distribution'
import { createStudioRuntimeRelease } from '@sistemazero/core/studio/runtime-catalog'
import { pythonEnvironmentFixture } from '../../state/fixtures/pythonEnvironment'
import { createPythonBootResourceBroker } from './bootResourceBroker'
import { preparePythonBootResourceHost, pythonBootResourceURLs } from './bootResourceHost'
import {
  createPythonBootResourceManifest,
  pythonBootResourceManifestKey,
} from './bootResourceManifest'
import { createPythonBootResourceStore, type PythonBootCacheStorage } from './bootResourceStore'
import { pythonWebBytesSha256 } from './webFiles'

async function fixture(label = 'immutable public fixture') {
  const { environment } = await pythonEnvironmentFixture('classic')
  const names = [
    'frame.html',
    'frame.mjs',
    'worker.mjs',
    'pyodide.mjs',
    'pyodide.asm.mjs',
    'pyodide.asm.wasm',
    'python_stdlib.zip',
    'pyodide-lock.json',
    'LICENSE-pyodide.txt',
    'LICENSE-python.txt',
    'SOURCES.txt',
  ]
  const bytes = new TextEncoder().encode(label)
  const sha256 = await pythonWebBytesSha256(bytes)
  const distribution = StudioPythonDistributionSchema.parse({
    version: 1,
    pythonVersion: '3.14.2',
    pyodideVersion: '314.0.7',
    files: names.map((path) => ({ path, bytes: bytes.length, sha256 })),
  })
  const original = environment.catalog.releases[0]
  if (!original) throw new Error('Missing inert Python release')
  const release = await createStudioRuntimeRelease({
    ...original.manifest,
    artifacts: distribution.files.map(({ path, sha256 }) => ({ path, sha256 })),
  })
  const manifest = await createPythonBootResourceManifest(
    { release, distribution },
    release.manifestSha256,
  )
  return { release, distribution, manifest, bytes }
}

test('broker rejects a real verified store from another release or different same-pin descriptors', async () => {
  const a = await fixture('immutable public fixture A')
  const b = await fixture('immutable public fixture B')
  expect(a.bytes.length).toBe(b.bytes.length)
  expect(a.manifest.runtimeManifestSha256).not.toBe(b.manifest.runtimeManifestSha256)
  for (const manifest of [
    b.manifest,
    { ...b.manifest, runtimeManifestSha256: a.manifest.runtimeManifestSha256 },
  ]) {
    const { storage } = cacheFixture()
    let fetched = false
    const store = createPythonBootResourceStore({
      directory: new URL('https://runtime.test/pinned/'),
      manifest,
      cacheStorage: storage,
      withCacheLock: unlocked,
      fetch: async () => {
        fetched = true
        return new Response(b.bytes)
      },
    })
    const channel = new MessageChannel()
    let broker: ReturnType<typeof createPythonBootResourceBroker> | undefined
    try {
      expect(() => {
        broker = createPythonBootResourceBroker({
          port: channel.port1,
          manifest: a.manifest,
          signal: new AbortController().signal,
          store,
          onError: (error) => {
            throw error
          },
        })
      }).toThrow('manifesto')
      expect(fetched).toBe(false)
    } finally {
      broker?.dispose()
      channel.port1.close()
      channel.port2.close()
    }
  }
})

test('store binding is immutable and equivalent descriptor order is accepted', async () => {
  const { manifest } = await fixture()
  const { storage } = cacheFixture()
  const store = createPythonBootResourceStore({
    directory: new URL('https://runtime.test/pinned/'),
    manifest,
    cacheStorage: storage,
    withCacheLock: unlocked,
    fetch: async () => {
      throw new Error('No reads expected')
    },
  })
  const reversed = { ...manifest, files: [...manifest.files].reverse() }
  expect(store.manifestKey).toBe(pythonBootResourceManifestKey(reversed))
  expect(Object.isFrozen(store)).toBe(true)
  expect(Reflect.set(store, 'manifestKey', 'another configuration')).toBe(false)
  expect(Reflect.set(store, 'read', async () => new Uint8Array())).toBe(false)
  const channel = new MessageChannel()
  const broker = createPythonBootResourceBroker({
    port: channel.port1,
    manifest: reversed,
    signal: new AbortController().signal,
    store,
    onError: (error) => {
      throw error
    },
  })
  try {
    expect(broker.closed).toBe(false)
  } finally {
    broker.dispose()
    channel.port2.close()
  }
})

function cacheFixture() {
  const caches = new Map<string, Map<string, Response>>()
  const storage: PythonBootCacheStorage = {
    async keys() {
      return [...caches.keys()]
    },
    async delete(name) {
      return caches.delete(name)
    },
    async open(name) {
      let entries = caches.get(name)
      if (!entries) {
        entries = new Map()
        caches.set(name, entries)
      }
      const captured = entries
      return {
        async match(url) {
          return captured.get(url)?.clone()
        },
        async delete(url) {
          return captured.delete(url)
        },
        async put(url, response) {
          captured.set(
            url,
            new Response(await response.arrayBuffer(), { headers: response.headers }),
          )
        },
      }
    },
  }
  return { storage, caches }
}

const unlocked = async <Value>(
  _name: string,
  _signal: AbortSignal,
  operation: () => Promise<Value>,
) => operation()

function gate<Value>() {
  let resolve!: (value: Value) => void
  const promise = new Promise<Value>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

test('host withdrawal settles before a non-cooperative metadata producer or cancellation ACK', async () => {
  for (const phase of ['producer', 'late-cancel', 'body-cancel']) {
    const owner = new AbortController(),
      entered = gate<void>(),
      response = gate<Response>(),
      ack = gate<void>()
    const { storage, caches } = cacheFixture()
    const hash = 'a'.repeat(64)
    const reason = new Error(`Owner retired during ${phase}`)
    let cancelled = 0,
      settled = false,
      result: unknown
    const body = new ReadableStream<Uint8Array>({
      cancel() {
        cancelled++
        return ack.promise
      },
    })
    const pending = preparePythonBootResourceHost({
      frameURL: new URL(`https://runtime.test/v1/runtimes/${hash}/frame.html`),
      runtimeManifestSha256: hash,
      signal: owner.signal,
      cacheStorage: storage,
      request: async () => {
        entered.resolve()
        if (phase === 'late-cancel') owner.abort(reason)
        if (phase === 'producer') return response.promise
        return new Response(body)
      },
    }).then(
      (value) => {
        settled = true
        result = value
      },
      (error) => {
        settled = true
        result = error
      },
    )
    await entered.promise
    if (phase === 'body-cancel') await new Promise<void>((done) => setTimeout(done, 0))
    owner.abort(reason)
    // An event-loop turn observes settlement before either controlled producer/ACK is released.
    await new Promise<void>((done) => setTimeout(done, 0))
    const beforeRelease = settled,
      observedReason = result
    if (phase === 'producer') response.resolve(new Response(body))
    ack.resolve()
    await pending
    await new Promise<void>((done) => setTimeout(done, 0))
    expect(beforeRelease).toBe(true)
    expect(observedReason).toBe(reason)
    expect(cancelled).toBe(1)
    expect(caches.size).toBe(0)
  }
})

test('host metadata URLs are derived only from pinned online or exported runtime frames', () => {
  const hash = 'a'.repeat(64)
  for (const file of ['frame.html', 'analysis.html']) {
    const online = pythonBootResourceURLs(
      new URL(`https://runtime.test/v1/runtimes/${hash}/${file}`),
      hash,
    )
    expect(online.metadataURL.href).toBe(`https://runtime.test/v1/runtime-deployments/${hash}`)
    expect(online.directory.href).toBe(`https://runtime.test/v1/runtimes/${hash}/`)
    for (const prefix of ['https://static.test/games/my%20game/', 'http://127.0.0.1:8000/']) {
      const exported = pythonBootResourceURLs(new URL(`${prefix}runtime/${hash}/${file}`), hash)
      expect(exported.metadataURL.href).toBe(`${prefix}runtime-deployment.json`)
      expect(exported.directory.href).toBe(`${prefix}runtime/${hash}/`)
    }
  }
})

test('host refuses unsafe or mismatched frame addresses before requesting metadata', async () => {
  const hash = 'a'.repeat(64)
  const { storage } = cacheFixture()
  let requests = 0
  for (const address of [
    `https://runtime.test/v1/runtimes/${'b'.repeat(64)}/frame.html`,
    `https://runtime.test/v1/runtimes/${hash}/worker.mjs`,
    `https://runtime.test/project/${hash}/frame.html`,
    `https://u:p@runtime.test/v1/runtimes/${hash}/frame.html`,
    `https://runtime.test/v1/runtimes/${hash}/frame.html?q=1`,
    `https://runtime.test/v1/runtimes/${hash}/frame.html#other`,
    `http://runtime.test/v1/runtimes/${hash}/frame.html`,
    `file:///runtime/${hash}/frame.html`,
  ]) {
    await expect(
      preparePythonBootResourceHost({
        frameURL: new URL(address),
        runtimeManifestSha256: hash,
        signal: new AbortController().signal,
        cacheStorage: storage,
        request: async () => {
          requests++
          throw new Error('Unexpected request')
        },
      }),
    ).rejects.toThrow('Python')
  }
  expect(requests).toBe(0)
  expect(() =>
    pythonBootResourceURLs(new URL(`https://runtime.test/runtime/${hash}/frame.html`), 'bad'),
  ).toThrow('Python')
})

test('host verifies deployment before creating a bound store and never requests project or executable bytes', async () => {
  const { release, distribution, manifest } = await fixture()
  const { storage, caches } = cacheFixture()
  const hash = release.manifestSha256
  const calls: { url: string; init: RequestInit }[] = []
  const host = await preparePythonBootResourceHost({
    frameURL: new URL(`https://runtime.test/v1/runtimes/${hash}/frame.html`),
    runtimeManifestSha256: hash,
    signal: new AbortController().signal,
    cacheStorage: storage,
    request: async (url, init) => {
      calls.push({ url: url.href, init })
      return Response.json({ release, distribution })
    },
  })
  expect(host.store.manifestKey).toBe(pythonBootResourceManifestKey(manifest))
  expect(calls).toHaveLength(1)
  expect(calls[0]?.url).toBe(`https://runtime.test/v1/runtime-deployments/${hash}`)
  expect(calls[0]?.init).toMatchObject({
    credentials: 'omit',
    redirect: 'error',
    referrerPolicy: 'no-referrer',
  })
  expect(caches.size).toBe(0)
})

test('host rejects changed deployments, oversized metadata and cancellation without opening the resource cache', async () => {
  const { release, distribution } = await fixture()
  const hash = release.manifestSha256
  const modified = structuredClone(distribution)
  modified.files[0]!.sha256 = '1'.repeat(64)
  const { storage, caches } = cacheFixture()
  for (const [pin, body] of [
    ['b'.repeat(64), JSON.stringify({ release, distribution })],
    [hash, JSON.stringify({ release, distribution: modified })],
    [hash, ' '.repeat(2 * 1024 * 1024 + 1)],
    [hash, '{broken'],
  ]) {
    if (!pin || body === undefined) throw new Error('Invalid test fixture')
    await expect(
      preparePythonBootResourceHost({
        frameURL: new URL(`https://runtime.test/v1/runtimes/${pin}/analysis.html`),
        runtimeManifestSha256: pin,
        signal: new AbortController().signal,
        cacheStorage: storage,
        request: async () => new Response(body),
      }),
    ).rejects.toThrow()
  }
  const owner = new AbortController()
  let cancelled = false
  await expect(
    preparePythonBootResourceHost({
      frameURL: new URL(`https://runtime.test/v1/runtimes/${hash}/frame.html`),
      runtimeManifestSha256: hash,
      signal: owner.signal,
      cacheStorage: storage,
      request: async () => {
        owner.abort(new Error('Retired owner'))
        return new Response(
          new ReadableStream({
            cancel() {
              cancelled = true
            },
          }),
        )
      },
    }),
  ).rejects.toThrow('Retired owner')
  expect(cancelled).toBe(true)
  expect(caches.size).toBe(0)
})

test('boot manifest derives only the three public data resources from a verified release', async () => {
  const { release, distribution, manifest } = await fixture()
  expect(manifest.files.map((file) => file.name)).toEqual([
    'pyodide.asm.wasm',
    'python_stdlib.zip',
    'pyodide-lock.json',
  ])
  expect(manifest.files.map((file) => file.mime)).toEqual([
    'application/wasm',
    'application/zip',
    'application/json',
  ])
  await expect(
    createPythonBootResourceManifest({ release, distribution }, '0'.repeat(64)),
  ).rejects.toThrow('release')
  const modified = structuredClone(distribution)
  modified.files[0]!.sha256 = '1'.repeat(64)
  await expect(
    createPythonBootResourceManifest({ release, distribution: modified }, release.manifestSha256),
  ).rejects.toThrow()
})

test('boot store verifies cold and cached bytes, never refetches a corrupt cache', async () => {
  const { manifest, bytes } = await fixture()
  const { storage, caches } = cacheFixture()
  const seen: { url: string; init: RequestInit }[] = []
  const store = createPythonBootResourceStore({
    directory: new URL('https://runtime.test/pinned/'),
    manifest,
    cacheStorage: storage,
    withCacheLock: unlocked,
    fetch: async (url, init) => {
      seen.push({ url: url.href, init })
      return new Response(bytes)
    },
  })
  const signal = new AbortController().signal
  const first = await store.read('pyodide.asm.wasm', signal)
  expect(first).toEqual(bytes)
  first[0] = 0
  expect(await store.read('pyodide.asm.wasm', signal)).toEqual(bytes)
  expect(seen).toHaveLength(1)
  expect(seen[0]?.init).toMatchObject({
    credentials: 'omit',
    redirect: 'error',
    referrerPolicy: 'no-referrer',
    signal,
  })
  const entries = [...caches.values()][0]
  if (!entries) throw new Error('Cache not created')
  entries.set(seen[0]!.url, new Response(new Uint8Array(bytes.length)))
  await expect(store.read('pyodide.asm.wasm', signal)).rejects.toThrow('integridade')
  expect(seen).toHaveLength(1)
  expect(await store.read('pyodide.asm.wasm', signal)).toEqual(bytes)
  expect(seen).toHaveLength(2)
})

test('streamed byte limits refuse oversized data and cancel without caching it', async () => {
  const { manifest, bytes } = await fixture()
  const { storage, caches } = cacheFixture()
  let cancelled = false
  const store = createPythonBootResourceStore({
    directory: new URL('https://runtime.test/pinned/'),
    manifest,
    cacheStorage: storage,
    withCacheLock: unlocked,
    fetch: async () =>
      new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(new Uint8Array(bytes.length + 1))
          },
          cancel() {
            cancelled = true
          },
        }),
        { headers: { 'content-length': '1' } },
      ),
  })
  await expect(store.read('python_stdlib.zip', new AbortController().signal)).rejects.toThrow(
    'limite',
  )
  expect(cancelled).toBe(true)
  expect([...caches.values()].every((entries) => entries.size === 0)).toBe(true)
})

test('a retired read cancels a late network response instead of publishing it', async () => {
  const { manifest, bytes } = await fixture()
  const { storage, caches } = cacheFixture()
  let deliver: (response: Response) => void = () => {
    throw new Error('Fetch not started')
  }
  let entered: () => void = () => {
    throw new Error('Start callback missing')
  }
  const started = new Promise<void>((resolve) => {
    entered = resolve
  })
  const lateResponse = new Promise<Response>((resolve) => {
    deliver = resolve
  })
  const store = createPythonBootResourceStore({
    directory: new URL('https://runtime.test/pinned/'),
    manifest,
    cacheStorage: storage,
    withCacheLock: unlocked,
    fetch: () => {
      entered()
      return lateResponse
    },
  })
  const owner = new AbortController()
  const read = store.read('pyodide.asm.wasm', owner.signal)
  await started
  owner.abort(new Error('Profile changed'))
  let cancelled = false
  deliver(
    new Response(
      new ReadableStream({
        start(controller) {
          controller.enqueue(bytes)
        },
        cancel() {
          cancelled = true
        },
      }),
    ),
  )
  await expect(read).rejects.toThrow('Profile changed')
  expect(cancelled).toBe(true)
  expect([...caches.values()].every((entries) => entries.size === 0)).toBe(true)
})

test('cache quota errors remain visible and only owned cache generations are pruned', async () => {
  const { manifest, bytes } = await fixture()
  const { storage, caches } = cacheFixture()
  caches.set('another-feature', new Map())
  for (let index = 0; index < 3; index++) caches.set(`sz-python-boot-v1:old-${index}`, new Map())
  const store = createPythonBootResourceStore({
    directory: new URL('https://runtime.test/pinned/'),
    manifest,
    cacheStorage: storage,
    withCacheLock: unlocked,
    fetch: async () => new Response(bytes),
  })
  await store.read('pyodide.asm.wasm', new AbortController().signal)
  expect(caches.has('another-feature')).toBe(true)
  expect([...caches.keys()].filter((name) => name.startsWith('sz-python-boot-v1:'))).toHaveLength(3)
  const quota = new DOMException('Owned cache quota', 'QuotaExceededError')
  const denied = createPythonBootResourceStore({
    directory: new URL('https://runtime.test/pinned/'),
    manifest,
    cacheStorage: {
      ...storage,
      async open() {
        throw quota
      },
    },
    withCacheLock: unlocked,
    fetch: async () => {
      throw new Error('Should not fetch without cache')
    },
  })
  await expect(denied.read('pyodide.asm.wasm', new AbortController().signal)).rejects.toThrow(
    'Owned cache quota',
  )
})

test('store captures trusted configuration and refuses unsafe runtime directories', async () => {
  const { manifest, bytes } = await fixture()
  const { storage } = cacheFixture()
  for (const url of [
    'http://runtime.test/',
    'https://u:p@runtime.test/',
    'https://runtime.test/?q=1',
    'https://runtime.test/#x',
    'https://runtime.test/no-trailing-slash',
  ]) {
    expect(() =>
      createPythonBootResourceStore({
        directory: new URL(url),
        manifest,
        cacheStorage: storage,
        withCacheLock: unlocked,
        fetch: async () => new Response(bytes),
      }),
    ).toThrow()
  }
  const mutable = structuredClone(manifest)
  const directory = new URL('https://runtime.test/pinned/')
  const seen: string[] = []
  const store = createPythonBootResourceStore({
    directory,
    manifest: mutable,
    cacheStorage: storage,
    withCacheLock: unlocked,
    fetch: async (url) => {
      seen.push(url.href)
      return new Response(bytes)
    },
  })
  directory.hostname = 'attacker.test'
  mutable.files[0]!.sha256 = '0'.repeat(64)
  expect(await store.read('pyodide.asm.wasm', new AbortController().signal)).toEqual(bytes)
  expect(seen).toEqual(['https://runtime.test/pinned/pyodide.asm.wasm'])
  await expect(
    Reflect.apply(store.read, store, ['../private', new AbortController().signal]),
  ).rejects.toThrow('não autorizado')
  expect(seen).toHaveLength(1)
})

test('boot resources reject oversized metadata before any download', async () => {
  const { release, distribution } = await fixture()
  const file = distribution.files.find((file) => file.path === 'pyodide.asm.wasm')
  if (!file) throw new Error('Missing WASM fixture')
  file.bytes = 33 * 1024 * 1024
  await expect(
    createPythonBootResourceManifest({ release, distribution }, release.manifestSha256),
  ).rejects.toThrow()
})

test('decoded bodies use logical byte limits and never retain wire encoding in cache', async () => {
  const { manifest, bytes } = await fixture()
  const { storage, caches } = cacheFixture()
  const store = createPythonBootResourceStore({
    directory: new URL('https://runtime.test/pinned/'),
    manifest,
    cacheStorage: storage,
    withCacheLock: unlocked,
    fetch: async () =>
      new Response(bytes, {
        headers: { 'Content-Encoding': 'gzip', 'Content-Length': String(bytes.length + 20) },
      }),
  })
  expect(await store.read('pyodide.asm.wasm', new AbortController().signal)).toEqual(bytes)
  const saved = [...caches.values()].flatMap((entries) => [...entries.values()])[0]
  if (!saved) throw new Error('Cache not populated')
  expect(saved.headers.has('Content-Encoding')).toBe(false)
  expect(saved.headers.get('Content-Length')).toBe(String(bytes.length))
})
