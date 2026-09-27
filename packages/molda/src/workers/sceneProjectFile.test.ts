import { expect, test } from 'bun:test'
import { sceneToJson } from '../scene/documentJson'
import { makeSceneGlbFixture } from '../testing/sceneGlbFixture'
import { prepareSceneProjectFileInWorker } from './sceneProjectFile'
import { readSceneProjectFileReply, sceneProjectFileReply } from './sceneProjectFileProtocol'
import { WORKER_LOADED_MESSAGE } from './workerHandshake'
import type { TaskWorker } from './workerTask'

class ControlledWorker extends EventTarget implements TaskWorker {
  requests: unknown[] = []
  stopped = 0
  postMessage(request: unknown) {
    this.requests.push(structuredClone(request))
  }
  terminate() {
    this.stopped++
  }
  reply(data: unknown) {
    this.dispatchEvent(new MessageEvent('message', { data }))
  }
}
function request() {
  const document = makeSceneGlbFixture(1, 1, 3, 2, 2)
  return {
    taskId: 'restore-task',
    bytes: new TextEncoder().encode(JSON.stringify(sceneToJson(document))),
  }
}

test('real native backup worker preserves authorial content and leaves all input bytes attached', async () => {
  const source = request(),
    before = source.bytes.slice(),
    progress: string[] = []
  const result = await prepareSceneProjectFileInWorker(source, {
    onProgress: (value) => progress.push(value),
  })
  expect(result).toEqual(makeSceneGlbFixture(1, 1, 3, 2, 2))
  expect(progress).toEqual(['validating'])
  expect(source.bytes).toEqual(before)
  result.images[0]?.layers[0]?.pixels.fill(19)
  expect(source.bytes).toEqual(before)
  for (const version of [1, 8]) {
    const invalid = {
      ...source,
      bytes: new TextEncoder().encode(JSON.stringify({ formatVersion: version })),
    }
    await expect(prepareSceneProjectFileInWorker(invalid)).rejects.toMatchObject({
      reason: 'version',
    })
  }
  await expect(
    prepareSceneProjectFileInWorker({ ...source, bytes: new Uint8Array([0xff]) }),
  ).rejects.toMatchObject({ reason: 'invalid' })
})

test('native backup task snapshots before posting, owns replies and cancellation, and never parses synchronously when workers fail', async () => {
  const source = request(),
    before = source.bytes.slice(),
    worker = new ControlledWorker(),
    abort = new AbortController()
  const pending = prepareSceneProjectFileInWorker(source, {
    createWorker: () => worker,
    signal: abort.signal,
  })
  source.bytes.fill(32)
  expect(worker.requests).toEqual([{ taskId: source.taskId, bytes: before }])
  worker.reply(WORKER_LOADED_MESSAGE)
  abort.abort()
  await expect(pending).rejects.toMatchObject({ name: 'AbortError' })
  expect(worker.stopped).toBe(1)
  worker.reply(sceneProjectFileReply(source.taskId, makeSceneGlbFixture(1, 1, 3, 2, 2)))
  expect(worker.stopped).toBe(1)
  let created = 0
  const factory = () => {
    created++
    throw new Error('Worker unavailable')
  }
  expect(() =>
    prepareSceneProjectFileInWorker(request(), { createWorker: factory, signal: abort.signal }),
  ).toThrow()
  expect(created).toBe(0)
  await expect(
    prepareSceneProjectFileInWorker(request(), { createWorker: factory }),
  ).rejects.toThrow('Worker unavailable')
  expect(created).toBe(1)
  const wrong = new ControlledWorker(),
    task = prepareSceneProjectFileInWorker(request(), { createWorker: () => wrong })
  wrong.reply(sceneProjectFileReply('other-task', makeSceneGlbFixture(1, 1, 3, 2, 2)))
  await expect(task).rejects.toThrow()
  expect(wrong.stopped).toBe(1)
  const document = makeSceneGlbFixture(1, 1, 3, 2, 2)
  for (const reply of [
    { ...sceneProjectFileReply('restore-task', document), extra: true },
    { taskId: 'restore-task', type: 'error', reason: 'ignore' },
    sceneProjectFileReply('restore-task', { ...document, nodes: [] }),
  ])
    expect(() => readSceneProjectFileReply(reply, 'restore-task')).toThrow()
  const reply = sceneProjectFileReply('restore-task', document),
    accepted = readSceneProjectFileReply(reply, 'restore-task')
  if (accepted.type !== 'result') throw new Error('Expected document result')
  accepted.result.images[0]?.layers[0]?.pixels.fill(123)
  expect(document).toEqual(makeSceneGlbFixture(1, 1, 3, 2, 2))
})

test('native backup rejects shared pixel memory at the worker boundary before copying a raced document', () => {
  const document = makeSceneGlbFixture(1, 1, 3, 2, 2)
  const layer = document.images[0]?.layers[0]
  if (!layer) throw new Error('Missing layer')
  layer.pixels = new Uint8Array(new SharedArrayBuffer(layer.pixels.byteLength))
  expect(() => readSceneProjectFileReply(sceneProjectFileReply('task', document), 'task')).toThrow()
  expect(() =>
    prepareSceneProjectFileInWorker({
      taskId: 'task',
      bytes: new Uint8Array(new SharedArrayBuffer(8)),
    }),
  ).toThrow()
  layer.pixels = new Uint8Array(
    new ArrayBuffer(layer.pixels.byteLength * 2),
    layer.pixels.byteLength,
  )
  expect(() => readSceneProjectFileReply(sceneProjectFileReply('task', document), 'task')).toThrow()
})
