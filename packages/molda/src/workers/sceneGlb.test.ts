import { expect, test } from 'bun:test'
import { encodeSceneGlb } from '../export/sceneGlb'
import type { SceneGlbIssue } from '../export/sceneGlbReport'
import { SCENE_LIMITS } from '../scene/limits'
import { createSceneSkin } from '../scene/skinCommands'
import { readGlb } from '../testing/glbRead'
import { expectValidGlb } from '../testing/gltfValidation'
import { animatedScene } from '../testing/sceneAnimation'
import { makeSceneSkinFixture } from '../testing/sceneSkin'
import { prepareSceneGlbInWorker } from './sceneGlb'
import {
  MAX_SCENE_GLB_ISSUES,
  readSceneGlbReply,
  readSceneGlbRequest,
  type SceneGlbRequest,
  sceneGlbReply,
} from './sceneGlbProtocol'
import { readSceneGlbWireRequest } from './sceneGlbRequest'
import type { TaskWorker } from './workerTask'

function fixture(): SceneGlbRequest {
  const document = animatedScene()
  return { document, documentId: document.id, revision: 7 }
}
test('real GLB worker returns identical bytes, stats and loss report without detaching or mutating source pixels', async () => {
  const request = fixture(),
    before = structuredClone(request)
  request.document.nodes[1]!.hidden = true
  before.document.nodes[1]!.hidden = true
  const progress: string[] = []
  const result = await prepareSceneGlbInWorker(request, {
    onProgress: (value) => {
      progress.push(value)
    },
  })
  expect(progress).toEqual(['validating', 'encoding'])
  expect(result).toEqual(encodeSceneGlb(request.document, { allowLosses: true }))
  expect(result.issues).toEqual([{ code: 'hidden-node', sourceId: 'wing' }])
  expect(request).toEqual(before)
  expect(request.document.images[0]!.layers[0]!.pixels.byteLength > 0).toBe(true)
  expect(result.bytes.buffer instanceof ArrayBuffer).toBe(true)
})
test('GLB request strictly reads and owns the native document; rejects unsupported, foreign and malformed requests', async () => {
  const request = fixture(),
    parsed = readSceneGlbRequest(request)
  expect(parsed).toEqual(request)
  expect(parsed.document.images[0]!.layers[0]!.pixels).not.toBe(
    request.document.images[0]!.layers[0]!.pixels,
  )
  for (const patch of [
    { extra: true },
    { revision: -1 },
    { revision: 0.1 },
    { documentId: 'another' },
    { document: { ...request.document, formatVersion: 999 } },
    { document: { ...request.document, nodes: [] } },
  ])
    expect(() => readSceneGlbRequest({ ...request, ...patch })).toThrow()
  await expect(prepareSceneGlbInWorker({ ...request, documentId: 'another' })).rejects.toThrow(
    'Essa',
  )
})
test('GLB reply validates ownership, finite bounded stats, all report variants and transferred container without recopying bytes', () => {
  const request = fixture(),
    result = encodeSceneGlb(request.document)
  const issues: SceneGlbIssue[] = [
    { code: 'hidden-node', sourceId: 'wing' },
    { code: 'face-omitted', sourceId: 'geometry', faceId: 'face', reason: 'precision' },
    { code: 'loose-geometry', sourceId: 'geometry', edges: 2, vertices: 1 },
    { code: 'flipbook-first-frame', sourceId: 'image' },
    { code: 'runtime-tangent-space', sourceId: 'material' },
    {
      code: 'animation-resampled',
      sourceId: 'clip',
      nodeId: 'body',
      channel: 'rotation',
      samples: 40,
    },
    { code: 'clip-omitted', sourceId: 'empty', reason: 'empty' },
    { code: 'skin-dependency', sourceId: 'bone' },
    { code: 'skin-precision', sourceId: 'skin' },
    { code: 'skin-zero-slots', sourceId: 'skin' },
    { code: 'skin-render-space', sourceId: 'skin' },
    { code: 'bend-limit-omitted', sourceId: 'bone' },
  ]
  const reply = sceneGlbReply(request, { ...result, issues }),
    parsed = readSceneGlbReply(reply, request)
  expect(Object.hasOwn(reply, 'document')).toBe(false)
  if (parsed.type !== 'result') throw new Error('Missing result')
  expect(parsed.result).toEqual(reply.result)
  expect(parsed.result.bytes.buffer).toBe(result.bytes.buffer)
  expect(parsed.result.issues).not.toBe(issues)
  for (const patch of [
    { revision: 8 },
    { documentId: 'another' },
    { extra: true },
    { type: 'unknown' },
    { result: { ...result, extra: true } },
    { result: { ...result, issues: Array(MAX_SCENE_GLB_ISSUES + 1).fill(issues[0]) } },
    { result: { ...result, issues: [{ ...issues[1], reason: 'unsupported' }] } },
    { result: { ...result, issues: [{ ...issues[0], extra: true }] } },
    { result: { ...result, stats: { ...result.stats, triangles: SCENE_LIMITS.triangles + 1 } } },
    { result: { ...result, stats: { ...result.stats, animationKeys: NaN } } },
    { result: { ...result, stats: { ...result.stats, drawCalls: 0.5 } } },
    { result: { ...result, stats: { ...result.stats, clips: undefined } } },
    { result: { ...result, stats: { ...result.stats, bones: undefined } } },
    { result: { ...result, stats: { ...result.stats, bones: 16385 } } },
  ])
    expect(() => readSceneGlbReply({ ...reply, ...patch }, request)).toThrow()
  for (const [offset, value] of [
    [0, 0],
    [4, 3],
    [8, 4],
    [12, 3],
    [12, result.bytes.byteLength],
    [16, 0],
  ]) {
    const bytes = Uint8Array.from(result.bytes)
    new DataView(bytes.buffer).setUint32(offset!, value!, true)
    expect(() => readSceneGlbReply(sceneGlbReply(request, { ...result, bytes }), request)).toThrow()
  }
  const bytes = Uint8Array.from(result.bytes),
    data = new DataView(bytes.buffer)
  data.setUint32(20 + data.getUint32(12, true), 0, true)
  expect(() => readSceneGlbReply(sceneGlbReply(request, { ...result, bytes }), request)).toThrow()
  const padded = new Uint8Array(result.bytes.byteLength + 4)
  padded.set(result.bytes)
  expect(() =>
    readSceneGlbReply(
      sceneGlbReply(request, { ...result, bytes: padded.subarray(0, result.bytes.byteLength) }),
      request,
    ),
  ).toThrow()
  expect(() =>
    readSceneGlbReply(
      { ...request, document: undefined, type: 'progress', progress: 'encoding' },
      request,
    ),
  ).toThrow()
})

