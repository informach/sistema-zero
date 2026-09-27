import { expect, test } from 'bun:test'
import { GlbBinary } from '../export/GlbBinary'
import { encodeGlbContainer } from '../export/glbContainer'
import { encodePng } from '../export/png'
import { encodeSceneGlb } from '../export/sceneGlb'
import { gltfConversionCosts } from '../import/gltfConversionCosts'
import {
  GLTF_CONVERSION_REPORT_LIMITS,
  type GltfConversionIssue,
  gltfConversionReport,
} from '../import/gltfConversionReport'
import { readGltfDocument } from '../import/gltfDocument'
import { GLTF_INPUT_LIMITS, GltfInputError } from '../import/gltfInput'
import { convertGltfDocument } from '../import/gltfNativeDocument'
import { selectGltfDocument } from '../import/gltfSelection'
import { readSceneDocument } from '../scene/readDocument'
import { makeGltfJointMeshFixture } from '../testing/gltfJointMesh'
import { makeSceneGlbFixture } from '../testing/sceneGlbFixture'
import { prepareGltfImportInWorker } from './gltfImport'
import { type GltfImportResult, gltfImportReply, readGltfImportReply } from './gltfImportProtocol'
import {
  type GltfImportRequest,
  MAX_GLTF_IMPORT_WIRE_BYTES,
  readGltfImportRequest,
} from './gltfImportRequest'
import { WORKER_LOADED_MESSAGE } from './workerHandshake'
import type { TaskWorker } from './workerTask'

const json = (value: Record<string, unknown>) => new TextEncoder().encode(JSON.stringify(value))
function request(
  bytes = encodeSceneGlb(makeSceneGlbFixture(2, 2, 3, 2), { allowLosses: true }).bytes,
): GltfImportRequest {
  return {
    documentId: 'import-target',
    revision: 7,
    requestId: 2,
    bytes,
    files: [],
    entryPath: 'model.glb',
    sceneIndex: 0,
    identity: { id: 'import-target', name: 'Importado', createdAt: 1, updatedAt: 2 },
    options: {},
  }
}
function direct(input: GltfImportRequest): Extract<GltfImportResult, { status: 'ready' }> {
  const read = readGltfDocument(input.bytes, input.files, input.entryPath)
  if (read.status !== 'ready' || input.sceneIndex === 'inspect')
    throw new Error('Expected convertible source')
  return {
    status: 'ready',
    ...convertGltfDocument(read.document, input.sceneIndex, input.identity, input.options),
  }
}
class ControlledWorker extends EventTarget implements TaskWorker {
  requests: unknown[] = []
  stopped = 0
  failPosting = false
  postMessage(value: unknown) {
    if (this.failPosting) throw new Error('clone failed')
    this.requests.push(structuredClone(value))
  }
  terminate() {
    this.stopped++
  }
  reply(value: unknown) {
    this.dispatchEvent(new MessageEvent('message', { data: value }))
  }
}

test('real import worker returns the exact native document/report and keeps all source bytes owned', async () => {
  const input = request(),
    before = structuredClone(input),
    progress: string[] = [],
    result = await prepareGltfImportInWorker(input, { onProgress: (value) => progress.push(value) })
  expect(progress).toEqual(['validating', 'reading', 'converting'])
  expect(result).toEqual(direct(input))
  expect(input).toEqual(before)
  if (result.status !== 'ready') throw new Error('Expected prepared review')
  expect(result.report.review).toBe('required')
  expect(result.document.images[0]!.layers[0]!.pixels.buffer).toBeInstanceOf(ArrayBuffer)
  expect(readSceneDocument(result.document).status).toBe('valid')
  result.document.images[0]!.layers[0]!.pixels.fill(99)
  expect(input.bytes).toEqual(before.bytes)
  const skin = request(makeGltfJointMeshFixture())
  expect(await prepareGltfImportInWorker(skin)).toEqual(direct(skin))
})

