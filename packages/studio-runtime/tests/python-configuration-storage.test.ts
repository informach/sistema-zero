import { expect, spyOn, test } from 'bun:test'
import { canonicalJson } from '@sistemazero/core/creations'
import { sha256 } from '../src/artifacts'
import { PYTHON_CONFIGURATION_MAX_BYTES } from '../src/python-configuration'
import {
  createPythonRuntimeConfigurationLoader,
  describePythonRuntimeConfiguration,
  readPythonRuntimeConfiguration,
  storePythonRuntimeConfiguration,
} from '../src/python-configuration-storage'
import { pythonDistributionFixture } from './python-distribution-fixture'

const context = (signal = new AbortController().signal) => ({ signal, assertCurrent() {} })
function gate() {
  let resolve!: () => void
  const promise = new Promise<void>((done) => {
    resolve = done
  })
  return { promise, resolve }
}
async function fixture() {
  const storage = await pythonDistributionFixture()
  const configuration = {
    version: 1,
    parentOrigins: ['https://app.example'],
    deployments: [{ status: 'active', deployment: storage.deployment }],
  }
  const descriptor = await storePythonRuntimeConfiguration({
    bucket: storage.bucket,
    configuration,
  })
  const { profileId, releaseId, manifestSha256 } = storage.deployment.release
  const selection = { profileId, releaseId, manifestSha256 }
  return { ...storage, configuration, descriptor, selection }
}

test('catalog storage is canonical, native checksum/create-only and conflicting bytes never overwrite', async () => {
  const f = await fixture()
  expect(f.descriptor).toEqual(await describePythonRuntimeConfiguration(f.configuration))
  expect(f.descriptor.key).toBe(`runtime-configs/${f.descriptor.sha256}.json`)
  expect(f.descriptor.sha256).toHaveLength(64)
  expect(f.objects.get(f.descriptor.key)!.bytes).toEqual(
    new TextEncoder().encode(canonicalJson(f.configuration)),
  )
  const puts = f.counts().puts
  expect(
    await storePythonRuntimeConfiguration({ bucket: f.bucket, configuration: f.configuration }),
  ).toEqual(f.descriptor)
  expect(f.counts().puts).toBe(puts)
  const existing = f.objects.get(f.descriptor.key)!
  existing.bytes[0] ^= 1
  await expect(
    storePythonRuntimeConfiguration({ bucket: f.bucket, configuration: f.configuration }),
  ).rejects.toThrow()
  expect(f.counts().puts).toBe(puts)
  expect(existing.bytes[0]).not.toBe('{'.charCodeAt(0))
})

test('concurrent loads share one bounded read and memoize only the exact bucket and digest', async () => {
  const f = await fixture()
  const entered = gate(),
    release = gate()
  let reads = 0
  const bucket = {
    async get(key: string) {
      reads++
      entered.resolve()
      await release.promise
      return f.bucket.get(key)
    },
  }
  const load = createPythonRuntimeConfigurationLoader()
  const first = load(bucket, f.descriptor.sha256, context())
  const second = load(bucket, f.descriptor.sha256, context())
  await entered.promise
  expect(reads).toBe(1)
  release.resolve()
  const registry = await first
  expect(await second).toBe(registry)
  expect(registry.resolve(f.selection)?.release).toEqual(f.deployment.release)
  expect(await load(bucket, f.descriptor.sha256, context())).toBe(registry)
  expect(reads).toBe(1)
  let otherReads = 0
  const other = {
    async get() {
      otherReads++
      return null
    },
  }
  await expect(load(other, f.descriptor.sha256, context())).rejects.toThrow('indisponível')
  expect(otherReads).toBe(1)
  const revoked = await storePythonRuntimeConfiguration({
    bucket: f.bucket,
    configuration: {
      ...f.configuration,
      deployments: [{ status: 'revoked', deployment: f.deployment }],
    },
  })
  expect((await load(bucket, revoked.sha256, context())).resolve(f.selection)).toBeUndefined()
  expect(reads).toBe(2)
  expect((await load(bucket, f.descriptor.sha256, context())).resolve(f.selection)).toBeDefined()
})

