import { expect, test } from 'bun:test'
import { OBJ_INPUT_LIMITS } from '../import/objInput'
import { readSceneDocument } from '../scene/readDocument'
import { directObjImport, objImportFixture, objText } from '../testing/objImportFixture'
import { prepareObjImportInWorker } from './objImport'
import { objImportReply, readObjImportReply } from './objImportProtocol'
import { readObjImportRequest } from './objImportRequest'
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
  'positive',
  'negative',
] as const)('real OBJ worker matches direct conversion with %s normal Y, all six review stages and owned sources/pixels', async (normalY) => {
  const input = objImportFixture()
  input.options.images.normalY = normalY
  const before = structuredClone(input),
    progress: string[] = [],
    result = await prepareObjImportInWorker(input, { onProgress: (value) => progress.push(value) })
  expect(result).toEqual(directObjImport(input))
  expect(progress).toEqual(['validating', 'reading', 'converting'])
  expect(input).toEqual(before)
  if (result.status !== 'ready') throw new Error('Expected review')
  expect(new Set(result.report.issues.map((issue) => issue.stage))).toEqual(
    new Set(['selection', 'base', 'textures', 'hierarchy', 'geometry', 'materials']),
  )
  expect(result.report.review).toBe('required')
  expect(result.report.source.companionFiles).toBe(4)
  expect(readSceneDocument(result.document).status).toBe('valid')
  expect(result.document.materials.find((material) => material.normalImageId)!.normalFlipY).toBe(
    normalY === 'negative',
  )
  result.document.images[0]!.layers[0]!.pixels.fill(0)
  expect(input).toEqual(before)
  const empty = { ...objImportFixture(), bytes: objText(''), files: [] }
  expect(await prepareObjImportInWorker(empty)).toEqual(directObjImport(empty))
})

test('real OBJ worker discovers libraries then their literal image paths without returning a partial document', async () => {
  const input = objImportFixture()
  expect(await prepareObjImportInWorker({ ...input, files: [] })).toEqual({
    status: 'missing',
    paths: ['project/m/a.mtl', 'project/m/empty.mtl'],
  })
  expect(await prepareObjImportInWorker({ ...input, files: input.files.slice(0, 2) })).toEqual({
    status: 'missing',
    paths: ['project/m/color.png', 'project/m/alpha.png'],
  })
  const malformed = {
    ...input,
    files: [{ path: input.files[0]!.path, bytes: objText('newmtl A\ncall unsafe\n') }],
  }
  await expect(prepareObjImportInWorker(malformed)).rejects.toMatchObject({
    name: 'ObjInputError',
    reason: 'unsupported',
  })
})

test('real OBJ worker rejects numerically undrawable stored points, lines and undrawn faces without rescaling', async () => {
  for (const suffix of ['', 'p 1\n', 'l 1 2\n', 'f 1 2 3\n']) {
    const input = {
        ...objImportFixture(),
        files: [],
        bytes: objText(`v 1e308 0 0\nv -1e308 0 0\nv 0 0 0\n${suffix}`),
      },
      before = new Uint8Array(input.bytes)
    await expect(prepareObjImportInWorker(input)).rejects.toMatchObject({
      name: 'ObjInputError',
      reason: 'unsupported',
    })
    expect(input.bytes).toEqual(before)
  }
})

test('OBJ requests snapshot exact ranges and all nested choices before worker creation; original bytes never detach', async () => {
  const input = objImportFixture(),
    container = new Uint8Array(input.bytes.length + 4)
  container.set(input.bytes, 2)
  input.bytes = container.subarray(2, container.length - 2)
  const snapshot = readObjImportRequest(input, true),
    borrowed = readObjImportRequest(input)
  expect(snapshot.bytes).toEqual(input.bytes)
  expect(snapshot.bytes.buffer.byteLength).toBe(input.bytes.byteLength)
  expect(borrowed.bytes).toBe(input.bytes)
  expect(snapshot.bytes.buffer).not.toBe(input.bytes.buffer)
  expect(snapshot.options.appearance).not.toBe(input.options.appearance)
  for (let i = 0; i < input.files.length; i++) {
    expect(snapshot.files[i]!.bytes).toEqual(input.files[i]!.bytes)
    expect(snapshot.files[i]!.bytes.buffer).not.toBe(input.files[i]!.bytes.buffer)
  }
  const worker = new ControlledWorker(),
    pending = prepareObjImportInWorker(input, { createWorker: () => worker })
  input.identity.name = 'Changed'
  input.options.images.normalY = 'negative'
  input.bytes.fill(0)
  for (const file of input.files) file.bytes.fill(0)
  const expected = directObjImport(snapshot)
  worker.reply(objImportReply(snapshot, expected))
  expect(await pending).toEqual(expected)
  expect(worker.requests).toEqual([snapshot])
  expect(worker.stopped).toBe(1)
  expect(container.buffer.byteLength).toBe(container.length)
})

