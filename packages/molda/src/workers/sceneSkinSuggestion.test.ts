import { expect, test } from 'bun:test'
import { readNormalizedSceneSkinInfluences } from '../scene/readSkin'
import { SCENE_SKIN_LIMITS } from '../scene/skin'
import { prepareSceneSkinSuggestion, suggestSceneSkinWeights } from '../scene/skinSuggestion'
import { makeSceneSkinFixture } from '../testing/sceneSkin'
import { suggestSkinInWorker } from './sceneSkinSuggestion'
import {
  readSceneSkinSuggestionReply,
  readSceneSkinSuggestionRequest,
  type SceneSkinSuggestionRequest,
  sceneSkinSuggestionReply,
} from './sceneSkinSuggestionProtocol'
import type { TaskWorker } from './workerTask'

function fixture(): SceneSkinSuggestionRequest {
  const { document } = makeSceneSkinFixture()
  return {
    sourceKey: 'document:revision:node:parameters:task',
    data: prepareSceneSkinSuggestion(document, {
      nodeId: 'part-0',
      jointIds: ['upper', 'lower'],
      method: 'segments',
    }),
  }
}

test('real suggestion worker matches exact Double results and captures request data before later caller mutations', async () => {
  const request = fixture(),
    before = structuredClone(request),
    expected = suggestSceneSkinWeights(before.data)
  expect(await suggestSkinInWorker(request)).toEqual(expected)
  expect(request).toEqual(before)
  expect(request.data.positions.byteLength).toBeGreaterThan(0)
  const pending = suggestSkinInWorker(request)
  request.sourceKey = 'changed'
  request.data.vertexIds = ['changed']
  request.data.positions.fill(999)
  request.data.joints[0]!.position[0] = 999
  expect(await pending).toEqual(expected)
})

test('suggestion requests own bounded task data and reject foreign shapes, unordered IDs, missing parents and cycles', () => {
  const request = fixture(),
    read = readSceneSkinSuggestionRequest(request)
  expect(read).toEqual(request)
  expect(read.data.positions).not.toBe(request.data.positions)
  expect(read.data.joints[0]!.position).not.toBe(request.data.joints[0]!.position)
  for (const patch of [
    { sourceKey: '' },
    { sourceKey: 'x'.repeat(513) },
    { document: {} },
    { data: null },
  ])
    expect(() => readSceneSkinSuggestionRequest({ ...request, ...patch })).toThrow()
  for (const patch of [
    { positions: Float32Array.from(request.data.positions) },
    { positions: new Float64Array(request.data.positions.length).fill(NaN) },
    { positions: request.data.positions.subarray(3) },
    { vertexIds: [] },
    { vertexIds: ['duplicate', 'duplicate'] },
    { vertexIds: Array(SCENE_SKIN_LIMITS.weightedVertices + 1).fill('point') },
    { nodeId: 'upper' },
    { method: 'unknown' },
    { images: [] },
    { joints: [] },
    { joints: [...request.data.joints].reverse() },
    { joints: request.data.joints.map((joint) => ({ ...joint, extra: true })) },
    { joints: request.data.joints.map((joint) => ({ ...joint, parentId: 'absent' })) },
    { joints: request.data.joints.map((joint) => ({ ...joint, parentId: joint.nodeId })) },
  ])
    expect(() =>
      readSceneSkinSuggestionRequest({ ...request, data: { ...request.data, ...patch } }),
    ).toThrow()
  const cycle = {
    ...request.data,
    joints: request.data.joints.map((joint, i) => ({
      ...joint,
      parentId: request.data.joints[1 - i]!.nodeId,
    })),
  }
  expect(() => readSceneSkinSuggestionRequest({ ...request, data: cycle })).toThrow('ciclo')
})

