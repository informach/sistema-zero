import { expect, test } from 'bun:test'
import { readSceneDocument } from '../scene/readDocument'
import {
  bbmodelImportFixture,
  bbmodelText,
  directBbmodelImport,
} from '../testing/bbmodelImportFixture'
import { prepareBbmodelImportInWorker } from './bbmodelImport'
import { bbmodelImportReply, readBbmodelImportReply } from './bbmodelImportProtocol'
import { readBbmodelImportRequest } from './bbmodelImportRequest'
import { WORKER_LOADED_MESSAGE } from './workerHandshake'
import type { TaskWorker } from './workerTask'

class ControlledWorker extends EventTarget implements TaskWorker {
  requests: unknown[] = []
  stopped = 0
  postMessage(value: unknown) {
    this.requests.push(structuredClone(value))
  }
  terminate() {
    this.stopped++
  }
  reply(value: unknown) {
    this.dispatchEvent(new MessageEvent('message', { data: value }))
  }
}

test.each([
  '4.9',
  '4.10',
  '5.0',
] as const)('real bbmodel %s worker matches direct conversion with all 14 report stages and owned sources', async (version) => {
  const input = bbmodelImportFixture(version),
    before = structuredClone(input),
    progress: string[] = [],
    result = await prepareBbmodelImportInWorker(input, {
      onProgress: (value) => progress.push(value),
    })
  expect(result).toEqual(directBbmodelImport(input))
  expect(progress).toEqual(['validating', 'converting'])
  if (result.status !== 'ready') throw new Error('Ready expected')
  expect(new Set(result.report.issues.map((issue) => issue.stage))).toEqual(
    new Set([
      'selection',
      'remainder',
      'topology',
      'positions',
      'authorial-uv',
      'normalized-uv',
      'surfaces',
      'node-materials',
      'texture-materials',
      'hierarchy',
      'geometry',
      'resources',
      'layouts',
      'images',
    ]),
  )
  expect(readSceneDocument(result.document).status).toBe('valid')
  expect(result.report.review).toBe('required')
  expect(result.document.images[0]!.flipbook?.frames).toEqual([0, 1, 1])
  expect(input).toEqual(before)
  result.document.images[0]!.layers[0]!.pixels.fill(0)
  expect(input).toEqual(before)
})

test('real bbmodel worker reports missing companions and conversion errors without partial document or fallback', async () => {
  const input = bbmodelImportFixture(),
    source = JSON.parse(new TextDecoder().decode(input.bytes))
  source.textures[0].source = undefined
  input.bytes = bbmodelText(source)
  input.files = []
  expect(await prepareBbmodelImportInWorker(input)).toEqual({
    status: 'missing',
    paths: ['paint.png'],
  })
  source.textures[0].source = 'data:image/png;base64,AAAA'
  input.bytes = bbmodelText(source)
  const before = structuredClone(input)
  await expect(prepareBbmodelImportInWorker(input)).rejects.toMatchObject({
    name: 'BbmodelInputError',
  })
  expect(input).toEqual(before)
  source.textures[0].layers_enabled = true
  input.bytes = bbmodelText(source)
  await expect(prepareBbmodelImportInWorker(input)).rejects.toMatchObject({
    name: 'BbmodelInputError',
    reason: 'unsupported',
    path: 'files["model.bbmodel"].textures[0].layers_enabled',
  })
})

test('bbmodel worker uses the owned snapshot even when the host changes source, choices and identity', async () => {
  const input = bbmodelImportFixture(),
    worker = new ControlledWorker(),
    snapshot = readBbmodelImportRequest(input, true),
    pending = prepareBbmodelImportInWorker(input, { createWorker: () => worker })
  input.bytes.fill(0)
  input.files[0]!.bytes.fill(0)
  input.identity.name = 'Outra criação'
  input.options.nodeMaterials!.color![0] = 1
  const ready = directBbmodelImport(snapshot)
  worker.reply(bbmodelImportReply(snapshot, ready))
  expect(await pending).toEqual(ready)
  expect(worker.requests).toEqual([snapshot])
  expect(worker.stopped).toBe(1)
  expect(input.bytes.byteLength).toBe(snapshot.bytes.byteLength)
})

