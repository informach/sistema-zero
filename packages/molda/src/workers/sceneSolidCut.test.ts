import { expect, test } from 'bun:test'
import { requireClosedSceneMesh, sceneMeshVolume } from '../scene/meshSolid'
import { primitiveMesh } from '../scene/primitiveMesh'
import { splitSceneSolid } from '../scene/solidCut'
import { packSceneMesh } from './sceneMeshPacket'
import { cutSolidInWorker } from './sceneSolidCut'
import {
  readSolidCutReply,
  readSolidCutRequest,
  type SolidCutRequest,
} from './sceneSolidCutProtocol'
import type { TaskWorker } from './workerTask'

const request = (): SolidCutRequest => ({
  documentId: 'cut',
  revision: 3,
  capId: 'cap',
  plane: { origin: [0, 0, 0], normal: [1, 1, 0] },
  mesh: primitiveMesh({ id: 'mesh', kind: 'box', from: [-1, -1, -1], to: [1, 1, 1], surfaces: {} })
    .mesh,
})

test('real cut worker produces two closed halves without transferring or modifying source geometry', async () => {
  const input = request(),
    before = structuredClone(input)
  const pieces = await cutSolidInWorker(input)
  for (const mesh of pieces) {
    requireClosedSceneMesh(mesh)
    expect(sceneMeshVolume(mesh)).toBeCloseTo(4, 10)
  }
  expect(input).toEqual(before)
})

test('cut protocol rejects foreign revisions, unknown fields and unexpected materials', () => {
  const input = request(),
    pieces = splitSceneSolid(input.mesh, input.plane, input.capId)
  const reply = {
    type: 'result',
    documentId: input.documentId,
    revision: input.revision,
    pieces: pieces.map(packSceneMesh),
  }
  expect(readSolidCutRequest(input)).toEqual(input)
  expect(readSolidCutReply(reply, input).type).toBe('result')
  expect(() => readSolidCutRequest({ ...input, images: [] })).toThrow()
  expect(() => readSolidCutReply({ ...reply, revision: 4 }, input)).toThrow()
  expect(() => readSolidCutReply({ ...reply, documentId: 'another' }, input)).toThrow()
  expect(() => readSolidCutReply({ ...reply, extra: 1 }, input)).toThrow()
  const foreign = structuredClone(pieces[0])
  Object.values(foreign.faces)[0]!.materialId = 'foreign'
  expect(() =>
    readSolidCutReply(
      { ...reply, pieces: [packSceneMesh(foreign), packSceneMesh(pieces[1])] },
      input,
    ),
  ).toThrow()
})

test('cancelling a cut rejects before a late response and releases its worker once', async () => {
  const events = new EventTarget()
  let stopped = 0
  const worker: TaskWorker = {
    addEventListener: events.addEventListener.bind(events),
    removeEventListener: events.removeEventListener.bind(events),
    postMessage() {},
    terminate() {
      stopped++
    },
  }
  const controller = new AbortController(),
    pending = cutSolidInWorker(request(), controller.signal, () => worker)
  controller.abort()
  events.dispatchEvent(new MessageEvent('message', { data: null }))
  await expect(pending).rejects.toMatchObject({ name: 'AbortError' })
  expect(stopped).toBe(1)
})