test('transient storage failures and missing catalogs do not poison the digest cache', async () => {
  const f = await fixture()
  let reads = 0
  const bucket = {
    async get(key: string) {
      reads++
      if (reads === 1) throw new Error('controlled transient storage failure')
      if (reads === 2) return null
      return f.bucket.get(key)
    },
  }
  const load = createPythonRuntimeConfigurationLoader()
  await expect(load(bucket, f.descriptor.sha256, context())).rejects.toThrow('transient')
  await expect(load(bucket, f.descriptor.sha256, context())).rejects.toThrow('indisponível')
  expect((await load(bucket, f.descriptor.sha256, context())).resolve(f.selection)).toBeDefined()
  expect(reads).toBe(3)
})

test('one cancelled caller does not retire another waiter sharing the same immutable read', async () => {
  const f = await fixture()
  const entered = gate(),
    release = gate(),
    cancelled = new AbortController()
  const bucket = {
    async get(key: string) {
      entered.resolve()
      await release.promise
      return f.bucket.get(key)
    },
  }
  const load = createPythonRuntimeConfigurationLoader()
  const first = load(bucket, f.descriptor.sha256, context(cancelled.signal))
  const rejected = first.catch((error: Error) => error)
  const second = load(bucket, f.descriptor.sha256, context())
  await entered.promise
  cancelled.abort(new Error('caller retired'))
  expect(await rejected).toBe(cancelled.signal.reason)
  release.resolve()
  expect((await second).resolve(f.selection)).toBeDefined()
})

test('the last cancellation retires a late R2 body and permits a fresh retry', async () => {
  const f = await fixture()
  const entered = gate(),
    release = gate(),
    disposed = gate(),
    controller = new AbortController()
  let reads = 0
  const bucket = {
    async get(key: string) {
      if (++reads > 1) return f.bucket.get(key)
      entered.resolve()
      await release.promise
      return {
        size: 1,
        body: new ReadableStream({
          cancel() {
            disposed.resolve()
          },
        }),
      }
    },
  }
  const load = createPythonRuntimeConfigurationLoader()
  const pending = load(bucket, f.descriptor.sha256, context(controller.signal))
  const rejected = pending.catch((error: Error) => error)
  await entered.promise
  controller.abort(new Error('retired'))
  expect(await rejected).toBe(controller.signal.reason)
  release.resolve()
  await disposed.promise
  expect((await load(bucket, f.descriptor.sha256, context())).resolve(f.selection)).toBeDefined()
  expect(reads).toBe(2)
})

test('cancellation stops a stalled body; context withdrawal rejects even a successful shared load', async () => {
  const f = await fixture()
  const reading = gate(),
    disposed = gate(),
    controller = new AbortController()
  const bucket = {
    async get() {
      return {
        size: f.descriptor.bytes,
        checksums: { sha256: f.objects.get(f.descriptor.key)!.hash },
        body: new ReadableStream(
          {
            pull() {
              reading.resolve()
            },
            cancel() {
              disposed.resolve()
            },
          },
          { highWaterMark: 0 },
        ),
      }
    },
  }
  const load = createPythonRuntimeConfigurationLoader()
  const pending = load(bucket, f.descriptor.sha256, context(controller.signal))
  const rejected = pending.catch((error: Error) => error)
  await reading.promise
  controller.abort(new Error('retired'))
  expect(await rejected).toBe(controller.signal.reason)
  await disposed.promise
  let current = true
  const changed = {
    async get(key: string) {
      const object = await f.bucket.get(key)
      current = false
      return object
    },
  }
  await expect(
    load(changed, f.descriptor.sha256, {
      ...context(),
      assertCurrent() {
        if (!current) throw new Error('context changed')
      },
    }),
  ).rejects.toThrow('context changed')
  expect((await load(changed, f.descriptor.sha256, context())).resolve(f.selection)).toBeDefined()
})