test('real skin GLB worker keeps original inverse binds and weights owned and emits the same portable skeleton and report', async () => {
  const {
      document: base,
      input: { id, ...input },
    } = makeSceneSkinFixture(),
    document = createSceneSkin(base, input, () => id),
    request = { document, documentId: document.id, revision: 5 }
  document.nodes.find((node) => node.id === 'lower')!.hidden = true
  document.mirrors = [
    { id: 'mirror', name: 'Espelho', sourceId: input.nodeId, axis: 'x', offset: 1 },
  ]
  const before = structuredClone(request),
    read = readSceneGlbRequest(request)
  expect(read.document.skins![0]!.weights).not.toBe(document.skins![0]!.weights)
  expect(read.document.skins![0]!.joints[0]!.inverseBindMatrix).not.toBe(
    document.skins![0]!.joints[0]!.inverseBindMatrix,
  )
  const result = await prepareSceneGlbInWorker(request)
  expect(result).toEqual(encodeSceneGlb(document, { allowLosses: true }))
  await expectValidGlb(result.bytes, Array(2).fill('NODE_SKINNED_MESH_NON_ROOT'))
  expect(readGlb(result.bytes).json.skins).toHaveLength(2)
  expect(request).toEqual(before)
  for (const code of [
    'skin-dependency',
    'skin-precision',
    'skin-zero-slots',
    'skin-render-space',
  ] as const)
    expect(() =>
      readSceneGlbReply(
        {
          ...sceneGlbReply(request, result),
          result: { ...result, issues: [{ code, sourceId: 'skin', extra: true }] },
        },
        request,
      ),
    ).toThrow()
})
test('clip manifests are bounded, exact, detached metadata with unique identities and exported names', async () => {
  const request = fixture(),
    first = request.document.animations![0]!
  request.document.animations!.push({ ...first, id: 'copy' })
  const result = await prepareSceneGlbInWorker(request)
  expect(result.clips.map((clip) => clip.name)).toEqual([first.name, `${first.name} (2)`])
  expect(result.issues).toEqual([
    { code: 'clip-renamed', sourceId: 'copy', originalName: first.name, name: `${first.name} (2)` },
  ])
  expect(result.clips[0]).not.toBe(first)
  const reply = sceneGlbReply(request, result),
    clip = result.clips[0]!
  for (const clips of [
    undefined,
    [],
    [clip],
    [clip, clip],
    [clip, { ...result.clips[1], name: clip.name }],
    [clip, { ...result.clips[1], extra: true }],
    [clip, { ...result.clips[1], duration: Infinity }],
    [clip, { ...result.clips[1], duration: 0 }],
    [clip, { ...result.clips[1], fps: 0 }],
    [clip, { ...result.clips[1], fps: 24.5 }],
    [clip, { ...result.clips[1], loop: 'true' }],
    [clip, { ...result.clips[1], name: 'x'.repeat(129) }],
    Array(65).fill(clip),
  ])
    expect(() => {
      readSceneGlbReply({ ...reply, result: { ...result, clips } }, request)
    }).toThrow()
  for (const patch of [
    { extra: true },
    { name: first.name },
    { originalName: 1 },
    { name: 'x'.repeat(129) },
  ])
    expect(() => {
      readSceneGlbReply(
        { ...reply, result: { ...result, issues: [{ ...result.issues[0], ...patch }] } },
        request,
      )
    }).toThrow()
})

