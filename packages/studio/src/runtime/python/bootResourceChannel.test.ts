import { expect, test } from 'bun:test'
import {
  NATIVE_PYTHON_BOOT_TIMEOUT_MS,
  runNativePythonBootCases,
} from '../../__tests__/nativePythonBootCases'
import { createPythonBootResourceBroker } from './bootResourceBroker'
import { PYTHON_BOOT_RESOURCE_MIME } from './bootResourceContract'
import { PYTHON_BOOT_RESOURCE_NAMES, pythonBootResourceManifestKey } from './bootResourceManifest'
import { createPythonBootResourceReader } from './bootResourceReader'
import { pythonWebBytesSha256 } from './webFiles'

function deferred<Value>() {
  let resolve: (value: Value) => void = () => {
    throw new Error('Deferred unavailable')
  }
  const promise = new Promise<Value>((done) => {
    resolve = done
  })
  return { promise, resolve }
}
function nextMessage(port: MessagePort) {
  const result = deferred<unknown>()
  port.addEventListener('message', (event) => result.resolve(event.data), { once: true })
  port.start()
  return result.promise
}
async function fixture() {
  const bytes = new TextEncoder().encode('public immutable resource')
  const sha256 = await pythonWebBytesSha256(bytes)
  const manifest = {
    version: 1,
    runtimeManifestSha256: 'a'.repeat(64),
    files: [
      { name: 'pyodide.asm.wasm', bytes: bytes.length, sha256, mime: 'application/wasm' },
      { name: 'python_stdlib.zip', bytes: bytes.length, sha256, mime: 'application/zip' },
      { name: 'pyodide-lock.json', bytes: bytes.length, sha256, mime: 'application/json' },
    ],
  }
  return { bytes, manifest }
}

test('native ports transfer exactly three verified public resources and complete after ACKs', async () => {
  const { bytes, manifest } = await fixture(),
    channel = new MessageChannel(),
    owner = new AbortController()
  const seen: string[] = []
  const broker = createPythonBootResourceBroker({
    port: channel.port1,
    manifest,
    signal: owner.signal,
    store: {
      manifestKey: pythonBootResourceManifestKey(manifest),
      async read(name) {
        seen.push(name)
        return new Uint8Array(bytes)
      },
    },
    onError: (error) => {
      throw error
    },
  })
  const complete = deferred<void>()
  channel.port2.addEventListener('message', (event) => {
    if (event.data.type === 'complete') complete.resolve()
  })
  const reader = createPythonBootResourceReader({
    port: channel.port2,
    directory: new URL('https://runtime.test/pinned/'),
  })
  try {
    const responses = await Promise.all(
      PYTHON_BOOT_RESOURCE_NAMES.map((name) => reader.fetch(`https://runtime.test/pinned/${name}`)),
    )
    for (const [index, response] of responses.entries()) {
      expect(response.headers.get('content-length')).toBe(String(bytes.byteLength))
      expect(response.headers.get('content-type')).toBe(
        PYTHON_BOOT_RESOURCE_MIME[PYTHON_BOOT_RESOURCE_NAMES[index]!],
      )
      expect(new Uint8Array(await response.arrayBuffer())).toEqual(bytes)
    }
    await complete.promise
    expect(seen).toEqual([...PYTHON_BOOT_RESOURCE_NAMES])
    expect(broker.closed).toBe(true)
    expect(reader.closed).toBe(true)
  } finally {
    reader.dispose()
    broker.dispose()
  }
})

test(
  'native Node24 reader buffer ownership',
  async () => {
    await runNativePythonBootCases('reader-ownership')
  },
  NATIVE_PYTHON_BOOT_TIMEOUT_MS,
)

for (const invalid of [
  { protocol: 1, type: 'read', id: 1, name: '../private' },
  { protocol: 1, type: 'read', id: 1, name: 'pyodide.asm.wasm', url: 'https://private.test/' },
  { protocol: 1, type: 'read', id: 1, name: 'pyodide.asm.wasm', method: 'POST' },
  { protocol: 1, type: 'read', id: 2, name: 'pyodide.asm.wasm' },
  { protocol: 1, type: 'ack', id: 1 },
])
  test(`closed broker refuses forged request ${JSON.stringify(invalid)}`, async () => {
    const { manifest } = await fixture(),
      channel = new MessageChannel()
    let calls = 0,
      errors = 0
    const broker = createPythonBootResourceBroker({
      port: channel.port1,
      manifest,
      signal: new AbortController().signal,
      store: {
        manifestKey: pythonBootResourceManifestKey(manifest),
        async read() {
          calls++
          return new Uint8Array()
        },
      },
      onError() {
        errors++
      },
    })
    try {
      const failure = nextMessage(channel.port2)
      channel.port2.postMessage(invalid)
      expect(await failure).toMatchObject({ protocol: 1, type: 'failed' })
      expect(calls).toBe(0)
      expect(errors).toBe(1)
      expect(broker.closed).toBe(true)
    } finally {
      broker.dispose()
      channel.port2.close()
    }
  })

