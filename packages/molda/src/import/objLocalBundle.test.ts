import { expect, test } from 'bun:test'
import { OBJ_INPUT_LIMITS } from './objInput'
import { type ObjChosenFile, readObjLocalBundle } from './objLocalBundle'

const signal = () => new AbortController().signal
const file = (name: string): ObjChosenFile => ({
  name,
  size: 1,
  arrayBuffer: async () => Uint8Array.of(42).buffer,
})
test('OBJ local selection preserves literal directory paths, only OBJ entries and session-owned prior buffers', async () => {
  const first = await readObjLocalBundle(
      [{ ...file('model.OBJ'), webkitRelativePath: 'fox/model.OBJ' }, file('other.gltf')],
      signal(),
    ),
    next = await readObjLocalBundle(
      [file('fox/material%20red.mtl'), file('second.obj')],
      signal(),
      first.files,
    )
  expect(first.entries).toEqual(['fox/model.OBJ'])
  expect(next.entries).toEqual(['fox/model.OBJ', 'second.obj'])
  expect(next.files.map((item) => item.path)).toEqual([
    'fox/model.OBJ',
    'other.gltf',
    'fox/material%20red.mtl',
    'second.obj',
  ])
  expect(next.files[0]).not.toBe(first.files[0])
  expect(next.files[0]!.bytes).toBe(first.files[0]!.bytes)
  expect(first.files).toHaveLength(2)
})
test('OBJ path/count/byte metadata is fully checked before IO, including appended selection and duplicate canonical paths', async () => {
  let reads = 0
  const unread = (name: string, size = 0): ObjChosenFile => ({
    name,
    size,
    arrayBuffer: async () => {
      reads++
      throw new Error('Must not read')
    },
  })
  for (const chosen of [
    [unread('a.obj'), unread('../escape.mtl')],
    [unread('a.obj'), unread('./a.obj')],
    [unread('a.obj'), unread('./https:remote.mtl')],
    [unread('a.obj'), unread('a.mtl', NaN)],
    [unread('a.obj', OBJ_INPUT_LIMITS.fileBytes + 1)],
    [
      unread('a.obj', OBJ_INPUT_LIMITS.fileBytes),
      unread('a.mtl', OBJ_INPUT_LIMITS.fileBytes),
      unread('extra', 1),
    ],
    Array.from({ length: 1026 }, (_, i) => unread(`${i}.obj`)),
  ])
    await expect(readObjLocalBundle(chosen, signal())).rejects.toMatchObject({
      name: 'ObjInputError',
    })
  const previous = await readObjLocalBundle([file('a.obj')], signal())
  await expect(
    readObjLocalBundle([unread('./a.obj')], signal(), previous.files),
  ).rejects.toMatchObject({ name: 'ObjInputError' })
  expect(reads).toBe(0)
})
test('OBJ native file reads cannot continue after cancellation or claim another byte length', async () => {
  const controller = new AbortController(),
    pending = Promise.withResolvers<ArrayBuffer>()
  let following = 0
  const work = readObjLocalBundle(
    [
      { name: 'a.obj', size: 0, arrayBuffer: () => pending.promise },
      {
        name: 'a.mtl',
        size: 0,
        arrayBuffer: async () => {
          following++
          return new ArrayBuffer(0)
        },
      },
    ],
    controller.signal,
  )
  controller.abort()
  pending.resolve(new ArrayBuffer(0))
  await expect(work).rejects.toMatchObject({ name: 'AbortError' })
  expect(following).toBe(0)
  await expect(readObjLocalBundle([{ ...file('a.obj'), size: 2 }], signal())).rejects.toThrow(
    'tamanho lido',
  )
  await expect(
    readObjLocalBundle(
      // Deliberately invalid file-provider output at the runtime boundary.
      [
        {
          ...file('a.obj'),
          arrayBuffer: async () => new SharedArrayBuffer(1) as unknown as ArrayBuffer,
        },
      ],
      signal(),
    ),
  ).rejects.toThrow('tamanho lido')
})
