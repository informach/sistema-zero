// Medição de desempenho (não é teste; rode com `bun scripts/bench-mesh.ts` a partir de packages/molda):
// malha de 1 024 faces e modelo de 128 peças. Os números do CLAUDE.md (seção Malha) vêm daqui.

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
import { packAtlas } from '../src/model/atlas'
import { buildPartGeometry } from '../src/model/geometry'
import { meshEdges, meshIssues } from '../src/model/mesh'
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
  const runs = 5
  let best = Number.POSITIVE_INFINITY
  for (let i = 0; i < runs; i += 1) {
    const t0 = performance.now()
    fn()
    best = Math.min(best, performance.now() - t0)
  }
  console.log(`${label}: ${best.toFixed(1)} ms (melhor de ${runs})`)
}

const mesh = gridMesh(32, 1)
const meshPart = createPart({
  id: 'm',
  name: 'malha',
  shape: 'mesh',
  from: [-16, 0, -16],
  to: [16, 1, 16],
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
time('buildPartGeometry (1 024 quads)', () => buildPartGeometry(meshPart))
time('meshIssues', () => meshIssues(mesh))
time('meshEdges', () => meshEdges(mesh))
time('sanitizeMoldaAsset (modelo com a malha)', () =>
  sanitizeMoldaAsset(structuredClone(meshModel)),
)
time('packAtlas (sem pintura)', () => packAtlas(meshModel))
time('overlay.setMesh (1 024 faces, 100 escolhidos)', () => {
  const overlay = new MeshEditOverlay()
  overlay.setMesh(mesh, [0, 0, 0], Object.keys(mesh.vertices).slice(0, 100))
  overlay.dispose()
})
time('extrudeFaces (uma face)', () =>
  extrudeFaces(meshModel, 'm', ['v_5x5', 'v_5x6', 'v_6x6', 'v_6x5'], 1),
)
time('loopCut (atravessa 32 quads)', () => loopCut(meshModel, 'm', ['v_5x5', 'v_5x6']))

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