test('real OBJ worker propagates the aggregate report-text budget as a structured failure without changing sources', async () => {
  const input = objImportFixture(),
    folder = `${Array.from({ length: 50 }, () => 'd'.repeat(70)).join('/')}/`,
    names = Array.from({ length: 500 }, (_, i) => `M${i}`)
  input.entryPath = 'model.obj'
  input.bytes = objText(
    `mtllib ${folder}m.mtl\nv 0 0 0\nv 1 0 0\nv 0 1 0\nvt 0 0\nvt 1 0\nvt 0 1\n` +
      names.map((name) => `usemtl ${name}\nf 1/1 2/2 3/3\n`).join(''),
  )
  input.files = [
    {
      path: `${folder}m.mtl`,
      bytes: objText(names.map((name) => `newmtl ${name}\nmap_Kd p.png\n`).join('')),
    },
    { path: `${folder}p.png`, bytes: input.files[2]!.bytes },
  ]
  const before = structuredClone(input)
  await expect(prepareObjImportInWorker(input)).rejects.toMatchObject({
    name: 'ObjInputError',
    reason: 'budget',
    path: 'report.text',
  })
  expect(input).toEqual(before)
})

test('OBJ request boundary rejects unknown fields, shared memory, invalid ownership, paths, options and selected budgets before creating a worker', async () => {
  const input = objImportFixture(),
    max = new Uint8Array(OBJ_INPUT_LIMITS.fileBytes),
    invalid: unknown[] = [
      { ...input, extra: true },
      { ...input, documentId: '' },
      { ...input, revision: -1 },
      { ...input, requestId: 1.5 },
      { ...input, revision: Number.MAX_SAFE_INTEGER + 1 },
      { ...input, identity: { ...input.identity, id: 'elsewhere' } },
      { ...input, identity: { ...input.identity, thumb: 'old' } },
      { ...input, identity: { ...input.identity, createdAt: Infinity } },
      { ...input, options: { ...input.options, extra: true } },
      {
        ...input,
        options: {
          ...input.options,
          appearance: { ...input.options.appearance, base: { rgbSpace: 'automatic' } },
        },
      },
      { ...input, options: { ...input.options, materials: null } },
      {
        ...input,
        options: { ...input.options, images: { ...input.options.images, doubleSided: 'false' } },
      },
      { ...input, bytes: new Uint8Array(new SharedArrayBuffer(2)) },
      { ...input, files: [{ path: 'a', bytes: new Uint8Array(new SharedArrayBuffer(2)) }] },
      { ...input, files: [{ path: 'a', bytes: max, extra: true }] },
      {
        ...input,
        files: [
          { path: 'a', bytes: max },
          { path: './a', bytes: max },
        ],
      },
      { ...input, files: [{ path: input.entryPath, bytes: max }] },
      { ...input, entryPath: '../outside.obj' },
      { ...input, entryPath: './https:model.obj' },
      { ...input, bytes: new Uint8Array(OBJ_INPUT_LIMITS.fileBytes + 1) },
      {
        ...input,
        files: [
          { path: 'a', bytes: max },
          { path: 'b', bytes: max },
        ],
      },
      {
        ...input,
        files: Array.from({ length: OBJ_INPUT_LIMITS.resources + 1 }, (_, i) => ({
          path: `${i}`,
          bytes: new Uint8Array(),
        })),
      },
    ]
  for (const candidate of invalid) {
    let created = false
    await expect(
      prepareObjImportInWorker(candidate as typeof input, {
        createWorker: () => {
          created = true
          return new ControlledWorker()
        },
      }),
    ).rejects.toBeInstanceOf(Error)
    expect(created).toBe(false)
  }
  const exact = readObjImportRequest(
    { ...input, bytes: max, files: [{ path: 'a', bytes: max }] },
    true,
  )
  expect(exact.bytes.byteLength + exact.files[0]!.bytes.byteLength).toBe(
    OBJ_INPUT_LIMITS.selectedFileBytes,
  )
  expect(max.some(Boolean)).toBe(false)
})