test('GLB protocol accepts only known progress and bounded error messages', () => {
  const { documentId, revision } = fixture(),
    token = { documentId, revision }
  expect(readSceneGlbReply({ ...token, type: 'progress', progress: 'encoding' }, token)).toEqual({
    type: 'progress',
    progress: 'encoding',
  })
  expect(
    readSceneGlbReply({ ...token, type: 'error', message: 'Confira o projeto.' }, token),
  ).toEqual({ type: 'error', message: 'Confira o projeto.' })
  for (const patch of [
    { type: 'progress', progress: 'done' },
    { type: 'error', message: 'x'.repeat(513) },
    { type: 'error', message: '' },
    { type: 'progress', progress: 'encoding', extra: true },
  ])
    expect(() => readSceneGlbReply({ ...token, ...patch }, token)).toThrow()
})
test('GLB cancellation terminates CPU work once, ignores late output, never transfers live document buffers', async () => {
  const events = new EventTarget(),
    request = fixture()
  let terminated = 0
  const worker: TaskWorker = {
    addEventListener: events.addEventListener.bind(events),
    removeEventListener: events.removeEventListener.bind(events),
    postMessage: (...args: unknown[]) => {
      expect(args.length).toBe(1)
      expect(readSceneGlbWireRequest(args[0])).toEqual(request)
    },
    terminate: () => {
      terminated++
    },
  }
  const controller = new AbortController()
  const pending = prepareSceneGlbInWorker(request, {
    signal: controller.signal,
    createWorker: () => worker,
  })
  controller.abort()
  events.dispatchEvent(
    new MessageEvent('message', { data: sceneGlbReply(request, encodeSceneGlb(request.document)) }),
  )
  await expect(pending).rejects.toMatchObject({ name: 'AbortError' })
  expect(terminated).toBe(1)
})
