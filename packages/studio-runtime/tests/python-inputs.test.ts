import { expect, test } from 'bun:test'
import { STUDIO_PYTHON_INPUT_LIMITS } from '@sistemazero/core/studio/python-validation-input'
import type { PythonInputBucket } from '../src/python-inputs'
import { pythonInputFixture as fixture } from './python-input-fixture'

test('inputs store metadata, transfer exact bytes separately and recover an idempotent request', async () => {
  const f = await fixture()
  const ref = await f.store.open(f.request, f.controller.signal)
  expect(f.objects.size).toBe(1)
  f.setTime(2000)
  expect(await f.store.open(f.request, f.controller.signal)).toEqual(ref)
  await expect(
    (await f.store.resolve(ref, f.controller.signal)).read('main.py', f.controller.signal),
  ).rejects.toThrow('incompleto')
  const upload = () =>
    f.store.upload(ref, f.fileHash, new Blob([f.bytes]).stream(), f.controller.signal)
  expect(await upload()).toEqual({ sha256: f.fileHash, bytes: f.bytes.byteLength })
  expect(await upload()).toEqual({ sha256: f.fileHash, bytes: f.bytes.byteLength })
  expect(f.objects.size).toBe(2)
  const input = await f.store.resolve(ref, f.controller.signal)
  input.snapshot.files[0].path = 'other.py'
  expect(
    new Uint8Array(
      await new Response(await input.read('main.py', f.controller.signal)).arrayBuffer(),
    ),
  ).toEqual(f.bytes)
  await f.store.remove(ref, f.controller.signal)
  expect(f.objects.size).toBe(2) // Immutable admission and generation-specific closure remain until lifecycle.
  await expect(f.store.open(f.request, f.controller.signal)).rejects.toThrow('encerrado')
  await expect(f.store.resolve(ref, f.controller.signal)).rejects.toThrow('encerrado')
  await f.store.remove(ref, f.controller.signal)
})
test('ownership, execution, revision and expiry cannot be supplied by another input reference', async () => {
  const f = await fixture()
  const ref = await f.store.open(f.request, f.controller.signal)
  for (const candidate of [
    { ...ref, owner: 'e'.repeat(64) },
    { ...ref, requestId: crypto.randomUUID() },
    { ...ref, generation: crypto.randomUUID() },
    { ...ref, projectId: 'another-project' },
    { ...ref, executionId: 'other-1234567890abcdef' },
    { ...ref, revision: 'e'.repeat(64) },
    { ...ref, expiresAt: ref.expiresAt + 1 },
  ])
    await expect(f.store.resolve(candidate, f.controller.signal)).rejects.toThrow('outra execução')
  f.setTime(1000 + STUDIO_PYTHON_INPUT_LIMITS.lifetimeMs)
  await expect(f.store.resolve(ref, f.controller.signal)).rejects.toThrow('expirou')
  await expect(f.store.open(f.request, f.controller.signal)).rejects.toThrow('expirou')
})

test('a lifecycle-recreated nonce in the same clock tick has a distinct generation and rejects the old reference', async () => {
  const f = await fixture()
  const old = await f.store.open(f.request, f.controller.signal)
  await f.store.remove(old, f.controller.signal)
  await f.bucket.delete([`python-input-states/${old.inputId}.json`])
  const reopened = await f.store.open(f.request, f.controller.signal)
  expect(reopened.inputId).toBe(old.inputId)
  expect(reopened.expiresAt).toBe(old.expiresAt)
  expect(reopened.generation).not.toBe(old.generation)
  await expect(f.store.resolve(old, f.controller.signal)).rejects.toThrow('outra execução')
  expect(await f.store.open(f.request, f.controller.signal)).toEqual(reopened)
})