test('OBJ cancellation terminates real CPU work and ignores late messages; cancelled factories never post', async () => {
  const controller = new AbortController(),
    input = objImportFixture(),
    before = structuredClone(input)
  let terminated = 0
  await expect(
    prepareObjImportInWorker(input, {
      signal: controller.signal,
      onProgress: (value) => {
        if (value === 'reading') controller.abort()
      },
      createWorker: () => {
        const worker = new Worker(new URL('./objImport.worker.ts', import.meta.url), {
          type: 'module',
        })
        return {
          postMessage: worker.postMessage.bind(worker),
          addEventListener: worker.addEventListener.bind(worker),
          removeEventListener: worker.removeEventListener.bind(worker),
          terminate: () => {
            terminated++
            worker.terminate()
          },
        }
      },
    }),
  ).rejects.toMatchObject({ name: 'AbortError' })
  expect(terminated).toBe(1)
  expect(input).toEqual(before)
  const controlled = new ControlledWorker(),
    cancel = new AbortController(),
    progress: string[] = [],
    pending = prepareObjImportInWorker(input, {
      signal: cancel.signal,
      createWorker: () => controlled,
      onProgress: (p) => progress.push(p),
    })
  cancel.abort()
  await expect(pending).rejects.toMatchObject({ name: 'AbortError' })
  controlled.reply({ ...input, type: 'progress', progress: 'converting' })
  controlled.reply(objImportReply(input, directObjImport(input)))
  expect(progress).toEqual([])
  expect(controlled.stopped).toBe(1)
  const duringFactory = new AbortController(),
    factoryWorker = new ControlledWorker()
  await expect(
    prepareObjImportInWorker(input, {
      signal: duringFactory.signal,
      createWorker: () => {
        duringFactory.abort()
        return factoryWorker
      },
    }),
  ).rejects.toMatchObject({ name: 'AbortError' })
  expect(factoryWorker.requests).toEqual([])
  expect(factoryWorker.stopped).toBe(1)
  let created = false
  await expect(
    prepareObjImportInWorker(input, {
      signal: cancel.signal,
      createWorker: () => {
        created = true
        return factoryWorker
      },
    }),
  ).rejects.toMatchObject({ name: 'AbortError' })
  expect(created).toBe(false)
})

test('OBJ lifecycle rejects stale ownership before touching payload, clone/worker errors and malformed replies, terminating once', async () => {
  const input = objImportFixture()
  for (const mismatch of [{ documentId: 'other' }, { revision: 8 }, { requestId: 3 }]) {
    const reply = {
      documentId: input.documentId,
      revision: input.revision,
      requestId: input.requestId,
      ...mismatch,
      get result() {
        throw new Error('Payload read before ownership')
      },
    }
    expect(() => readObjImportReply(reply, input)).toThrow('outra criação, revisão ou pedido')
  }
  for (const reply of [
    null,
    {},
    {
      documentId: input.documentId,
      revision: input.revision,
      requestId: input.requestId,
      type: 'progress',
      progress: 'saved',
    },
  ]) {
    const worker = new ControlledWorker(),
      pending = prepareObjImportInWorker(input, { createWorker: () => worker })
    worker.reply(reply)
    await expect(pending).rejects.toBeInstanceOf(Error)
    expect(worker.stopped).toBe(1)
  }
  for (const type of ['error', 'messageerror']) {
    const worker = new ControlledWorker(),
      pending = prepareObjImportInWorker(input, { createWorker: () => worker })
    worker.dispatchEvent(
      type === 'error'
        ? new ErrorEvent(type, { message: 'failed', cancelable: true })
        : new Event(type),
    )
    await expect(pending).rejects.toBeInstanceOf(Error)
    expect(worker.stopped).toBe(1)
  }
  const worker = new ControlledWorker()
  worker.postMessage = () => {
    throw new Error('clone failed')
  }
  await expect(prepareObjImportInWorker(input, { createWorker: () => worker })).rejects.toThrow(
    'clone failed',
  )
  expect(worker.stopped).toBe(1)
})