test('bbmodel cancellation, invalid request, stale replies and progress failures stop their worker exactly once', async () => {
  const input = bbmodelImportFixture(),
    controller = new AbortController(),
    worker = new ControlledWorker(),
    pending = prepareBbmodelImportInWorker(input, {
      signal: controller.signal,
      createWorker: () => worker,
    })
  worker.reply(WORKER_LOADED_MESSAGE)
  controller.abort()
  await expect(pending).rejects.toMatchObject({ name: 'AbortError' })
  expect(worker.stopped).toBe(1)
  worker.reply(bbmodelImportReply(input, directBbmodelImport(input)))
  expect(worker.stopped).toBe(1)
  let created = 0
  await expect(
    prepareBbmodelImportInWorker(input, {
      signal: controller.signal,
      createWorker: () => {
        created++
        return new ControlledWorker()
      },
    }),
  ).rejects.toMatchObject({ name: 'AbortError' })
  await expect(
    prepareBbmodelImportInWorker(
      { ...input, revision: -1 },
      {
        createWorker: () => {
          created++
          return new ControlledWorker()
        },
      },
    ),
  ).rejects.toThrow()
  expect(created).toBe(0)
  for (const change of [
    { documentId: 'other' },
    { revision: input.revision + 1 },
    { requestId: 99 },
  ]) {
    const controlled = new ControlledWorker(),
      task = prepareBbmodelImportInWorker(input, { createWorker: () => controlled })
    controlled.reply({ ...bbmodelImportReply(input, directBbmodelImport(input)), ...change })
    await expect(task).rejects.toThrow('outra criação, revisão ou pedido')
    expect(controlled.stopped).toBe(1)
  }
  const controlled = new ControlledWorker(),
    task = prepareBbmodelImportInWorker(input, {
      createWorker: () => controlled,
      onProgress: () => {
        throw new Error('Progress rejected')
      },
    })
  controlled.reply({
    documentId: input.documentId,
    revision: input.revision,
    requestId: input.requestId,
    type: 'progress',
    progress: 'converting',
  })
  await expect(task).rejects.toThrow('Progress rejected')
  expect(controlled.stopped).toBe(1)
})

test('bbmodel reply boundary rejects incomplete, foreign or altered documents and malformed missing/progress responses', () => {
  const input = bbmodelImportFixture(),
    ready = directBbmodelImport(input),
    reply = bbmodelImportReply(input, ready)
  for (const changes of [
    { id: 'other' },
    { name: 'Outra' },
    { createdAt: 99 },
    { updatedAt: 99 },
    { thumb: 'data:image/png;base64,old' },
    { nodes: [] },
  ])
    expect(() =>
      readBbmodelImportReply(
        { ...reply, result: { ...ready, document: { ...ready.document, ...changes } } },
        input,
      ),
    ).toThrow()
  for (const paths of [
    [],
    ['../outside.png'],
    ['paint.png'],
    ['a', 'a'],
    ['model.bbmodel'],
    ['./a'],
  ])
    expect(() =>
      readBbmodelImportReply({ ...reply, result: { status: 'missing', paths } }, input),
    ).toThrow()
  expect(() =>
    readBbmodelImportReply(
      { ...reply, result: { status: 'missing', paths: ['absent.png'], document: ready.document } },
      input,
    ),
  ).toThrow()
  expect(() =>
    readBbmodelImportReply(
      {
        documentId: input.documentId,
        revision: input.revision,
        requestId: input.requestId,
        type: 'progress',
        progress: 'adopted',
      },
      input,
    ),
  ).toThrow()
  expect(() => readBbmodelImportReply({ ...reply, extra: true }, input)).toThrow()
})

test('real bbmodel worker accepts empty source while retaining host identity and mandatory review', async () => {
  const input = bbmodelImportFixture()
  input.bytes = bbmodelText({ meta: { format_version: '5.0', model_format: 'free' } })
  input.files = []
  const result = await prepareBbmodelImportInWorker(input)
  expect(result).toEqual(directBbmodelImport(input))
  if (result.status !== 'ready') throw new Error('Ready expected')
  expect(result.document.nodes).toEqual([])
  expect(result.report.issues).toEqual([])
  expect(result.report.review).toBe('required')
})