test('real worker preserves MASK factor/cutoff and RGB under zero alpha through staged adoption', async () => {
  const source = makeSceneGlbFixture(1, 1, 2, 2)
  source.materials[0]!.baseColor = { kind: 'rgba', value: [0, 0, 0, 0] }
  source.materials[0]!.alphaMask = { cutoff: 0, opacity: 0.37123456789 }
  source.images[0]!.layers[0]!.pixels.set([193, 47, 91, 0])
  const input = request(encodeSceneGlb(source, { allowLosses: true }).bytes)
  const before = structuredClone(input)
  const result = await prepareGltfImportInWorker(input)
  expect(result).toEqual(direct(input))
  if (result.status !== 'ready') throw new Error('Expected MASK review')
  expect(result.document.materials[0]!.alphaMask).toEqual(source.materials[0]!.alphaMask)
  expect(result.document.images[0]!.layers[0]!.pixels).toEqual(source.images[0]!.layers[0]!.pixels)
  expect(result.report.review).toBe('required')
  expect(readSceneDocument(result.document).status).toBe('valid')
  expect(input).toEqual(before)
})

test('real worker returns all missing paths, then inspection and explicit empty-scene conversion from local companions', async () => {
  const input = {
      ...request(
        json({
          asset: { version: '2.0' },
          buffers: [{ byteLength: 4, uri: 'mesh.bin' }],
          images: [{ uri: 'paint.png' }],
          nodes: [{ name: 'Apoio' }],
          scenes: [{ name: 'Primeira', nodes: [0] }, { name: 'Vazia' }],
          scene: 0,
        }),
      ),
      entryPath: 'fox/model.gltf',
      sceneIndex: 'inspect' as const,
    },
    missing = await prepareGltfImportInWorker(input)
  expect(missing).toEqual({ status: 'missing', paths: ['fox/mesh.bin', 'fox/paint.png'] })
  const supplied = {
      ...input,
      files: [
        { path: 'fox/mesh.bin', bytes: new Uint8Array([1, 2, 3, 4]) },
        { path: 'fox/paint.png', bytes: encodePng(new Uint8Array([10, 20, 30, 255]), 1, 1) },
      ],
    },
    before = structuredClone(supplied),
    result = await prepareGltfImportInWorker(supplied)
  expect(result).toEqual({
    status: 'inspect',
    source: {
      format: 'gltf',
      defaultScene: 0,
      scenes: [
        { index: 0, name: 'Primeira', roots: 1 },
        { index: 1, name: 'Vazia', roots: 0 },
      ],
      nodes: 1,
      meshes: 0,
      skins: 0,
      animations: 0,
      unhandledExtensions: [],
    },
  })
  const converted = await prepareGltfImportInWorker({ ...supplied, requestId: 3, sceneIndex: 1 })
  expect(converted.status).toBe('ready')
  if (converted.status !== 'ready') throw new Error('Expected empty selected scene')
  expect(converted.document.nodes).toEqual([])
  expect(converted.report.source).toMatchObject({
    omittedNodes: 1,
    omittedScenes: 1,
    sceneIndex: 1,
  })
  expect(supplied).toEqual(before)
})

test('real worker preserves structured unsupported/invalid failures and can be stopped while reading', async () => {
  for (const [bytes, reason, path] of [
    [
      json({
        asset: { version: '2.0' },
        extensionsUsed: ['REQUIRED'],
        extensionsRequired: ['REQUIRED'],
      }),
      'unsupported',
      'extensionsRequired[0]',
    ],
    [
      json({ asset: { version: '2.0' }, nodes: [{}], scenes: [{ nodes: [0] }] }),
      'invalid',
      'scene',
    ],
  ] as const)
    await expect(
      prepareGltfImportInWorker({ ...request(bytes), sceneIndex: null }),
    ).rejects.toMatchObject({ name: 'GltfInputError', reason, path })
  const controller = new AbortController(),
    progress: string[] = []
  let stopped = 0
  await expect(
    prepareGltfImportInWorker(request(), {
      signal: controller.signal,
      onProgress: (value) => {
        progress.push(value)
        if (value === 'reading') controller.abort()
      },
      createWorker: () => {
        const worker = new Worker(new URL('./gltfImport.worker.ts', import.meta.url), {
          type: 'module',
        })
        return {
          postMessage: worker.postMessage.bind(worker),
          addEventListener: worker.addEventListener.bind(worker),
          removeEventListener: worker.removeEventListener.bind(worker),
          terminate: () => {
            stopped++
            worker.terminate()
          },
        }
      },
    }),
  ).rejects.toMatchObject({ name: 'AbortError' })
  expect(progress).toEqual(['validating', 'reading'])
  expect(stopped).toBe(1)
})

