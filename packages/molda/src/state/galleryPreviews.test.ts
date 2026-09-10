import { expect, spyOn, test } from 'bun:test'
import { summarizeAsset } from '../core/assetSummary'
import { prepareGalleryPreview } from '../core/galleryPreview'
import type { MoldaAsset } from '../core/model'
import { makeModel, makeSky, makeTexture } from '../testing/fixtures'
import { createGalleryPreviews } from './galleryPreviews'
import { createMemoryPersistence } from './memoryPersistence'

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

test('previews read one document at a time and cancel queued reads before touching storage', async () => {
  const p = createMemoryPersistence([makeModel(), makeTexture(), makeSky()])
  const firstStarted = deferred<void>()
  const firstContent = deferred<MoldaAsset | null>()
  const normal = p.load.bind(p)
  const calls: string[] = []
  p.load = async (id) => {
    calls.push(id)
    if (id === 'model-1') {
      firstStarted.resolve()
      return firstContent.promise
    }
    return normal(id)
  }
  const previews = createGalleryPreviews(p)
  const a = new AbortController()
  const b = new AbortController()
  const c = new AbortController()
  const first = previews.load(summarizeAsset(makeModel()), a.signal)
  const cancelled = previews.load(summarizeAsset(makeTexture()), b.signal).catch((error) => error)
  const last = previews.load(summarizeAsset(makeSky()), c.signal)
  await firstStarted.promise
  expect(calls).toEqual(['model-1'])
  b.abort()
  expect((await cancelled).name).toBe('AbortError')
  firstContent.resolve(makeModel())
  expect(await first).toEqual(prepareGalleryPreview(makeModel()))
  expect(await last).toEqual(prepareGalleryPreview(makeSky()))
  expect(calls).toEqual(['model-1', 'sky-1'])
  previews.clear()
})

test('clearing rejects active work, drops late results, releases cached data and remains reusable', async () => {
  const p = createMemoryPersistence([makeSky()])
  const started = deferred<void>()
  const content = deferred<MoldaAsset | null>()
  const normal = p.load.bind(p)
  p.load = async () => {
    started.resolve()
    return content.promise
  }
  const previews = createGalleryPreviews(p)
  const pending = previews
    .load(summarizeAsset(makeSky()), new AbortController().signal)
    .catch((e) => e)
  await started.promise
  previews.clear()
  expect((await pending).name).toBe('AbortError')
  p.load = normal
  content.resolve(makeSky())
  const read = spyOn(p, 'load')
  expect(await previews.load(summarizeAsset(makeSky()), new AbortController().signal)).toEqual(
    prepareGalleryPreview(makeSky()),
  )
  expect(read).toHaveBeenCalledTimes(1)
  await previews.load(summarizeAsset(makeSky()), new AbortController().signal)
  expect(read).toHaveBeenCalledTimes(1)
  previews.clear()
  await previews.load(summarizeAsset(makeSky()), new AbortController().signal)
  expect(read).toHaveBeenCalledTimes(2)
  read.mockRestore()
  previews.clear()
})

test('a stale summary never receives a preview of a different revision or kind', async () => {
  const p = createMemoryPersistence([makeSky({ updatedAt: 3 })])
  const previews = createGalleryPreviews(p)
  expect(await previews.load(summarizeAsset(makeSky()), new AbortController().signal)).toBeNull()
  expect(
    await previews.load(summarizeAsset(makeSky({ updatedAt: 3 })), new AbortController().signal),
  ).toEqual(prepareGalleryPreview(makeSky({ updatedAt: 3 })))
  previews.clear()
})

test('failure does not stall the queue; already aborted requests do not read', async () => {
  const p = createMemoryPersistence([makeSky()])
  const load = spyOn(p, 'load').mockRejectedValueOnce(new Error('disk'))
  const previews = createGalleryPreviews(p)
  const controller = new AbortController()
  controller.abort()
  await expect(previews.load(summarizeAsset(makeSky()), controller.signal)).rejects.toHaveProperty(
    'name',
    'AbortError',
  )
  expect(load).not.toHaveBeenCalled()
  await expect(
    previews.load(summarizeAsset(makeSky()), new AbortController().signal),
  ).rejects.toThrow('disk')
  expect(await previews.load(summarizeAsset(makeSky()), new AbortController().signal)).toEqual(
    prepareGalleryPreview(makeSky()),
  )
  load.mockRestore()
  previews.clear()
})

test('preview caches are profile-local even when ids and timestamps coincide', async () => {
  const first = makeSky()
  const second = makeSky({ params: { ...first.params, sunElevation: 30 } })
  const a = createGalleryPreviews(createMemoryPersistence([first]))
  const b = createGalleryPreviews(createMemoryPersistence([second]))
  const summary = summarizeAsset(first)
  expect(await a.load(summary, new AbortController().signal)).toEqual(prepareGalleryPreview(first))
  expect(await b.load(summary, new AbortController().signal)).toEqual(prepareGalleryPreview(second))
  a.clear()
  b.clear()
})
