import { expect, test } from 'bun:test'
import { GLTF_INPUT_LIMITS } from './gltfInput'
import { type GltfChosenFile, readGltfLocalBundle } from './gltfLocalBundle'

const signal = () => new AbortController().signal
function file(name: string, bytes = new Uint8Array([1, 2, 3])): GltfChosenFile {
  return { name, size: bytes.length, arrayBuffer: async () => new Uint8Array(bytes).buffer }
}

test('local bundle preserves directory paths, literal URI characters and source bytes when appending', async () => {
  const source = file('model.GLTF'),
    initial = await readGltfLocalBundle(
      [{ ...source, webkitRelativePath: 'fox/model.GLTF' }, file('second.glb')],
      signal(),
    ),
    next = await readGltfLocalBundle([file('fox/paint%20red.png')], signal(), initial.files)
  expect(next.entries).toEqual(['fox/model.GLTF', 'second.glb'])
  expect(next.files.map((item) => item.path)).toEqual([
    'fox/model.GLTF',
    'second.glb',
    'fox/paint%20red.png',
  ])
  expect(next.files[0] === initial.files[0]).toBe(false)
  expect(next.files[0]!.bytes).toBe(initial.files[0]!.bytes)
  expect(initial.files.length).toBe(2)
  expect(next.files[2]!.bytes).toEqual(new Uint8Array([1, 2, 3]))
})

test('all paths, duplicates, file counts and byte budgets fail before any selected file IO', async () => {
  let reads = 0
  const unread = (name: string, size = 0): GltfChosenFile => ({
    name,
    size,
    arrayBuffer: async () => {
      reads++
      throw new Error('Must not read')
    },
  })
  for (const invalid of [
    [unread('model.glb'), unread('../escape.bin')],
    [unread('model.glb'), unread('./model.glb')],
    [unread('model.glb'), unread('bad.bin', -1)],
    [unread('model.glb'), unread('bad.bin', Number.NaN)],
    [unread('model.glb', GLTF_INPUT_LIMITS.fileBytes + 1)],
    [
      unread('a.glb', GLTF_INPUT_LIMITS.fileBytes),
      unread('b.bin', GLTF_INPUT_LIMITS.fileBytes),
      unread('c', 1),
    ],
    Array.from({ length: 1026 }, (_, i) => unread(`${i}.glb`)),
  ])
    await expect(readGltfLocalBundle(invalid, signal())).rejects.toThrow()
  const previous = await readGltfLocalBundle([file('model.glb')], signal())
  await expect(
    readGltfLocalBundle([unread('model.glb')], signal(), previous.files),
  ).rejects.toThrow()
  expect(reads).toBe(0)
  const exact = await readGltfLocalBundle(
    Array.from({ length: 1025 }, (_, i) => file(`${i}.glb`, new Uint8Array())),
    signal(),
  )
  expect(exact.entries.length).toBe(1025)
})

test('file metadata must match actual bytes and a cancelled native read cannot continue the bundle', async () => {
  await expect(readGltfLocalBundle([{ ...file('model.glb'), size: 4 }], signal())).rejects.toThrow(
    'tamanho lido',
  )
  const controller = new AbortController(),
    pending = Promise.withResolvers<ArrayBuffer>()
  let followingReads = 0
  const work = readGltfLocalBundle(
    [
      { name: 'model.glb', size: 3, arrayBuffer: () => pending.promise },
      {
        name: 'mesh.bin',
        size: 0,
        arrayBuffer: async () => {
          followingReads++
          return new ArrayBuffer(0)
        },
      },
    ],
    controller.signal,
  )
  controller.abort()
  pending.resolve(new ArrayBuffer(3))
  await expect(work).rejects.toThrow()
  expect(followingReads).toBe(0)
  await expect(
    readGltfLocalBundle(
      [
        {
          get name(): string {
            throw new Error('Metadata read after abort')
          },
          size: 0,
          arrayBuffer: async () => new ArrayBuffer(0),
        },
      ],
      controller.signal,
    ),
  ).rejects.toMatchObject({ name: 'AbortError' })
})