test('request boundary owns byte ranges and metadata; rejects malformed or excessive bundles before construction', async () => {
  const base = request(),
    backing = new Uint8Array(base.bytes.length + 512)
  backing.set(base.bytes, 256)
  const input = { ...base, bytes: backing.subarray(256, 256 + base.bytes.length) },
    snapshot = readGltfImportRequest(input, true)
  expect(snapshot.bytes).toEqual(base.bytes)
  expect(snapshot.bytes.byteOffset).toBe(0)
  expect(snapshot.bytes.buffer.byteLength).toBe(base.bytes.length)
  expect(snapshot.bytes.buffer).not.toBe(backing.buffer)
  snapshot.options.animations!.fps = 12
  snapshot.identity.name = 'Owned'
  expect(input.options).toEqual({})
  expect(input.identity.name).toBe('Importado')
  for (const patch of [
    { extra: true },
    { revision: -1 },
    { requestId: 0.5 },
    { documentId: 'another' },
    { sceneIndex: undefined },
    { sceneIndex: 1024 },
    { options: { animations: { fps: 1.5 } } },
    { options: { animations: null } },
    { options: { skinWeights: null } },
    { identity: { ...base.identity, name: 'x'.repeat(49) } },
    { bytes: new Uint8Array(new SharedArrayBuffer(4)) },
    {
      files: [
        { path: 'same', bytes: new Uint8Array(1) },
        { path: './same', bytes: new Uint8Array(1) },
      ],
    },
    { files: Array(1025).fill({ path: 'file', bytes: new Uint8Array(1) }) },
  ])
    expect(() => readGltfImportRequest({ ...base, ...patch }, true)).toThrow()
  const huge = new Uint8Array(GLTF_INPUT_LIMITS.fileBytes),
    exact = { ...base, bytes: huge, files: [{ path: 'other', bytes: huge }] }
  expect(readGltfImportRequest(exact).bytes.length * 2).toBe(MAX_GLTF_IMPORT_WIRE_BYTES)
  let created = 0
  await expect(
    prepareGltfImportInWorker(
      { ...exact, files: [...exact.files, { path: 'one', bytes: new Uint8Array(1) }] },
      {
        createWorker: () => {
          created++
          return new ControlledWorker()
        },
      },
    ),
  ).rejects.toMatchObject({ reason: 'budget', path: 'files[1].bytes' })
  expect(created).toBe(0)
})

test('captured tokens survive caller mutation and reject foreign jobs; cancellation ignores late success', async () => {
  const input = request(),
    expected = structuredClone(input),
    worker = new ControlledWorker(),
    promise = prepareGltfImportInWorker(input, {
      createWorker: () => {
        input.requestId = 99
        input.identity.name = 'Changed'
        input.bytes.fill(0)
        return worker
      },
    })
  worker.reply(gltfImportReply(expected, direct(expected)))
  expect(await promise).toEqual(direct(expected))
  expect(worker.stopped).toBe(1)
  expect((worker.requests[0] as GltfImportRequest).bytes).toEqual(expected.bytes)
  for (const patch of [{ documentId: 'another' }, { revision: 8 }, { requestId: 3 }]) {
    const controlled = new ControlledWorker(),
      task = prepareGltfImportInWorker(expected, { createWorker: () => controlled })
    controlled.reply({ ...gltfImportReply(expected, direct(expected)), ...patch })
    await expect(task).rejects.toThrow('outra')
    expect(controlled.stopped).toBe(1)
  }
  const controller = new AbortController(),
    controlled = new ControlledWorker(),
    task = prepareGltfImportInWorker(expected, {
      signal: controller.signal,
      createWorker: () => controlled,
    })
  controller.abort()
  controlled.reply(gltfImportReply(expected, direct(expected)))
  await expect(task).rejects.toMatchObject({ name: 'AbortError' })
  expect(controlled.stopped).toBe(1)
})

