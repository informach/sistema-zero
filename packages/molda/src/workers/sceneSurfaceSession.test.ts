import { expect, test } from 'bun:test'
import { extrudeMeshFaces } from '../scene/meshExtrude'
import { insetMeshFaces } from '../scene/meshInset'
import { subdivideMeshFaces } from '../scene/meshSubdivide'
import { thickenMeshFaces } from '../scene/meshThickness'
import { primitiveMesh } from '../scene/primitiveMesh'
import { readSceneGeometry } from '../scene/readGeometry'
import { packSceneMesh } from './sceneMeshPacket'
import {
  readSceneSurfaceApply,
  readSceneSurfaceInit,
  readSceneSurfaceReply,
  type SceneSurfaceInit,
} from './sceneSurfaceProtocol'
import { createSceneSurfaceSession } from './sceneSurfaceSession'
import { WORKER_LOADED_MESSAGE } from './workerHandshake'
import type { TaskWorker } from './workerTask'

function fixture() {
  return {
    documentId: 'surface-test',
    revision: 4,
    mesh: primitiveMesh({ id: 'mesh', kind: 'box', from: [0, 0, 0], to: [2, 2, 2], surfaces: {} })
      .mesh,
    faceIds: ['px'],
    tool: 'extrude' as const,
  }
}
function fakeWorker() {
  const events = new EventTarget()
  const requests: unknown[] = []
  let disposals = 0
  const worker: TaskWorker = {
    addEventListener: events.addEventListener.bind(events),
    removeEventListener: events.removeEventListener.bind(events),
    postMessage: (message) => {
      requests.push(message)
    },
    terminate: () => {
      disposals++
    },
  }
  return {
    worker,
    requests,
    dispatch: (event: Event) => events.dispatchEvent(event),
    emit: (message: unknown) =>
      events.dispatchEvent(new MessageEvent('message', { data: message })),
    disposals: () => disposals,
  }
}

test.each([
  'extrude',
  'inset',
  'subdivide',
  'thickness',
] as const)('real %s worker keeps stable IDs and produces the same geometry as the pure operation', async (tool) => {
  const source = { ...fixture(), tool }
  if (tool === 'thickness') {
    source.mesh.faces = { px: source.mesh.faces.px! }
  }
  const original = structuredClone(source)
  let first: typeof source.mesh | undefined
  let resolve!: () => void
  let reject!: (error: unknown) => void
  const done = new Promise<void>((yes, no) => {
    resolve = yes
    reject = no
  })
  const amounts = tool === 'inset' ? [0.2, 0.4] : [1, 2]
  const session = createSceneSurfaceSession({
    source,
    onBusy: () => {},
    onError: reject,
    onResult: (mesh, amount) => {
      try {
        const generated = Object.keys(mesh.vertices).find(
          (id) => !Object.hasOwn(source.mesh.vertices, id),
        )!
        const prefix = generated.slice(0, generated.lastIndexOf(':') + 1)
        let next = 0
        const operation =
          tool === 'extrude'
            ? extrudeMeshFaces
            : tool === 'inset'
              ? insetMeshFaces
              : tool === 'thickness'
                ? thickenMeshFaces
                : subdivideMeshFaces
        expect(mesh).toEqual(
          operation(source.mesh, source.faceIds, amount, () => `${prefix}${++next}`),
        )
        if (!first) {
          first = mesh
          session.update(amounts[1]!)
        } else {
          if (tool === 'subdivide') {
            expect(
              Object.keys(first.vertices).every((id) => Object.hasOwn(mesh.vertices, id)),
            ).toBe(true)
            expect(Object.keys(first.faces).every((id) => Object.hasOwn(mesh.faces, id))).toBe(true)
          } else {
            expect(Object.keys(mesh.vertices)).toEqual(Object.keys(first.vertices))
            expect(Object.keys(mesh.faces)).toEqual(Object.keys(first.faces))
          }
          resolve()
        }
      } catch (error) {
        reject(error)
      }
    },
  })
  try {
    session.update(amounts[0]!)
    await done
    expect(source).toEqual(original)
  } finally {
    session.dispose()
  }
}, 5000)