test('a delayed remove cannot delete the admission or files of a generation recreated by lifecycle', async () => {
  const f = await fixture()
  const old = await f.store.open(f.request, f.controller.signal)
  await f.store.upload(old, f.fileHash, new Blob([f.bytes]).stream(), f.controller.signal)
  const originalDelete = f.bucket.delete
  let entered!: () => void, release!: () => void
  const started = new Promise<void>((yes) => {
    entered = yes
  })
  const gate = new Promise<void>((yes) => {
    release = yes
  })
  let first = true
  f.bucket.delete = async (keys) => {
    if (first) {
      first = false
      entered()
      await gate
    }
    await originalDelete(keys)
  }
  const removing = f.store.remove(old, f.controller.signal)
  await started
  await f.store.remove(old, f.controller.signal)
  await originalDelete([`python-input-states/${old.inputId}.json`])
  const reopened = await f.store.open(f.request, f.controller.signal)
  await f.store.upload(reopened, f.fileHash, new Blob([f.bytes]).stream(), f.controller.signal)
  release()
  await removing
  const input = await f.store.resolve(reopened, f.controller.signal)
  expect(
    new Uint8Array(
      await new Response(await input.read('main.py', f.controller.signal)).arrayBuffer(),
    ),
  ).toEqual(f.bytes)
  expect(reopened.generation).not.toBe(old.generation)
})
test('unregistered and corrupt upload streams are cancelled without creating source files', async () => {
  const f = await fixture()
  const ref = await f.store.open(f.request, f.controller.signal)
  let cancelled = 0
  const unregistered = new ReadableStream<Uint8Array>(
    {
      cancel() {
        cancelled++
      },
    },
    { highWaterMark: 0 },
  )
  await expect(
    f.store.upload(ref, 'f'.repeat(64), unregistered, f.controller.signal),
  ).rejects.toThrow('não pertence')
  expect(cancelled).toBe(1)
  await expect(
    f.store.upload(ref, f.fileHash, new Blob([new Uint8Array([0])]).stream(), f.controller.signal),
  ).rejects.toThrow()
  expect(f.objects.size).toBe(1)
})
test('cancelled metadata reads reclaim a body that arrives after the operation retires', async () => {
  const f = await fixture()
  const ref = await f.store.open(f.request, f.controller.signal)
  let entered!: () => void, release!: (value: Awaited<ReturnType<PythonInputBucket['get']>>) => void
  const started = new Promise<void>((resolve) => {
    entered = resolve
  })
  const gate = new Promise<Awaited<ReturnType<PythonInputBucket['get']>>>((resolve) => {
    release = resolve
  })
  f.bucket.get = () => {
    entered()
    return gate
  }
  const result = f.store.resolve(ref, f.controller.signal)
  await started
  f.controller.abort(new Error('actor retired'))
  await expect(result).rejects.toThrow('actor retired')
  let cancelled = 0
  release({
    body: new ReadableStream<Uint8Array>(
      {
        cancel() {
          cancelled++
        },
      },
      { highWaterMark: 0 },
    ),
    size: 0,
  })
  await Promise.resolve()
  await Promise.resolve()
  expect(cancelled).toBe(1)
})

test('duplicate upload cleanup remains cancellable when the R2 body does not acknowledge cancellation', async () => {
  const f = await fixture()
  const ref = await f.store.open(f.request, f.controller.signal)
  await f.store.upload(ref, f.fileHash, new Blob([f.bytes]).stream(), f.controller.signal)
  const originalGet = f.bucket.get
  let entered!: () => void
  const started = new Promise<void>((resolve) => {
    entered = resolve
  })
  f.bucket.get = async (key) => {
    const object = await originalGet(key)
    return key.includes('/files/') && object
      ? {
          ...object,
          body: new ReadableStream<Uint8Array>(
            {
              cancel() {
                entered()
                return new Promise(() => {})
              },
            },
            { highWaterMark: 0 },
          ),
        }
      : object
  }
  const result = f.store.upload(ref, f.fileHash, new Blob([f.bytes]).stream(), f.controller.signal)
  await started
  f.controller.abort(new Error('duplicate input retired'))
  await expect(result).rejects.toThrow('duplicate input retired')
})

test('a rejected stored file returns its error even when body cancellation is unresponsive', async () => {
  const f = await fixture()
  const ref = await f.store.open(f.request, f.controller.signal)
  await f.store.upload(ref, f.fileHash, new Blob([f.bytes]).stream(), f.controller.signal)
  const input = await f.store.resolve(ref, f.controller.signal)
  const originalGet = f.bucket.get
  let cancelled = 0
  f.bucket.get = async (key) => {
    const object = await originalGet(key)
    return object
      ? {
          ...object,
          size: object.size + 1,
          body: new ReadableStream<Uint8Array>(
            {
              cancel() {
                cancelled++
                return new Promise(() => {})
              },
            },
            { highWaterMark: 0 },
          ),
        }
      : object
  }
  await expect(input.read('main.py', f.controller.signal)).rejects.toThrow('mudou')
  expect(cancelled).toBe(1)
})