test('reader refuses foreign URLs, options, relative aliases and duplicate reads before sending them', async () => {
  const channel = new MessageChannel()
  const reader = createPythonBootResourceReader({
    port: channel.port2,
    directory: new URL('https://runtime.test/pinned/'),
  })
  try {
    for (const url of [
      'https://private.test/pyodide.asm.wasm',
      'https://runtime.test/pinned/pyodide.asm.wasm?q=1',
      'https://runtime.test/pinned/../pinned/pyodide.asm.wasm',
      'pyodide.asm.wasm',
    ])
      await expect(reader.fetch(url)).rejects.toThrow('autorizado')
    for (const init of [
      { credentials: 'include' as const },
      { method: 'POST' },
      { integrity: 'sha256-invented' },
    ])
      await expect(
        reader.fetch('https://runtime.test/pinned/pyodide.asm.wasm', init),
      ).rejects.toThrow('opções')
    const message = nextMessage(channel.port1)
    const pending = reader
      .fetch('https://runtime.test/pinned/pyodide.asm.wasm')
      .catch((error) => String(error))
    expect(await message).toEqual({ protocol: 1, type: 'read', id: 1, name: 'pyodide.asm.wasm' })
    await expect(reader.fetch('https://runtime.test/pinned/pyodide.asm.wasm')).rejects.toThrow(
      'solicitado',
    )
    reader.dispose()
    expect(await pending).toContain('encerrado')
  } finally {
    reader.dispose()
    channel.port1.close()
  }
})

test('owner retirement cancels its read and never transfers bytes that arrive later', async () => {
  const { bytes, manifest } = await fixture(),
    channel = new MessageChannel(),
    owner = new AbortController()
  const entered = deferred<AbortSignal>(),
    deliver = deferred<Uint8Array<ArrayBuffer>>()
  let errors = 0
  const broker = createPythonBootResourceBroker({
    port: channel.port1,
    manifest,
    signal: owner.signal,
    store: {
      manifestKey: pythonBootResourceManifestKey(manifest),
      read(_name, signal) {
        entered.resolve(signal)
        return deliver.promise
      },
    },
    onError() {
      errors++
    },
  })
  const reader = createPythonBootResourceReader({
    port: channel.port2,
    directory: new URL('https://runtime.test/pinned/'),
  })
  try {
    const pending = reader
      .fetch('https://runtime.test/pinned/pyodide.asm.wasm')
      .catch((error) => String(error))
    const readSignal = await entered.promise
    owner.abort(new Error('Owner retired'))
    expect(readSignal.aborted).toBe(true)
    expect(await pending).toContain('encerrado')
    deliver.resolve(new Uint8Array(bytes))
    expect(broker.closed).toBe(true)
    expect(errors).toBe(0)
  } finally {
    broker.dispose()
    reader.dispose()
  }
})

test('reader refuses premature completion and malformed or wrong-name bytes', async () => {
  for (const response of [
    { protocol: 1, type: 'complete' },
    {
      protocol: 1,
      type: 'resource',
      id: 1,
      name: 'python_stdlib.zip',
      bytes: new Uint8Array([1]).buffer,
    },
    { protocol: 1, type: 'resource', id: 1, name: 'pyodide.asm.wasm', bytes: 'not binary' },
  ]) {
    const channel = new MessageChannel()
    const reader = createPythonBootResourceReader({
      port: channel.port2,
      directory: new URL('https://runtime.test/pinned/'),
    })
    try {
      const sent = nextMessage(channel.port1)
      const pending = reader
        .fetch('https://runtime.test/pinned/pyodide.asm.wasm')
        .catch((error) => String(error))
      await sent
      channel.port1.postMessage(response)
      expect(await pending).toContain('inválid')
      expect(reader.closed).toBe(true)
    } finally {
      reader.dispose()
      channel.port1.close()
    }
  }
})