test('coalesces intermediate values, ignores obsolete results, and disposes listeners on cancellation', () => {
  const source = fixture()
  const fake = fakeWorker()
  const results: number[] = []
  const busy: boolean[] = []
  const errors: unknown[] = []
  const session = createSceneSurfaceSession({
    source,
    createWorker: () => fake.worker,
    onBusy: (v) => busy.push(v),
    onResult: (_mesh, amount) => results.push(amount),
    onError: (error) => errors.push(error),
  })
  const token = { documentId: source.documentId, revision: source.revision }
  try {
    expect(Object.keys(fake.requests[0] as object).sort()).toEqual([
      'documentId',
      'faceIds',
      'idSeed',
      'mesh',
      'revision',
      'tool',
      'type',
    ])
    session.update(1)
    fake.emit({ ...token, type: 'ready' })
    expect(fake.requests).toHaveLength(2)
    session.update(2)
    session.update(3)
    expect(fake.requests).toHaveLength(2)
    // An obsolete payload never reaches the expensive geometry reader or the document.
    fake.emit({ ...token, type: 'result', requestId: 1, packet: { obsolete: true } })
    expect(results).toEqual([])
    expect(fake.requests[2]).toEqual({ type: 'apply', requestId: 3, amount: 3 })
    fake.emit({ ...token, type: 'result', requestId: 3, packet: packSceneMesh(source.mesh) })
    expect(results).toEqual([3])
    expect(session.pending).toBe(false)
    expect(busy.at(-1)).toBe(false)
    session.update(4)
    session.dispose()
    session.dispose()
    fake.emit({ ...token, type: 'result', requestId: 4, packet: packSceneMesh(source.mesh) })
    expect(results).toEqual([3])
    expect(fake.disposals()).toBe(1)
    expect(session.update(5)).toBe(false)
    expect(errors).toEqual([])
  } finally {
    session.dispose()
  }
})

test('invalid transport tokens fail closed and terminate the owned worker', () => {
  const source = fixture()
  const fake = fakeWorker()
  const errors: unknown[] = []
  const session = createSceneSurfaceSession({
    source,
    createWorker: () => fake.worker,
    onBusy: () => {},
    onResult: () => {
      throw new Error('Unexpected result')
    },
    onError: (error) => errors.push(error),
  })
  fake.emit({ type: 'ready', documentId: source.documentId, revision: 3 })
  expect(errors).toHaveLength(1)
  expect(fake.disposals()).toBe(1)
  session.dispose()
})

test.each([
  'error',
  'messageerror',
] as const)('native %s ends a pending session once and rejects late messages', (type) => {
  const source = fixture()
  const fake = fakeWorker()
  const errors: unknown[] = []
  const session = createSceneSurfaceSession({
    source,
    createWorker: () => fake.worker,
    onBusy: () => {},
    onResult: () => {
      throw new Error('Unexpected result')
    },
    onError: (error) => errors.push(error),
  })
  session.update(1)
  fake.dispatch(
    type === 'error'
      ? new ErrorEvent('error', { message: 'Unavailable', cancelable: true })
      : new MessageEvent('messageerror'),
  )
  fake.emit({ type: 'ready', documentId: source.documentId, revision: source.revision })
  session.dispose()
  expect(errors).toHaveLength(1)
  expect(fake.disposals()).toBe(1)
  expect(session.pending).toBe(false)
  expect(session.update(2)).toBe(false)
})

test('an obsolete operation error does not cancel the newest valid input', () => {
  const source = fixture()
  const fake = fakeWorker()
  const errors: unknown[] = []
  const results: number[] = []
  const session = createSceneSurfaceSession({
    source,
    createWorker: () => fake.worker,
    onBusy: () => {},
    onResult: (_mesh, amount) => results.push(amount),
    onError: (error) => errors.push(error),
  })
  const token = { documentId: source.documentId, revision: source.revision }
  try {
    fake.emit({ ...token, type: 'ready' })
    session.update(1)
    session.update(0.25)
    fake.emit({ ...token, type: 'error', requestId: 1, message: 'Invalid previous value' })
    fake.emit({ ...token, type: 'result', requestId: 2, packet: packSceneMesh(source.mesh) })
    expect(errors).toEqual([])
    expect(results).toEqual([0.25])
  } finally {
    session.dispose()
  }
})

