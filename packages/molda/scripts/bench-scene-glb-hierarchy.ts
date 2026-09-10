import { prepareSceneGlbHierarchy } from '../src/export/sceneGlbHierarchy'
import type { ModelSceneNode, MoldaSceneDocument } from '../src/scene/document'
import { identityMatrix } from '../src/scene/matrix'
import { animatedScene } from '../src/testing/sceneAnimation'

function stats(values: number[]) {
  values.sort((a, b) => a - b)
  const at = (p: number) => +values[Math.ceil(values.length * p) - 1]!.toFixed(3)
  return { p50: at(0.5), p95: at(0.95), max: at(1) }
}
// Baseline for new export preparation, not a before/after optimization comparison.
for (const [groups, parts, mirrors] of [
  [0, 1, 0],
  [0, 128, 0],
  [448, 64, 64],
] as const) {
  const base = animatedScene(),
    mesh = base.nodes.find((node) => node.kind === 'mesh')!
  const matrix = identityMatrix()
  matrix[4] = 0.001
  const nodes: ModelSceneNode[] = Array.from({ length: groups }, (_, i) => ({
    id: `group-${i}`,
    name: `Grupo ${i}`,
    parentId: i ? `group-${i - 1}` : null,
    kind: 'group',
    transform: { kind: 'affine', matrix },
    hidden: false,
    locked: false,
  }))
  for (let i = 0; i < parts; i++)
    nodes.push({
      ...mesh,
      id: `part-${i}`,
      parentId: groups ? `group-${groups - 1}` : null,
      transform: { kind: 'affine', matrix },
    })
  const source: MoldaSceneDocument = {
    ...base,
    nodes,
    animations: [],
    mirrors: Array.from({ length: mirrors }, (_, i) => ({
      id: `mirror-${i}`,
      name: `Espelho ${i}`,
      axis: 'x',
      offset: 0,
      sourceId: `part-${i}`,
    })),
  }
  const samples: number[] = []
  const golden = JSON.stringify(prepareSceneGlbHierarchy(source).nodes)
  let exportedNodes = 0
  for (let i = 0; i < 40; i++) {
    const start = performance.now()
    const result = prepareSceneGlbHierarchy(source)
    const elapsed = performance.now() - start
    if (i >= 10) samples.push(elapsed)
    exportedNodes = result.nodes.length
    if (JSON.stringify(result.nodes) !== golden) throw new Error('Non-deterministic hierarchy')
  }
  console.log(
    JSON.stringify({
      groups,
      parts,
      mirrors,
      exportedNodes,
      nodeJsonBytes: new TextEncoder().encode(golden).length,
      preparation: stats(samples),
      deterministic: true,
    }),
  )
}
