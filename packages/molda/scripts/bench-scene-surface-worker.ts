// Runtime CPU/transport probe, not a browser FPS, input latency or GPU benchmark.
import { strict as assert } from 'node:assert'
import { cpus, platform } from 'node:os'
import { createModelAsset } from '../src/core/model'
import { editSceneMesh } from '../src/scene/commands'
import type { SceneMeshGeometry } from '../src/scene/document'
import { prepareMeshExtrusion } from '../src/scene/meshExtrude'
import { migrateLegacyModel } from '../src/scene/migrateLegacy'
import { makeSceneGridGeometry } from '../src/testing/sceneFixtures'
import { createSceneSurfaceSession } from '../src/workers/sceneSurfaceSession'

const mesh = makeSceneGridGeometry(process.argv.includes('--stress') ? 96 : 30)
const document = migrateLegacyModel(createModelAsset({ name: 'Cálculo separado', now: 1 })).document
const node = document.nodes[0]!
assert(node.kind === 'mesh')
const source = { ...document, nodes: [{ ...node, geometryId: mesh.id }], geometries: [mesh] }
const faceIds = Object.keys(mesh.faces)
const prepared = prepareMeshExtrusion(mesh, faceIds)
let resolveResult: ((mesh: SceneMeshGeometry) => void) | null = null
let rejectResult: ((error: unknown) => void) | null = null
const worker = createSceneSurfaceSession({
  source: { documentId: source.id, revision: 1, mesh, faceIds, tool: 'extrude' },
  onBusy: () => {},
  onError: (error) => rejectResult?.(error),
  onResult: (mesh) => resolveResult?.(mesh),
})
function workerApply(amount: number): Promise<SceneMeshGeometry> {
  return new Promise((resolve, reject) => {
    resolveResult = resolve
    rejectResult = reject
    if (!worker.update(amount)) reject(new Error('Closed surface worker'))
  })
}
async function measure(operation: () => SceneMeshGeometry | Promise<SceneMeshGeometry>) {
  let last = performance.now()
  let maxGap = 0
  let ticks = 0
  const tick = () => {
    const now = performance.now()
    maxGap = Math.max(maxGap, now - last)
    last = now
    ticks++
  }
  const timer = setInterval(tick, 1)
  const start = performance.now()
  try {
    const result = await operation()
    const next = editSceneMesh(source, node.id, () => result)
    const elapsed = performance.now() - start
    await new Promise((resolve) => setTimeout(resolve, 1))
    assert.equal(next.geometries[0], result)
    return { elapsed, maxGap, ticks, result }
  } finally {
    clearInterval(timer)
  }
}
function pure(amount: number, seed = 'new_') {
  let id = 0
  return prepared.apply(amount, () => `${seed}${++id}`)
}
const p95 = (values: number[]) =>
  values.sort((a, b) => a - b)[Math.ceil(values.length * 0.95) - 1]!.toFixed(3)
try {
  console.log(
    `${platform()}; ${cpus()[0]?.model}; Bun ${Bun.version}; ${faceIds.length} quads; warmup=4 samples=20`,
  )
  for (const mode of ['prepared-sync', 'worker'] as const) {
    const operation = mode === 'worker' ? workerApply : pure
    const first = await measure(() => operation(1.25))
    const generated = Object.keys(first.result.vertices).find(
      (id) => !Object.hasOwn(mesh.vertices, id),
    )!
    const seed = mode === 'worker' ? generated.slice(0, generated.lastIndexOf(':') + 1) : 'new_'
    assert.deepEqual(first.result, pure(1.25, seed))
    for (let i = 0; i < 4; i++) await measure(() => operation(1.25))
    const results = []
    for (let i = 0; i < 20; i++) results.push(await measure(() => operation(1.25)))
    assert.deepEqual(results.at(-1)!.result, pure(1.25, seed))
    console.log(
      `${mode}: first=${first.elapsed.toFixed(3)}ms; total p95=${p95(results.map((r) => r.elapsed))}ms; max timer-gap p95=${p95(results.map((r) => r.maxGap))}ms; timer ticks=${results.reduce((n, r) => n + r.ticks, 0)}; exact geometry=true`,
    )
  }
} finally {
  worker.dispose()
  prepared.dispose()
}