test('pre-abort, posting failure, unreadable replies and failing progress consumers release their worker', async () => {
  const controller = new AbortController()
  controller.abort()
  let created = 0
  const input = request()
  Object.defineProperty(input, 'files', {
    get(): never {
      throw new Error('Do not preflight aborted tasks')
    },
  })
  await expect(
    prepareGltfImportInWorker(input, {
      signal: controller.signal,
      createWorker: () => {
        created++
        return new ControlledWorker()
      },
    }),
  ).rejects.toMatchObject({ name: 'AbortError' })
  expect(created).toBe(0)
  for (const kind of ['post', 'messageerror', 'error', 'callback'] as const) {
    const controlled = new ControlledWorker(),
      input = request()
    controlled.failPosting = kind === 'post'
    const promise = prepareGltfImportInWorker(input, {
      createWorker: () => controlled,
      onProgress: () => {
        throw new Error('consumer failed')
      },
    })
    if (kind === 'messageerror') controlled.dispatchEvent(new MessageEvent('messageerror'))
    if (kind === 'error')
      controlled.dispatchEvent(new ErrorEvent('error', { message: 'worker crash' }))
    if (kind === 'callback')
      controlled.reply({
        documentId: input.documentId,
        revision: input.revision,
        requestId: input.requestId,
        type: 'progress',
        progress: 'reading',
      })
    await expect(promise).rejects.toBeInstanceOf(Error)
    if (kind === 'post') {
      // Nothing came back yet: the stop waits for the hello instead of racing a loading module.
      expect(controlled.stopped).toBe(0)
      controlled.reply(WORKER_LOADED_MESSAGE)
    }
    expect(controlled.stopped).toBe(1)
  }
})

test('reply parser checks identity, domain, scene, every cost and non-approval instead of trusting typed transport', () => {
  const input = request(),
    result = direct(input),
    reply = gltfImportReply(input, result)
  expect(readGltfImportReply(reply, input)).toEqual({ type: 'result', result })
  for (const patch of [
    { extra: true },
    { type: 'unknown' },
    { result: { ...result, extra: true } },
    { result: { ...result, document: { ...result.document, id: 'another' } } },
    { result: { ...result, document: { ...result.document, name: 'Renamed' } } },
    { result: { ...result, document: { ...result.document, formatVersion: 999 } } },
    { result: { ...result, document: { ...result.document, nodes: [] } } },
    { result: { ...result, report: { ...result.report, review: 'accepted' } } },
    {
      result: {
        ...result,
        report: { ...result.report, source: { ...result.report.source, sceneIndex: null } },
      },
    },
    {
      result: {
        ...result,
        report: {
          ...result.report,
          source: { ...result.report.source, auxiliaryMetadata: 'stored' },
        },
      },
    },
  ])
    expect(() => readGltfImportReply({ ...reply, ...patch }, input)).toThrow()
  for (const [key, value] of Object.entries(result.report.costs))
    expect(() =>
      readGltfImportReply(
        gltfImportReply(input, {
          ...result,
          report: { ...result.report, costs: { ...result.report.costs, [key]: value + 1 } },
        }),
        input,
      ),
    ).toThrow('custo')
  for (const paths of [[], ['same', 'same'], ['../escape'], ['x'.repeat(4097)]])
    expect(() =>
      readGltfImportReply(gltfImportReply(input, { status: 'missing', paths }), input),
    ).toThrow()
  expect(() => readGltfImportReply(reply, { ...input, sceneIndex: 'inspect' })).toThrow('escolhida')
  const raw = structuredClone(reply),
    parsed = readGltfImportReply(raw, input)
  if (parsed.type !== 'result' || parsed.result.status !== 'ready')
    throw new Error('Expected owned result')
  raw.result.document.images[0]!.layers[0]!.pixels.fill(0)
  raw.result.report.issues.length = 0
  expect(parsed.result.document.images[0]!.layers[0]!.pixels.some(Boolean)).toBe(true)
  expect(parsed.result.report.issues.length).toBeGreaterThan(0)
})

