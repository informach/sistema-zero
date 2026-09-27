import { expect, test } from 'bun:test'
import { meshEdgeKey } from '../scene/meshTopology'
import { autoMeshUv } from '../scene/meshUvAuto'
import { unfoldMeshUv } from '../scene/meshUvUnfold'
import { makeSceneGridGeometry } from '../testing/sceneFixtures'
import { autoUvInWorker } from './sceneUv'
import {
  readSceneUvReply,
  readSceneUvRequest,
  type SceneUvRequest,
  sceneUvReply,
} from './sceneUvProtocol'
import type { TaskWorker } from './workerTask'

function fixture(): SceneUvRequest {
  const mesh = makeSceneGridGeometry(3)
  return {
    sourceKey: JSON.stringify(['creation', 9, 'body']),
    mesh,
    faceIds: ['f_0_0', 'f_1_1', 'f_2_2'],
    padding: 0.0123456789123,
  }
}
test('real UV worker returns exact doubles only for the selected corners and keeps live geometry attached', async () => {
  const request = fixture(),
    before = structuredClone(request)
  const result = await autoUvInWorker(request)
  expect(result).toEqual(autoMeshUv(request.mesh, request.faceIds, request.padding))
  expect(result.vertices).toBe(request.mesh.vertices)
  expect(result.looseEdges).toBe(request.mesh.looseEdges)
  expect(result.faces.f_0_1).toBe(request.mesh.faces.f_0_1)
  expect(request).toEqual(before)
})
test('UV protocol owns result corners and rejects foreign tokens, Float32, invalid numbers and geometry writes', () => {
  const request = fixture(),
    parsed = readSceneUvRequest(request)
  expect(parsed).toEqual(request)
  expect(parsed.mesh.vertices).not.toBe(request.mesh.vertices)
  expect(parsed.faceIds).not.toBe(request.faceIds)
  for (const patch of [
    { extra: true },
    { sourceKey: '' },
    { sourceKey: 'x'.repeat(513) },
    { padding: NaN },
    { faceIds: [] },
    { faceIds: ['missing'] },
    { faceIds: ['f_0_0', 'f_0_0'] },
  ])
    expect(() => readSceneUvRequest({ ...request, ...patch })).toThrow()
  const result = autoMeshUv(request.mesh, request.faceIds, request.padding)
  const reply = sceneUvReply(request, result)
  expect(reply.uv).toBeInstanceOf(Float64Array)
  const read = readSceneUvReply(reply, request)
  if (read.type !== 'result') throw new Error('Missing result')
  expect(read.result).toEqual(result)
  for (const patch of [
    { sourceKey: 'new-revision' },
    { geometryId: 'other' },
    { vertices: request.mesh.vertices },
    { uv: Float32Array.from(reply.uv) },
    { uv: reply.uv.slice(2) },
    { uv: new Float64Array(reply.uv.length).fill(NaN) },
    { uv: new Float64Array(reply.uv.length).fill(1.1) },
  ])
    expect(() => readSceneUvReply({ ...reply, ...patch }, request)).toThrow()
  reply.uv.fill(0)
  expect(read.result).toEqual(result)
})
test('UV cancellation terminates its worker and ignores late replies without transferring authorial data', async () => {
  const request = fixture(),
    events = new EventTarget()
  let terminated = 0
  const worker: TaskWorker = {
    addEventListener: events.addEventListener.bind(events),
    removeEventListener: events.removeEventListener.bind(events),
    postMessage: (...args: unknown[]) => {
      expect(args).toEqual([request])
    },
    terminate: () => {
      terminated++
    },
  }
  const controller = new AbortController()
  const pending = autoUvInWorker(request, controller.signal, () => worker)
  controller.abort()
  events.dispatchEvent(new MessageEvent('message', { data: null }))
  await expect(pending).rejects.toMatchObject({ name: 'AbortError' })
  expect(terminated).toBe(1)
})

test('real connected-UV worker owns cut instructions and matches the canonical unfolding result', async () => {
  const base = fixture()
  const key = meshEdgeKey('v_1_0', 'v_1_1')
  for (const cuts of [[], [key]]) {
    const request = { ...base, faceIds: ['f_0_0', 'f_1_0', 'f_0_1', 'f_1_1'], unfold: { cuts } }
    const before = structuredClone(request),
      parsed = readSceneUvRequest(request)
    expect(parsed).toEqual(request)
    expect(parsed.unfold).not.toBe(request.unfold)
    expect(parsed.unfold!.cuts).not.toBe(cuts)
    const result = await autoUvInWorker(request)
    expect(result).toEqual(unfoldMeshUv(request.mesh, request.faceIds, request.padding, cuts))
    expect(result.vertices).toBe(request.mesh.vertices)
    expect(result.faces.f_2_2).toBe(request.mesh.faces.f_2_2)
    expect(request).toEqual(before)
  }
  for (const unfold of [
    null,
    {},
    { cuts: 'not a list' },
    { cuts: [3] },
    { cuts: ['x'.repeat(513)] },
    { cuts: [], extra: true },
    { cuts: [key, key] },
    { cuts: [], preserveCuts: 'true' },
  ])
    expect(() => readSceneUvRequest({ ...base, unfold })).toThrow()
  await expect(autoUvInWorker({ ...base, unfold: { cuts: ['missing'] } })).rejects.toMatchObject({
    name: 'SceneValidationError',
  })
  const preserved = {
    ...base,
    faceIds: ['f_0_0', 'f_1_0', 'f_0_1', 'f_1_1'],
    unfold: { cuts: [], preserveCuts: true },
  }
  expect(readSceneUvRequest(preserved)).toEqual(preserved)
  expect(await autoUvInWorker(preserved)).toEqual(
    autoMeshUv(preserved.mesh, preserved.faceIds, preserved.padding),
  )
})