test('real bbmodel worker returns a bounded report-budget error without changing the selected bytes', async () => {
  const input = bbmodelImportFixture(),
    prefix = 'x'.repeat(4088)
  input.bytes = bbmodelText({
    meta: { format_version: '5.0', model_format: 'free' },
    ...Object.fromEntries(Array.from({ length: 1025 }, (_, index) => [prefix + index, null])),
  })
  input.files = []
  const before = new Uint8Array(input.bytes)
  await expect(prepareBbmodelImportInWorker(input)).rejects.toMatchObject({
    name: 'BbmodelInputError',
    reason: 'budget',
    path: 'report.text',
  })
  expect(input.bytes).toEqual(before)
})

test('real bbmodel worker preserves signed report metadata and independent editable aliases of one image resource', async () => {
  const input = bbmodelImportFixture(),
    source = JSON.parse(new TextDecoder().decode(input.bytes))
  source.elements[0].color = 123.5
  source.textures[0].fps = 123.5
  source.textures.push({ ...source.textures[0], uuid: 'alias' })
  source.elements[0].faces.south.texture = 1
  input.bytes = new TextEncoder().encode(JSON.stringify(source).replaceAll('123.5', '-0'))
  input.options.nodeMaterials!.color![0] = -0
  const result = await prepareBbmodelImportInWorker(input)
  expect(result).toEqual(directBbmodelImport(input))
  if (result.status !== 'ready') throw new Error('Ready expected')
  const origins = result.report.issues.filter((issue) => issue.stage === 'resources')
  expect(origins.map((issue) => issue.detail.resource)).toEqual([0, 0])
  for (const issue of result.report.issues) {
    if (issue.stage === 'layouts' && issue.detail.code === 'texture-fps-floor')
      expect(Object.is(issue.detail.source, -0)).toBe(true)
    if (issue.stage === 'node-materials' && issue.detail.code === 'untextured-appearance-adapted') {
      expect(Object.is(issue.detail.color[0], -0)).toBe(true)
      if (issue.detail.node === 0) expect(Object.is(issue.detail.markerColor, -0)).toBe(true)
    }
  }
  const first = result.document.images[0]!.layers[0]!.pixels,
    second = result.document.images[1]!.layers[0]!.pixels,
    before = new Uint8Array(second)
  expect(first).toEqual(second)
  expect(first.buffer).not.toBe(second.buffer)
  first.fill(0)
  expect(second).toEqual(before)
})

test('real bbmodel worker retains a smooth empty mesh with an explicit zero-face adaptation', async () => {
  const input = bbmodelImportFixture()
  input.files = []
  input.bytes = bbmodelText({
    meta: { format_version: '5.0', model_format: 'free' },
    elements: [
      { uuid: 'empty', name: 'Vazia', type: 'mesh', shading: 'smooth', vertices: {}, faces: {} },
    ],
    outliner: ['empty'],
  })
  const result = await prepareBbmodelImportInWorker(input)
  expect(result).toEqual(directBbmodelImport(input))
  if (result.status !== 'ready') throw new Error('Ready expected')
  expect(result.report.issues).toContainEqual({
    stage: 'surfaces',
    detail: {
      code: 'native-flat-normals',
      node: 0,
      path: 'elements[0]',
      source: 'smooth',
      count: 0,
    },
  })
})

test('bbmodel worker construction cancellation and worker event failures settle and release exactly once', async () => {
  const input = bbmodelImportFixture(),
    controller = new AbortController(),
    constructed = new ControlledWorker(),
    cancelled = prepareBbmodelImportInWorker(input, {
      signal: controller.signal,
      createWorker: () => {
        controller.abort()
        return constructed
      },
    })
  await expect(cancelled).rejects.toMatchObject({ name: 'AbortError' })
  expect(constructed.requests).toEqual([])
  // Released before it said anything: the stop waits for its hello, never for a loading module.
  expect(constructed.stopped).toBe(0)
  constructed.reply(WORKER_LOADED_MESSAGE)
  expect(constructed.stopped).toBe(1)
  for (const type of ['error', 'messageerror']) {
    const worker = new ControlledWorker(),
      pending = prepareBbmodelImportInWorker(input, { createWorker: () => worker })
    worker.dispatchEvent(new Event(type))
    await expect(pending).rejects.toThrow()
    expect(worker.stopped).toBe(1)
    worker.dispatchEvent(new Event(type))
    expect(worker.stopped).toBe(1)
  }
})