test('diagnostic transport roundtrips every stage/code, bounds lists and rejects unrelated fields or dangling targets', () => {
  const input = request(makeGltfJointMeshFixture()),
    result = direct(input),
    doc = result.document,
    geometryId = doc.geometries[0]!.id,
    nodeId = doc.nodes[0]!.id,
    bindingId = doc.skins![0]!.id,
    clipId = doc.animations![0]!.id,
    targetId = doc.materials[0]!.id,
    path = 'source.field',
    issues: GltfConversionIssue[] = [
      ...(
        [
          'missing-position',
          'construction-points',
          'construction-lines',
          'repeated-indices-omitted',
          'morph-controls-baked',
          'flat-normals',
          'tangents-omitted',
          'colors-omitted',
          'extra-uv-sets-omitted',
          'custom-attributes-omitted',
          'undrawn-degenerate-faces',
          'undrawn-self-intersection-faces',
          'undrawn-precision-faces',
        ] as const
      ).map((code) => ({
        stage: 'geometry' as const,
        detail: { code, path, geometryId, count: 1 },
      })),
      ...(['name-generated', 'name-shortened', 'joint-mesh-split', 'camera-omitted'] as const).map(
        (code) => ({ stage: 'hierarchy' as const, detail: { code, path, nodeId } }),
      ),
      ...(
        [
          'name-generated',
          'name-shortened',
          'base-color-factor-baked',
          'rgba16-to-rgba8',
          'image-alias-shared',
          'sampler-filter-nearest',
          'sampler-wrap-clamp',
          'occlusion-omitted',
          'emissive-omitted',
        ] as const
      ).map((code) => ({ stage: 'materials' as const, detail: { code, path, targetId } })),
      ...(['name-generated', 'name-shortened'] as const).map((code) => ({
        stage: 'skins' as const,
        detail: { code, path, bindingId },
      })),
      {
        stage: 'skins',
        detail: { code: 'weights-normalized', path, bindingId, vertices: 2, maximumSumError: 1e-7 },
      },
      ...(
        [
          'name-generated',
          'name-shortened',
          'outside-scene-channel',
          'unresolved-channel-omitted',
          'morph-channel-omitted',
          'empty-clip-omitted',
        ] as const
      ).map((code) => ({ stage: 'animations' as const, detail: { code, path, clipId, count: 1 } })),
      ...(['zero-duration-expanded', 'cubic-resampled'] as const).map((code) => ({
        stage: 'animations' as const,
        detail: { code, path, clipId, count: 1, fps: 30 },
      })),
      {
        stage: 'animations',
        detail: {
          code: 'rotation-keys-normalized',
          path,
          clipId,
          count: 1,
          maximumNormError: 0.001,
        },
      },
    ],
    report = { ...result.report, costs: gltfConversionCosts(doc), issues },
    parse = (patch: unknown) =>
      readGltfImportReply(
        { ...gltfImportReply(input, result), result: { ...result, report: patch } },
        input,
      )
  expect(parse(report)).toEqual({ type: 'result', result: { ...result, report } })
  for (const issue of issues) {
    expect(() =>
      parse({ ...report, issues: [{ ...issue, detail: { ...issue.detail, extra: true } }] }),
    ).toThrow()
    expect(() =>
      parse({ ...report, issues: [{ ...issue, detail: { ...issue.detail, code: 'unknown' } }] }),
    ).toThrow()
  }
  for (const detail of [
    { ...issues[0]!.detail, geometryId: 'absent' },
    { ...issues[0]!.detail, count: NaN },
    { ...issues[0]!.detail, count: 0 },
    { ...issues[0]!.detail, path: 'x'.repeat(GLTF_CONVERSION_REPORT_LIMITS.pathChars + 1) },
  ])
    expect(() => parse({ ...report, issues: [{ stage: 'geometry', detail }] })).toThrow()
  expect(() =>
    parse({ ...report, issues: Array(GLTF_CONVERSION_REPORT_LIMITS.issues + 1).fill(issues[0]) }),
  ).toThrow()
  const source = readGltfDocument(input.bytes)
  if (source.status !== 'ready') throw new Error('Expected source')
  const exact = gltfConversionReport(
      source.document,
      selectGltfDocument(source.document, 0),
      doc,
      Array(GLTF_CONVERSION_REPORT_LIMITS.issues).fill(issues[0]),
    ),
    exactReply = parse(exact)
  if (exactReply.type !== 'result' || exactReply.result.status !== 'ready')
    throw new Error('Expected exact report limit')
  expect(exactReply.result.report.issues).toHaveLength(GLTF_CONVERSION_REPORT_LIMITS.issues)
  expect(() =>
    gltfConversionReport(
      source.document,
      selectGltfDocument(source.document, 0),
      doc,
      Array(GLTF_CONVERSION_REPORT_LIMITS.issues + 1).fill(issues[0]),
    ),
  ).toThrow(GltfInputError)
})