test('initialization and postMessage failures dispose their worker without an orphaned job', () => {
  const source = fixture()
  const fake = fakeWorker()
  fake.worker.postMessage = () => {
    throw new Error('Clone failed')
  }
  expect(() => {
    createSceneSurfaceSession({
      source,
      createWorker: () => fake.worker,
      onBusy: () => {},
      onResult: () => {},
      onError: () => {},
    })
  }).toThrow('Clone failed')
  // The worker never answered, so it is released at its hello — not while it may still be loading.
  expect(fake.disposals()).toBe(0)
  fake.emit(WORKER_LOADED_MESSAGE)
  expect(fake.disposals()).toBe(1)
  const next = fakeWorker()
  const errors: unknown[] = []
  const session = createSceneSurfaceSession({
    source,
    createWorker: () => next.worker,
    onBusy: () => {},
    onResult: () => {},
    onError: (error) => errors.push(error),
  })
  next.emit({ type: 'ready', documentId: source.documentId, revision: source.revision })
  next.worker.postMessage = () => {
    throw new Error('Closed')
  }
  expect(session.update(1)).toBe(false)
  expect(errors).toHaveLength(1)
  expect(next.disposals()).toBe(1)
  session.dispose()
})

test('disposing before the hello waits for it, then ignores the worker and never terminates twice', () => {
  const source = fixture()
  const fake = fakeWorker()
  const errors: unknown[] = []
  const results: number[] = []
  const session = createSceneSurfaceSession({
    source,
    createWorker: () => fake.worker,
    onBusy: () => {},
    onResult: (_mesh, amount) => results.push(amount),
    onError: (error) => errors.push(error),
  })
  const token = { documentId: source.documentId, revision: source.revision }
  session.update(1)
  session.dispose()
  expect(session.pending).toBe(false)
  expect(fake.disposals()).toBe(0)
  fake.emit(WORKER_LOADED_MESSAGE)
  expect(fake.disposals()).toBe(1)
  // Late protocol traffic from an abandoned worker is neither an error nor a request.
  fake.emit({ ...token, type: 'ready' })
  fake.emit({ ...token, type: 'result', requestId: 1, packet: packSceneMesh(source.mesh) })
  expect(fake.requests).toHaveLength(1)
  expect(results).toEqual([])
  expect(errors).toEqual([])
  expect(fake.disposals()).toBe(1)
})

test('the hello never reaches the protocol reader', () => {
  const source = fixture()
  const fake = fakeWorker()
  const errors: unknown[] = []
  const session = createSceneSurfaceSession({
    source,
    createWorker: () => fake.worker,
    onBusy: () => {},
    onResult: () => {},
    onError: (error) => errors.push(error),
  })
  try {
    fake.emit(WORKER_LOADED_MESSAGE)
    fake.emit({ documentId: source.documentId, revision: source.revision, type: 'ready' })
    session.update(1)
    expect(fake.requests).toHaveLength(2)
    expect(errors).toEqual([])
  } finally {
    session.dispose()
  }
})

test('strict worker parser rejects missing references, repeated corners, unknown payloads and over-budget results', () => {
  const source = fixture()
  const init: SceneSurfaceInit = { ...source, type: 'init', idSeed: 'seed' }
  expect(readSceneSurfaceInit(init)).toEqual(init)
  expect(() => readSceneSurfaceInit({ ...init, images: [] })).toThrow()
  expect(() => readSceneSurfaceInit({ ...init, idSeed: 'invalid seed' })).toThrow()
  expect(() => readSceneSurfaceInit({ ...init, idSeed: 'a'.repeat(65) })).toThrow()
  expect(() => readSceneSurfaceInit({ ...init, documentId: 'invalid:asset' })).toThrow()
  expect(() => readSceneSurfaceApply({ type: 'apply', requestId: 1, amount: NaN })).toThrow()
  const invalid = structuredClone(source.mesh)
  invalid.faces.px!.corners[0]!.vertexId = 'missing'
  expect(() => readSceneGeometry(invalid)).toThrow('Vértice ausente')
  const repeated = structuredClone(source.mesh)
  repeated.faces.px!.corners[0]!.vertexId = repeated.faces.px!.corners[1]!.vertexId
  expect(() => readSceneGeometry(repeated)).toThrow('repetido')
  expect(() =>
    readSceneGeometry({ ...source.mesh, looseEdges: [['missing', 'also-missing']] }),
  ).toThrow()
  const over = {
    ...source.mesh,
    faces: Object.fromEntries(
      Array.from({ length: 10_001 }, (_, i) => [`face${i}`, source.mesh.faces.px!]),
    ),
  }
  expect(() => {
    readSceneSurfaceReply(
      {
        type: 'result',
        documentId: source.documentId,
        revision: source.revision,
        requestId: 1,
        packet: packSceneMesh(over),
      },
      source,
    )
  }).toThrow('orçamento')
})
