// CPU-only benchmark. Run from packages/molda: bun scripts/bench-mesh.ts
// Fixtures and operations are checked before measuring; these are not browser/GPU results.

import { strict as assert } from 'node:assert'
import { cpus, platform, release } from 'node:os'
import { MOLDA_LIMITS } from '../src/core/limits'
import {
  createModelAsset,
  createPart,
  type MeshFace,
  type MeshFaceKey,
  type MoldaMesh,
  type MoldaModelAsset,
  type Vec3,
} from '../src/core/model'
import { sanitizeMoldaAsset } from '../src/core/sanitize'
import { assetFromJson, assetToJson } from '../src/export/assetJson'
import { packAtlas } from '../src/model/atlas'
import { buildPartGeometry } from '../src/model/geometry'
import { meshEdges, meshIssues } from '../src/model/mesh'
import type { MeshPick } from '../src/model/meshSelection'
import { selectMeshTopology } from '../src/model/meshSelectionGraph'
import { extrudeFaces, loopCut } from '../src/model/meshTools'
import { MeshEditOverlay } from '../src/viewport/meshEditOverlay'

function gridMesh(cells: number, unit: number): MoldaMesh {
  const vertices: Record<string, Vec3> = {}
  const faces: Record<MeshFaceKey, MeshFace> = {}
  for (let i = 0; i <= cells; i += 1) {
    for (let j = 0; j <= cells; j += 1)
      vertices[`v_${i}x${j}`] = [i * unit - 16, (i + j) % 2, j * unit - 16]
  }
  for (let i = 0; i < cells; i += 1) {
    for (let j = 0; j < cells; j += 1) {
      faces[`f_${i}x${j}`] = {
        v: [`v_${i}x${j}`, `v_${i}x${j + 1}`, `v_${i + 1}x${j + 1}`, `v_${i + 1}x${j}`],
      }
    }
  }
  return { vertices, faces }
}

function time(label: string, fn: () => unknown): void {
  const runs = 40
  for (let i = 0; i < 8; i += 1) fn()
  const timings: number[] = []
  const heapBefore = process.memoryUsage().heapUsed
  for (let i = 0; i < runs; i += 1) {
    const t0 = performance.now()
    fn()
    timings.push(performance.now() - t0)
  }
  const heapDelta = process.memoryUsage().heapUsed - heapBefore
  timings.sort((a, b) => a - b)
  const percentile = (p: number) => timings[Math.ceil(runs * p) - 1]!.toFixed(2)
  console.log(
    `${label}: p50=${percentile(0.5)}ms p95=${percentile(0.95)}ms p99=${percentile(0.99)}ms; heap delta=${heapDelta}B (GC-dependent, not peak)`,
  )
}

const mesh = gridMesh(30, 1)
const meshPart = createPart({
  id: 'm',
  name: 'malha',
  shape: 'mesh',
  from: [-16, 0, -16],
  to: [14, 1, 14],
  color: 2,
  mesh,
})
const meshModel: MoldaModelAsset = {
  ...createModelAsset({ name: 'perf', starter: false }),
  parts: [meshPart],
}
console.log(
  `malha: ${Object.keys(mesh.vertices).length} vértices, ${Object.keys(mesh.faces).length} faces`,
)
console.log(
  `${platform()} ${release()}; ${cpus()[0]?.model}; Bun ${Bun.version}; warmup=8 samples=40 nearest-rank percentiles`,
)
assert(Object.keys(mesh.vertices).length <= MOLDA_LIMITS.maxMeshVertices)
assert.deepEqual(
  assetFromJson(assetToJson(meshModel)),
  meshModel,
  'fixture must survive native roundtrip unchanged',
)
const extruded = extrudeFaces(meshModel, 'm', ['f_5x5'], 1)
const cut = loopCut(meshModel, 'm', ['v_5x5', 'v_5x6'])
assert(extruded, 'extrude must produce a result')
assert(cut, 'loop cut must produce a result')
assert.notEqual(extruded.model, meshModel, 'extrude must not be a no-op')
assert.equal(Object.keys(extruded.model.parts[0]!.mesh!.faces).length, 904)
assert.notEqual(cut.model, meshModel, 'loop cut must not be a no-op')
assert.equal(Object.keys(cut.model.parts[0]!.mesh!.faces).length, 930)
assert.deepEqual(assetFromJson(assetToJson(extruded.model)), extruded.model)
assert.deepEqual(assetFromJson(assetToJson(cut.model)), cut.model)
time('buildPartGeometry (900 quads)', () => buildPartGeometry(meshPart))
time('meshIssues', () => meshIssues(mesh))
time('meshEdges', () => meshEdges(mesh))
const selectionSeed: MeshPick[] = [{ kind: 'edge', keys: ['v_5x5', 'v_5x6'] }]
assert.equal(selectMeshTopology(mesh, 'edge', selectionSeed, 'connected').length, 1860)
assert.equal(selectMeshTopology(mesh, 'edge', selectionSeed, 'ring').length, 31)
assert.equal(selectMeshTopology(mesh, 'edge', selectionSeed, 'loop').length, 30)
for (const action of ['connected', 'grow', 'shrink', 'ring', 'loop'] as const) {
  time(`selection.${action} (900 quads)`, () =>
    selectMeshTopology(mesh, 'edge', selectionSeed, action),
  )
}
time('sanitizeMoldaAsset (modelo com a malha)', () =>
  sanitizeMoldaAsset(structuredClone(meshModel)),
)
time('packAtlas (sem pintura)', () => packAtlas(meshModel))
time('overlay.setMesh (900 faces, 100 escolhidos)', () => {
  const overlay = new MeshEditOverlay()
  overlay.setMesh(mesh, [0, 0, 0], Object.keys(mesh.vertices).slice(0, 100))
  overlay.dispose()
})
time('extrudeFaces (uma face)', () => extrudeFaces(meshModel, 'm', ['f_5x5'], 1))
time('loopCut (atravessa 30 quads)', () => loopCut(meshModel, 'm', ['v_5x5', 'v_5x6']))

const parts = []
for (let i = 0; i < 128; i += 1) {
  parts.push(
    createPart({
      id: `p${i}`,
      name: `p${i}`,
      from: [(i % 16) * 2 - 16, 0, Math.floor(i / 16) * 2 - 8],
      to: [(i % 16) * 2 - 15, 1, Math.floor(i / 16) * 2 - 7],
      color: 2,
    }),
  )
}
const bigModel: MoldaModelAsset = { ...createModelAsset({ name: 'perf', starter: false }), parts }
time('128 peças: buildPartGeometry em todas', () => {
  for (const part of parts) buildPartGeometry(part)
})
time('128 peças: packAtlas', () => packAtlas(bigModel))
time('128 peças: sanitize', () => sanitizeMoldaAsset(structuredClone(bigModel)))
