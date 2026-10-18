import { expect, test } from 'bun:test'
import { STUDIO_PYTHON_INPUT_LIMITS } from '@sistemazero/core/studio/python-validation-input'
import { collectPythonInputGarbage, type PythonInputGcBucket } from '../src/python-input-gc'
import { pythonInputFileKey } from '../src/python-inputs'
import { pythonInputFixture } from './python-input-fixture'

test('input GC removes expired bytes, keeps admission tombstones and preserves active and permanent content', async () => {
  const f = await pythonInputFixture()
  const expired = await f.store.open(f.request, f.controller.signal)
  await f.store.upload(expired, f.fileHash, new Blob([f.bytes]).stream(), f.controller.signal)
  f.setTime(1000 + STUDIO_PYTHON_INPUT_LIMITS.lifetimeMs / 2)
  const active = await f.store.open(
    { ...f.request, requestId: crypto.randomUUID() },
    f.controller.signal,
  )
  await f.store.upload(active, f.fileHash, new Blob([f.bytes]).stream(), f.controller.signal)
  const permanent = 'published/permanent-game/bytes'
  f.objects.set(permanent, { bytes: f.bytes, hash: await crypto.subtle.digest('SHA-256', f.bytes) })
  let saved: string | undefined = 'previous'
  const bucket: PythonInputGcBucket = {
    get: f.bucket.get,
    delete: f.bucket.delete,
    async list(options) {
      expect(options.prefix).toBe('python-input-states/')
      return {
        objects: [...f.objects.keys()]
          .filter((key) => key.startsWith(options.prefix))
          .map((key) => ({ key })),
        truncated: false,
      }
    },
  }
  const now = 1000 + STUDIO_PYTHON_INPUT_LIMITS.lifetimeMs + 1
  const result = await collectPythonInputGarbage({
    bucket,
    cursor: {
      async load() {
        return undefined
      },
      async save(value) {
        saved = value
      },
    },
    signal: f.controller.signal,
    now: () => now,
  })
  expect(result).toEqual({ scanned: 2, states: 2, removalRequests: 1, failed: 0 })
  expect(f.objects.has(pythonInputFileKey(expired, f.fileHash))).toBe(false)
  expect(f.objects.has(`python-input-states/${expired.inputId}.json`)).toBe(true)
  expect(f.objects.has(pythonInputFileKey(active, f.fileHash))).toBe(true)
  expect(f.objects.has(permanent)).toBe(true)
  expect(saved).toBeUndefined()
  f.setTime(now)
  await expect(f.store.open(f.request, f.controller.signal)).rejects.toThrow('expirou')
})
test('GC does not delete files based on corrupted admission metadata', async () => {
  const f = await pythonInputFixture()
  const ref = await f.store.open(f.request, f.controller.signal)
  await f.store.upload(ref, f.fileHash, new Blob([f.bytes]).stream(), f.controller.signal)
  f.objects.get(`python-input-states/${ref.inputId}.json`)!.hash = new ArrayBuffer(32)
  const bucket: PythonInputGcBucket = {
    get: f.bucket.get,
    delete: f.bucket.delete,
    async list() {
      return {
        objects: [
          { key: `python-input-states/${ref.inputId}.json` },
          { key: 'published/another-project/state.json' },
        ],
        truncated: false,
      }
    },
  }
  const result = await collectPythonInputGarbage({
    bucket,
    cursor: {
      async load() {
        return undefined
      },
      async save() {},
    },
    now: () => ref.expiresAt + 1,
  })
  expect(result.failed).toBe(1)
  expect(result.removalRequests).toBe(0)
  expect(f.objects.has(pythonInputFileKey(ref, f.fileHash))).toBe(true)
})
test('bounded GC commits its cursor only after successful deletion and safely retries a failed checkpoint', async () => {
  const f = await pythonInputFixture()
  const ref = await f.store.open(f.request, f.controller.signal)
  await f.store.upload(ref, f.fileHash, new Blob([f.bytes]).stream(), f.controller.signal)
  const bucket: PythonInputGcBucket = {
    get: f.bucket.get,
    delete: f.bucket.delete,
    async list(options) {
      expect(options.limit).toBe(STUDIO_PYTHON_INPUT_LIMITS.cleanupBatch)
      return {
        objects: [{ key: `python-input-states/${ref.inputId}.json` }],
        truncated: true,
        cursor: 'next-page',
      }
    },
  }
  const input = {
    bucket,
    cursor: {
      async load() {
        return undefined
      },
      async save(_cursor?: string) {
        throw new Error('checkpoint unavailable')
      },
    },
    now: () => ref.expiresAt + 1,
  }
  await expect(collectPythonInputGarbage(input)).rejects.toThrow('checkpoint unavailable')
  let saved: string | undefined
  expect(
    (
      await collectPythonInputGarbage({
        ...input,
        cursor: {
          async load() {
            return undefined
          },
          async save(value) {
            saved = value
          },
        },
      })
    ).failed,
  ).toBe(0)
  expect(saved).toBe('next-page')
  expect(f.objects.has(`python-input-states/${ref.inputId}.json`)).toBe(true)
})

