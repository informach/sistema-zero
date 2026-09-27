import { expect, test } from 'bun:test'
import { BBMODEL_INPUT_LIMITS } from './bbmodelInput'
import { type BbmodelChosenFile, readBbmodelLocalBundle } from './bbmodelLocalBundle'

const signal = () => new AbortController().signal
const file = (name: string): BbmodelChosenFile => ({
  name,
  size: 1,
  arrayBuffer: async () => Uint8Array.of(42).buffer,
})
test('bbmodel browser bundle keeps literal relative paths, detects only bbmodel entries and reuses prior session bytes', async () => {
  const first = await readBbmodelLocalBundle(
      [{ ...file('model.BBMODEL'), webkitRelativePath: 'fox/model.BBMODEL' }, file('other.glb')],
      signal(),
    ),
    next = await readBbmodelLocalBundle(
      [file('fox/paint%20red.png'), file('second.bbmodel')],
      signal(),
      first.files,
    )
  expect(first.entries).toEqual(['fox/model.BBMODEL'])
  expect(next.entries).toEqual(['fox/model.BBMODEL', 'second.bbmodel'])
  expect(next.files.map((file) => file.path)).toEqual([
    'fox/model.BBMODEL',
    'other.glb',
    'fox/paint%20red.png',
    'second.bbmodel',
  ])
  expect(next.files[0]).not.toBe(first.files[0])
  expect(next.files[0]!.bytes).toBe(first.files[0]!.bytes)
})
test('bbmodel complete browser selection metadata and appended totals fail before any file IO', async () => {
  let reads = 0
  const unread = (name: string, size = 0): BbmodelChosenFile => ({
    name,
    size,
    arrayBuffer: async () => {
      reads++
      throw new Error('No IO expected')
    },
  })
  for (const chosen of [
    [unread('a.bbmodel'), unread('../escape.png')],
    [unread('a.bbmodel'), unread('./a.bbmodel')],
    [unread('a.bbmodel'), unread('https:remote.png')],
    [unread('a.bbmodel'), unread('image.png', NaN)],
    [unread('a.bbmodel', BBMODEL_INPUT_LIMITS.fileBytes + 1)],
    [
      unread('a.bbmodel', BBMODEL_INPUT_LIMITS.fileBytes),
      unread('image.png', BBMODEL_INPUT_LIMITS.fileBytes),
      unread('extra', 1),
    ],
    Array.from({ length: 1026 }, (_, index) => unread(`${index}.bbmodel`)),
  ])
    await expect(readBbmodelLocalBundle(chosen, signal())).rejects.toMatchObject({
      name: 'BbmodelInputError',
    })
  const previous = await readBbmodelLocalBundle([file('a.bbmodel')], signal())
  await expect(
    readBbmodelLocalBundle([unread('./a.bbmodel')], signal(), previous.files),
  ).rejects.toMatchObject({ name: 'BbmodelInputError' })
  expect(reads).toBe(0)
})
test('bbmodel browser reads stop between awaits and reject wrong-length or shared file-provider output', async () => {
  const controller = new AbortController(),
    pending = Promise.withResolvers<ArrayBuffer>()
  let following = 0
  const work = readBbmodelLocalBundle(
    [
      { name: 'a.bbmodel', size: 0, arrayBuffer: () => pending.promise },
      {
        name: 'image.png',
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
  await expect(
    readBbmodelLocalBundle([{ ...file('a.bbmodel'), size: 2 }], signal()),
  ).rejects.toThrow('tamanho lido')
  await expect(
    readBbmodelLocalBundle(
      [
        {
          ...file('a.bbmodel'),
          arrayBuffer: async () => new SharedArrayBuffer(1) as unknown as ArrayBuffer,
        },
      ],
      signal(),
    ),
  ).rejects.toThrow('tamanho lido')
})
