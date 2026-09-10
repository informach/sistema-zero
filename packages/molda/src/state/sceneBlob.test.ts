import { expect, test } from 'bun:test'
import { createHash } from 'node:crypto'
import {
  checkScenePixelBytes,
  MAX_SCENE_PIXEL_BLOB_BYTES,
  readScenePixelReference,
  type ScenePixelReference,
  scenePixelHash,
} from './sceneBlob'

test('pixel digest uses SHA-256 raw bytes and only the chosen interval, with call-time ownership', async () => {
  const bytes = new Uint8Array([255, 97, 98, 99, 254])
  const view = bytes.subarray(1, 4)
  const pending = scenePixelHash(view)
  bytes.fill(0)
  expect(await pending).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
  for (const input of [new Uint8Array([0]), new Uint8Array([200, 100, 77, 0])])
    expect(await scenePixelHash(input)).toBe(createHash('sha256').update(input).digest('hex'))
})

test('pixel boundary rejects empty/shared/detached/oversized bytes, malformed references and cancellation', async () => {
  for (const input of [[], 'pixels', new Uint8Array(), new Uint8Array(new SharedArrayBuffer(4))])
    expect(() => checkScenePixelBytes(input)).toThrow()
  const detached = new Uint8Array(4)
  structuredClone(detached, { transfer: [detached.buffer] })
  expect(() => checkScenePixelBytes(detached)).toThrow()
  expect(() => checkScenePixelBytes(new Uint8Array(MAX_SCENE_PIXEL_BLOB_BYTES + 1))).toThrow(
    expect.objectContaining({ reason: 'budget' }),
  )
  expect(() => checkScenePixelBytes(new Uint8Array(4), 3)).toThrow(
    expect.objectContaining({ reason: 'integrity' }),
  )
  const reference: ScenePixelReference = {
    kind: 'scene-pixels',
    algorithm: 'sha256',
    hash: 'a'.repeat(64),
    byteLength: 4,
  }
  expect(readScenePixelReference(reference, 4)).toEqual(reference)
  for (const extra of [
    { hash: 'A'.repeat(64) },
    { hash: `${'a'.repeat(64)}\n` },
    { hash: 'a'.repeat(63) },
    { algorithm: 'md5' },
    { byteLength: 5 },
    { kind: 'cloud-part' },
    { ignored: true },
  ])
    expect(() => readScenePixelReference({ ...reference, ...extra }, 4)).toThrow()
  const controller = new AbortController()
  controller.abort()
  await expect(scenePixelHash(new Uint8Array(4), controller.signal)).rejects.toMatchObject({
    name: 'AbortError',
  })
  const during = new AbortController()
  const pending = scenePixelHash(new Uint8Array(MAX_SCENE_PIXEL_BLOB_BYTES), during.signal)
  during.abort()
  await expect(pending).rejects.toMatchObject({ name: 'AbortError' })
})