test('real worker keeps cubic conversion opt-in and reports the chosen FPS without approval', async () => {
  const binary = new GlbBinary()
  binary.floats(new Float32Array([0, 1]), 'SCALAR', true)
  binary.floats(new Float32Array(18), 'VEC3')
  const input = {
    ...request(
      encodeGlbContainer(
        {
          asset: { version: '2.0' },
          nodes: [{}],
          accessors: binary.accessors,
          buffers: [{ byteLength: binary.byteLength }],
          bufferViews: binary.views,
          animations: [
            {
              samplers: [{ input: 0, output: 1, interpolation: 'CUBICSPLINE' }],
              channels: [{ sampler: 0, target: { node: 0, path: 'translation' } }],
            },
          ],
        },
        binary.segments,
      ),
    ),
    sceneIndex: null,
  }
  await expect(prepareGltfImportInWorker(input)).rejects.toMatchObject({
    reason: 'unsupported',
    path: 'animations[0].samplers[0].interpolation',
  })
  const result = await prepareGltfImportInWorker({
    ...input,
    options: { animations: { cubic: 'bake', fps: 12, loop: true } },
  })
  if (result.status !== 'ready') throw new Error('Expected explicitly sampled clip')
  expect(result.document.animations![0]).toMatchObject({ duration: 1, fps: 12, loop: true })
  expect(result.report.review).toBe('required')
  expect(result.report.issues).toContainEqual({
    stage: 'animations',
    detail: {
      code: 'cubic-resampled',
      path: 'animations[0].channels[0]',
      clipId: 'gltf_clip_0',
      count: 13,
      fps: 12,
    },
  })
})

test('inspection and global source metadata reject invalid ranges, undeclared occurrences and malformed errors', async () => {
  const input = { ...request(), sceneIndex: 'inspect' as const },
    result = await prepareGltfImportInWorker(input)
  if (result.status !== 'inspect') throw new Error('Expected source inspection')
  const wire = gltfImportReply(input, result)
  for (const patch of [
    { defaultScene: 99 },
    { nodes: NaN },
    { scenes: [{ index: 1, name: 'Invalid', roots: 0 }] },
    { unhandledExtensions: ['same', 'same'] },
    { extra: true },
    {
      nodes: 65536,
      scenes: [
        { index: 0, name: null, roots: 65536 },
        { index: 1, name: null, roots: 1 },
      ],
    },
  ])
    expect(() =>
      readGltfImportReply(
        { ...wire, result: { ...result, source: { ...result.source, ...patch } } },
        input,
      ),
    ).toThrow()
  expect(() => readGltfImportReply(wire, { ...input, sceneIndex: 0 })).toThrow('documento')
  const chosen = { ...input, sceneIndex: 0 },
    converted = direct(chosen),
    report = converted.report,
    source = {
      ...report.source,
      unhandledExtensions: [''],
      extensionOccurrences: [{ name: '', path: 'glTF.extensions.' }],
      unknownChunkTypes: [0x12345678],
    }
  const valid = gltfImportReply(chosen, { ...converted, report: { ...report, source } })
  expect(readGltfImportReply(valid, chosen).type).toBe('result')
  for (const patch of [
    { unhandledExtensions: [] },
    { extensionOccurrences: [source.extensionOccurrences[0], source.extensionOccurrences[0]] },
    { unknownChunkTypes: [-1] },
    { omittedScenes: 1024 },
    { omittedNodes: Infinity },
  ])
    expect(() =>
      readGltfImportReply(
        {
          ...valid,
          result: { ...converted, report: { ...report, source: { ...source, ...patch } } },
        },
        chosen,
      ),
    ).toThrow()
  for (const patch of [
    { reason: 'unknown' },
    { path: '' },
    { message: 'x'.repeat(1025) },
    { extra: true },
  ])
    expect(() =>
      readGltfImportReply(
        {
          documentId: input.documentId,
          revision: input.revision,
          requestId: input.requestId,
          type: 'error',
          reason: 'invalid',
          path: 'asset',
          message: 'Invalid',
          ...patch,
        },
        input,
      ),
    ).toThrow()
  const longExtension = 'A'.repeat(4096),
    longError = {
      ...request(
        json({
          asset: { version: '2.0' },
          extensionsUsed: [longExtension],
          extensionsRequired: [longExtension],
        }),
      ),
      sceneIndex: 'inspect' as const,
    }
  await expect(prepareGltfImportInWorker(longError)).rejects.toMatchObject({
    name: 'GltfInputError',
    reason: 'unsupported',
    path: 'extensionsRequired[0]',
  })
})