test('compact replies retain owned weights and reject changed owners, bad indices, precision loss, extra fields and invented costs', () => {
  const request = fixture(),
    result = suggestSceneSkinWeights(request.data),
    reply = sceneSkinSuggestionReply(request, result),
    parsed = readSceneSkinSuggestionReply(reply, request)
  if (parsed.type !== 'result') throw new Error('Expected weights')
  expect(parsed.result).toEqual(result)
  expect(reply.indices).toBeInstanceOf(Uint16Array)
  expect(reply.weights).toBeInstanceOf(Float64Array)
  const invalidRows = [
    { sourceKey: 'late' },
    { nodeId: 'other' },
    { positions: request.data.positions },
    { segments: 999 },
    { indices: new Uint16Array(reply.indices.length).fill(256) },
    { indices: Uint32Array.from(reply.indices) },
    { weights: Float32Array.from(reply.weights) },
    { weights: reply.weights.slice(2) },
    { weights: new Float64Array(reply.weights.length).fill(NaN) },
    { weights: new Float64Array(reply.weights.length).fill(0.25) },
  ]
  for (const patch of invalidRows)
    expect(() => readSceneSkinSuggestionReply({ ...reply, ...patch }, request)).toThrow()
  const indices = reply.indices.slice(),
    weights = reply.weights.slice()
  indices[0] = 0
  indices[1] = 0
  weights[0] = 0.5
  weights[1] = 0.5
  expect(() => readSceneSkinSuggestionReply({ ...reply, indices, weights }, request)).toThrow(
    'duas vezes',
  )
  indices[1] = 1
  weights[0] = 1
  weights[1] = 1e-100
  expect(() => readSceneSkinSuggestionReply({ ...reply, indices, weights }, request)).toThrow(
    'precisão',
  )
  weights[1] = 0
  expect(() => readSceneSkinSuggestionReply({ ...reply, indices, weights }, request)).toThrow(
    'espaço vazio',
  )
  reply.weights.fill(0)
  expect(parsed.result).toEqual(result)
  expect(
    readSceneSkinSuggestionReply(
      {
        type: 'error',
        sourceKey: request.sourceKey,
        nodeId: request.data.nodeId,
        message: 'Problema',
      },
      request,
    ),
  ).toEqual({ type: 'error', message: 'Problema' })
})

test('compact row validation agrees with the canonical reader at Double sum boundaries and preserves prototype-like keys', () => {
  const request = fixture()
  request.data.vertexIds = ['__proto__']
  request.data.positions = request.data.positions.slice(0, 3)
  const reply = sceneSkinSuggestionReply(request, suggestSceneSkinWeights(request.data))
  for (const first of [1, 0.5, 1 / 3, 1e-30, 1 - 1e-8, 1 - 2e-8]) {
    for (const second of [0, 1 - first, Math.max(0, 1 - first + 5e-9)]) {
      for (const duplicate of [false, true]) {
        const indices = new Uint16Array([0, second === 0 || duplicate ? 0 : 1]),
          weights = new Float64Array([first, second]),
          influences = Array.from(weights.entries())
            .filter(([, weight]) => weight > 0)
            .map(([slot, weight]) => ({
              jointId: request.data.joints[indices[slot]!]!.nodeId,
              weight,
            }))
        if (second > 1) {
          // The transport rejects an out-of-range slot before the canonical row checks.
          expect(() =>
            readSceneSkinSuggestionReply({ ...reply, indices, weights }, request),
          ).toThrow('Número inválido.')
          continue
        }
        let expected: ReturnType<typeof readNormalizedSceneSkinInfluences>
        try {
          expected = readNormalizedSceneSkinInfluences(influences, 'weights.__proto__')
        } catch (error) {
          expect(() =>
            readSceneSkinSuggestionReply({ ...reply, indices, weights }, request),
          ).toThrow(error as Error)
          continue
        }
        const parsed = readSceneSkinSuggestionReply({ ...reply, indices, weights }, request)
        if (parsed.type !== 'result') throw new Error('Expected weights')
        expect(Object.hasOwn(parsed.result.weights, '__proto__')).toBe(true)
        expect(parsed.result.weights.__proto__).toEqual(expected)
        weights.fill(0)
        expect(parsed.result.weights.__proto__).toEqual(expected)
      }
    }
  }
})

test('cancellation terminates work, ignores late replies and never detaches caller buffers', async () => {
  const request = fixture(),
    before = structuredClone(request),
    events = new EventTarget(),
    controller = new AbortController()
  let terminated = 0,
    posted: unknown
  const worker: TaskWorker = {
    addEventListener: events.addEventListener.bind(events),
    removeEventListener: events.removeEventListener.bind(events),
    postMessage: (...args: unknown[]) => {
      expect(args).toHaveLength(1)
      posted = args[0]
    },
    terminate: () => {
      terminated++
    },
  }
  const pending = suggestSkinInWorker(request, controller.signal, () => worker)
  expect(posted).toEqual(request)
  expect(posted).not.toBe(request)
  controller.abort()
  events.dispatchEvent(
    new MessageEvent('message', {
      data: sceneSkinSuggestionReply(request, suggestSceneSkinWeights(request.data)),
    }),
  )
  await expect(pending).rejects.toMatchObject({ name: 'AbortError' })
  expect(terminated).toBe(1)
  let created = false
  await expect(
    suggestSkinInWorker(request, controller.signal, () => {
      created = true
      return worker
    }),
  ).rejects.toMatchObject({ name: 'AbortError' })
  expect(created).toBe(false)
  expect(request).toEqual(before)
})

test('real worker precision failures surface as recoverable domain errors and do not modify task data', async () => {
  const request = fixture(),
    first = request.data.joints[0]!
  request.data.positions[0] = Number.MAX_VALUE
  first.position[0] = -Number.MAX_VALUE
  const before = structuredClone(request)
  await expect(suggestSkinInWorker(request)).rejects.toMatchObject({ name: 'SceneValidationError' })
  expect(request).toEqual(before)
})