test('a transient deletion failure rejects the page without committing its cursor', async () => {
  const f = await pythonInputFixture()
  const ref = await f.store.open(f.request, f.controller.signal)
  await f.store.upload(ref, f.fileHash, new Blob([f.bytes]).stream(), f.controller.signal)
  let saves = 0
  await expect(
    collectPythonInputGarbage({
      bucket: {
        get: f.bucket.get,
        async delete() {
          throw new Error('R2 delete unavailable')
        },
        async list() {
          return {
            objects: [{ key: `python-input-states/${ref.inputId}.json` }],
            truncated: true,
            cursor: 'next',
          }
        },
      },
      cursor: {
        async load() {
          return undefined
        },
        async save() {
          saves++
        },
      },
      now: () => ref.expiresAt + 1,
    }),
  ).rejects.toThrow('R2 delete unavailable')
  expect(saves).toBe(0)
})

for (const retirement of ['remove', 'lifecycle'] as const) {
  test(`GC holding an old admission preserves an active input reopened after ${retirement}`, async () => {
    const f = await pythonInputFixture()
    const ref = await f.store.open(f.request, f.controller.signal)
    await f.store.upload(ref, f.fileHash, new Blob([f.bytes]).stream(), f.controller.signal)
    let entered!: () => void, release!: () => void
    const started = new Promise<void>((yes) => {
      entered = yes
    })
    const gate = new Promise<void>((yes) => {
      release = yes
    })
    let time = ref.expiresAt - 10_000
    f.setTime(time)
    const stateKey = `python-input-states/${ref.inputId}.json`
    const collecting = collectPythonInputGarbage({
      bucket: {
        async get(key) {
          const old = await f.bucket.get(key)
          entered()
          await gate
          return old
        },
        delete: f.bucket.delete,
        async list() {
          return { objects: [{ key: stateKey }], truncated: false }
        },
      },
      cursor: {
        async load() {
          return undefined
        },
        async save() {},
      },
      now: () => time,
    })
    await started
    if (retirement === 'remove') {
      await f.store.remove(ref, f.controller.signal)
      await expect(f.store.open(f.request, f.controller.signal)).rejects.toThrow('encerrado')
    }
    await f.bucket.delete([stateKey]) // Physical lifecycle may retire any old admission.
    const reopened = await f.store.open(f.request, f.controller.signal)
    expect(reopened.inputId).toBe(ref.inputId)
    expect(reopened.generation).not.toBe(ref.generation)
    expect(reopened.expiresAt).toBeGreaterThan(ref.expiresAt)
    await f.store.upload(reopened, f.fileHash, new Blob([f.bytes]).stream(), f.controller.signal)
    time = ref.expiresAt + 1
    f.setTime(time)
    release()
    await collecting
    const resolved = await f.store.resolve(reopened, f.controller.signal)
    expect(
      new Uint8Array(
        await new Response(await resolved.read('main.py', f.controller.signal)).arrayBuffer(),
      ),
    ).toEqual(f.bytes)
  })
}

for (const failure of ['get', 'body'] as const) {
  test(`transient metadata ${failure} failure does not checkpoint the GC page`, async () => {
    const f = await pythonInputFixture()
    const ref = await f.store.open(f.request, f.controller.signal)
    let saves = 0
    await expect(
      collectPythonInputGarbage({
        bucket: {
          async get(key) {
            if (failure === 'get') throw new Error('R2 read unavailable')
            const object = await f.bucket.get(key)
            if (!object) return null
            return {
              ...object,
              body: new ReadableStream<Uint8Array>({
                start(controller) {
                  controller.error(new Error('R2 read unavailable'))
                },
              }),
            }
          },
          delete: f.bucket.delete,
          async list() {
            return {
              objects: [{ key: `python-input-states/${ref.inputId}.json` }],
              truncated: true,
              cursor: 'next',
            }
          },
        },
        cursor: {
          async load() {
            return undefined
          },
          async save() {
            saves++
          },
        },
        now: () => ref.expiresAt + 1,
      }),
    ).rejects.toThrow('R2 read unavailable')
    expect(saves).toBe(0)
  })
}