test('the catalog deadline retires an uncooperative GET without requiring caller cancellation', async () => {
  const f = await fixture()
  const entered = gate(),
    release = gate(),
    disposed = gate()
  const deadline = new AbortController()
  const timeout = spyOn(AbortSignal, 'timeout').mockImplementation((milliseconds) => {
    expect(milliseconds).toBe(10_000)
    return deadline.signal
  })
  try {
    const bucket = {
      async get() {
        entered.resolve()
        await release.promise
        return {
          size: 1,
          body: new ReadableStream({
            cancel() {
              disposed.resolve()
            },
          }),
        }
      },
    }
    const caller = context()
    const pending = createPythonRuntimeConfigurationLoader()(bucket, f.descriptor.sha256, caller)
    const outcome = pending.catch((error: Error) => error)
    await entered.promise
    deadline.abort(new DOMException('Catalog deadline', 'TimeoutError'))
    expect(await outcome).toBe(deadline.signal.reason)
    expect(caller.signal.aborted).toBe(false)
    release.resolve()
    await disposed.promise
  } finally {
    release.resolve()
    timeout.mockRestore()
  }
})

test('catalog identity, advertised size, stream size, bytes and schema are independently verified', async () => {
  const f = await fixture()
  const object = f.objects.get(f.descriptor.key)!
  for (const variant of [
    'missing-checksum',
    'wrong-checksum',
    'limit',
    'overflow',
    'truncated',
    'tampered',
  ] as const) {
    let cancelled = false
    const bytes = variant === 'truncated' ? object.bytes.slice(1) : new Uint8Array(object.bytes)
    if (variant === 'tampered') bytes[0] ^= 1
    const bucket = {
      async get() {
        return {
          size:
            variant === 'limit'
              ? PYTHON_CONFIGURATION_MAX_BYTES + 1
              : variant === 'overflow'
                ? 1
                : f.descriptor.bytes,
          checksums:
            variant === 'missing-checksum'
              ? undefined
              : { sha256: variant === 'wrong-checksum' ? new ArrayBuffer(32) : object.hash },
          body: new ReadableStream({
            start(c) {
              c.enqueue(bytes)
            },
            pull(c) {
              c.close()
            },
            cancel() {
              cancelled = true
            },
          }),
        }
      },
    }
    await expect(
      readPythonRuntimeConfiguration(bucket, f.descriptor.sha256, new AbortController().signal),
    ).rejects.toThrow()
    if (['missing-checksum', 'wrong-checksum', 'limit'].includes(variant))
      expect(cancelled).toBe(true)
  }
  for (const text of [
    '{',
    '{"version":9}',
    canonicalJson({
      ...f.configuration,
      deployments: [
        {
          ...f.configuration.deployments[0],
          deployment: {
            ...f.deployment,
            release: { ...f.deployment.release, manifestSha256: '0'.repeat(64) },
          },
        },
      ],
    }),
  ]) {
    const bytes = new TextEncoder().encode(text)
    const digest = await sha256(bytes)
    const bucket = {
      async get() {
        return {
          size: bytes.length,
          checksums: { sha256: await crypto.subtle.digest('SHA-256', bytes) },
          body: new Response(bytes).body!,
        }
      },
    }
    await expect(
      createPythonRuntimeConfigurationLoader()(bucket, digest, context()),
    ).rejects.toThrow()
  }
  let reads = 0
  await expect(
    readPythonRuntimeConfiguration(
      {
        async get() {
          reads++
          return null
        },
      },
      '../escape',
      new AbortController().signal,
    ),
  ).rejects.toThrow()
  expect(reads).toBe(0)
})
