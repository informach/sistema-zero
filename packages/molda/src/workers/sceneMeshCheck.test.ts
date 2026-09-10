import { expect, test } from 'bun:test'
import { buildSceneGeometry } from '../scene/geometry'
import { diagnoseSceneMesh, MESH_FIX_KINDS, repairSceneMesh } from '../scene/meshDiagnosis'
import { makeSceneGridGeometry } from '../testing/sceneFixtures'
import { checkMeshInWorker } from './sceneMeshCheck'
import {
  type MeshCheckRequest,
  readMeshCheckReply,
  readMeshCheckRequest,
} from './sceneMeshCheckProtocol'
import { packSceneMesh } from './sceneMeshPacket'
import type { TaskWorker } from './workerTask'

function fixture(): MeshCheckRequest {
  const mesh = makeSceneGridGeometry(2)
  mesh.vertices.orphan = [10, 10, 10]
  mesh.vertices.same = [...mesh.vertices.v_0_0!]
  mesh.vertices.a = [2, 0, 0]
  mesh.vertices.b = [3, 0, 0]
  mesh.vertices.c = [4, 0, 0]
  mesh.faces.invalid = { corners: ['a', 'b', 'c'].map((vertexId) => ({ vertexId, uv: [0, 0] })) }
  mesh.faces.f_0_0!.corners[2]!.uv = [0.6, 0.8]
  mesh.faces.copy = mesh.faces.f_1_1!
  mesh.looseEdges = [
    ['v_0_0', 'same'],
    ['v_0_0', 'v_1_0'],
    ['v_1_0', 'v_0_0'],
  ]
  return { documentId: 'mesh-check', revision: 7, mesh, action: 'inspect' }
}

test('the real inspection worker returns the same bounded report without changing the source', async () => {
  const request = fixture()
  const before = structuredClone(request)
  const result = await checkMeshInWorker(request)
  expect(result.kind).toBe('report')
  if (result.kind === 'report') expect(result.issues).toEqual(diagnoseSceneMesh(request.mesh))
  expect(request).toEqual(before)
})

test.each([
  ...MESH_FIX_KINDS,
])('real %s repair returns validated Double geometry equivalent to the pure operation', async (fix) => {
  const request = fixture()
  const before = structuredClone(request)
  const result = await checkMeshInWorker({ ...request, action: 'repair', fix })
  if (result.kind !== 'repair') throw new Error('Missing repair')
  const expected = repairSceneMesh(request.mesh, fix)
  const drawn = buildSceneGeometry(result.mesh),
    direct = buildSceneGeometry(expected)
  expect(drawn.positions).toEqual(direct.positions)
  expect(drawn.uvs).toEqual(direct.uvs)
  expect(drawn.materialIds).toEqual(direct.materialIds)
  expect(result.mesh.vertices).toEqual(expected.vertices)
  expect(result.mesh.looseEdges).toEqual(expected.looseEdges)
  expect(request).toEqual(before)
})

test('report and repair readers reject foreign revisions, wrong result types, unknown IDs, duplicates and bad counts', () => {
  const request = fixture()
  const token = { documentId: request.documentId, revision: request.revision }
  const reply = {
    ...token,
    type: 'result',
    result: { kind: 'report', issues: diagnoseSceneMesh(request.mesh) },
  }
  expect(readMeshCheckRequest(request)).toEqual(request)
  expect(() => readMeshCheckRequest({ ...request, action: 'repair', fix: 'open-edges' })).toThrow()
  expect(() => readMeshCheckRequest({ ...request, images: [] })).toThrow()
  expect(() => readMeshCheckReply({ ...reply, revision: 8 }, request)).toThrow()
  expect(() => readMeshCheckReply({ ...reply, documentId: 'another' }, request)).toThrow()
  for (const issues of [
    [{ kind: 'unused-points', ids: ['missing'], count: 1 }],
    [{ kind: 'unused-points', ids: ['orphan', 'orphan'], count: 2 }],
    [{ kind: 'unused-points', ids: ['orphan'], count: 2 }],
    [
      { kind: 'unused-points', ids: ['orphan'], count: 1 },
      { kind: 'unused-points', ids: ['a'], count: 1 },
    ],
    [{ kind: 'oops', ids: ['orphan'], count: 1 }],
    [{ kind: 'open-edges', ids: ['orphan'], count: 1 }],
  ])
    expect(() =>
      readMeshCheckReply({ ...reply, result: { kind: 'report', issues } }, request),
    ).toThrow()
  const repair = { ...request, action: 'repair' as const, fix: 'unused-points' as const }
  expect(() => readMeshCheckReply(reply, repair)).toThrow()
  expect(() =>
    readMeshCheckReply(
      {
        ...reply,
        result: { kind: 'repair', packet: packSceneMesh({ ...request.mesh, id: 'wrong' }) },
      },
      repair,
    ),
  ).toThrow()
})

test('cancellation terminates the worker, removes listeners and ignores late replies', async () => {
  const events = new EventTarget()
  let terminations = 0
  const worker: TaskWorker = {
    addEventListener: events.addEventListener.bind(events),
    removeEventListener: events.removeEventListener.bind(events),
    postMessage: () => {},
    terminate: () => {
      terminations++
    },
  }
  const controller = new AbortController()
  const task = checkMeshInWorker(fixture(), controller.signal, () => worker)
  controller.abort()
  events.dispatchEvent(new MessageEvent('message', { data: null }))
  await expect(task).rejects.toMatchObject({ name: 'AbortError' })
  expect(terminations).toBe(1)
})
