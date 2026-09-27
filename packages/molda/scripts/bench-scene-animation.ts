import { Matrix4, Mesh, Quaternion, Vector3 } from 'three'
import type { SceneAnimationTrack } from '../src/scene/animation'
import { prepareSceneBounds, sceneBounds } from '../src/scene/bounds'
import type { ModelSceneNode, MoldaSceneDocument } from '../src/scene/document'
import { indexSceneDocument } from '../src/scene/documentIndex'
import { composeTransform } from '../src/scene/matrix'
import { migrateLegacyModel } from '../src/scene/migrateLegacy'
import { readSceneDocument } from '../src/scene/readDocument'
import { prepareSceneAnimation } from '../src/scene/sampleAnimation'
import { makeModel } from '../src/testing/fixtures'
import { sceneAnimationClip } from '../src/testing/sceneAnimation'
import { makeSceneGridGeometry } from '../src/testing/sceneFixtures'
import { SceneRenderResource } from '../src/viewport/sceneRenderResource'

function stats(values: number[]) {
  values.sort((a, b) => a - b)
  const percentile = (p: number) => +values[Math.ceil(values.length * p) - 1]!.toFixed(3)
  return { p50: percentile(0.5), p95: percentile(0.95), p99: percentile(0.99) }
}

/** CPU-only comparison of two update paths, not a previous animation implementation or GPU benchmark. */
for (const [parts, nodes, keys, grid] of [
  [1, 1, 64, 96],
  [128, 128, 64, 0],
  [128, 512, 42, 0],
] as const) {
  const base = migrateLegacyModel(makeModel()).document
  const meshNode = base.nodes.find((node) => node.kind === 'mesh')!
  const geometry = grid ? makeSceneGridGeometry(grid) : base.geometries[0]!
  const tracks: SceneAnimationTrack[] = []
  const source: MoldaSceneDocument = {
    ...base,
    geometries: [geometry],
    mirrors: [],
    nodes: Array.from({ length: nodes }, (_, i): ModelSceneNode => {
      const common = {
        id: `node-${i}`,
        name: `Peça ${i}`,
        parentId: null,
        transform: meshNode.transform,
        hidden: false,
        locked: false,
      }
      return i < parts
        ? { ...common, kind: 'mesh', geometryId: geometry.id, materialId: meshNode.materialId }
        : { ...common, kind: 'locator' }
    }),
    animations: [{ ...sceneAnimationClip(), duration: 4, tracks }],
  }
  for (const [i, node] of source.nodes.entries()) {
    for (const channel of ['translation', 'scale'] as const)
      tracks.push({
        nodeId: node.id,
        channel,
        keys: Array.from({ length: keys }, (_, j) => {
          const t = j / (keys - 1)
          return {
            time: t * 4,
            value:
              channel === 'translation' ? [2 * t, (i / 100) * t, -t] : [1 + t / 4, 1, 1 - t / 4],
            interpolation: 'linear',
          }
        }),
      })
    tracks.push({
      nodeId: node.id,
      channel: 'rotation',
      keys: Array.from({ length: keys }, (_, j) => {
        const t = j / (keys - 1)
        return {
          time: t * 4,
          value: [0, 0, Math.sin((t * Math.PI) / 2), Math.cos((t * Math.PI) / 2)],
          interpolation: 'linear',
        }
      }),
    })
  }
  const read = readSceneDocument(source)
  if (read.status !== 'valid') throw new Error(JSON.stringify(read))
  const start = performance.now()
  const sampler = prepareSceneAnimation(source, 'clip')
  const compileMs = performance.now() - start
  const index = indexSceneDocument(source)
  const boundsCache = prepareSceneBounds(index)
  const posed = new SceneRenderResource(),
    control = new SceneRenderResource()
  const sampling: number[] = [],
    matrices: number[] = [],
    wholeDocument: number[] = [],
    freshBounds: number[] = [],
    cachedBounds: number[] = [],
    total: number[] = []
  let maximumError = 0
  try {
    posed.update(source)
    control.update(source)
    const resources = posed.root.children.map((object) => {
      if (!(object instanceof Mesh)) throw new Error('Missing mesh')
      return { object, geometry: object.geometry, material: object.material }
    })
    for (let i = 0; i < 130; i++) {
      const seconds = ((i % 100) + 1) * 0.037
      let start = performance.now()
      const pose = sampler.sample(seconds, false)
      const sampleMs = performance.now() - start
      start = performance.now()
      posed.setPose(pose)
      const matrixMs = performance.now() - start
      start = performance.now()
      control.update({
        ...source,
        nodes: source.nodes.map((node) => ({
          ...node,
          transform: { kind: 'affine', matrix: [...pose.worldMatrices.get(node.id)!] },
        })),
      })
      const documentMs = performance.now() - start
      const posedIndex = { ...index, scene: { ...index.scene, worldMatrices: pose.worldMatrices } }
      // Alternate order so allocation/GC spillover is not always charged to the same path.
      const boundsResults = (i % 2 ? [true, false] : [false, true]).map((cached) => {
        const start = performance.now()
        const value = sceneBounds(
          posedIndex,
          { includeLocators: true },
          cached ? boundsCache : undefined,
        )
        return { cached, value, ms: performance.now() - start }
      })
      const fresh = boundsResults.find((result) => !result.cached)!
      const cached = boundsResults.find((result) => result.cached)!
      if (JSON.stringify(fresh.value) !== JSON.stringify(cached.value))
        throw new Error('Cached bounds differ')
      if (i >= 30) {
        sampling.push(sampleMs)
        matrices.push(matrixMs)
        total.push(sampleMs + matrixMs)
        wholeDocument.push(documentMs)
        freshBounds.push(fresh.ms)
        cachedBounds.push(cached.ms)
      }
      // Independent analytic curve + Three matrix composition outside the timed sections.
      const t = seconds / 4
      for (const [j, node] of source.nodes.entries()) {
        const expected = new Matrix4()
          .fromArray(composeTransform(node.transform))
          .multiply(
            new Matrix4().compose(
              new Vector3(2 * t, (j / 100) * t, -t),
              new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), t * Math.PI),
              new Vector3(1 + t / 4, 1, 1 - t / 4),
            ),
          )
        const actual = pose.worldMatrices.get(node.id)!
        for (let k = 0; k < 16; k++)
          maximumError = Math.max(maximumError, Math.abs(actual[k]! - expected.elements[k]!))
      }
      for (const [j, entry] of resources.entries()) {
        if (entry.object.geometry !== entry.geometry || entry.object.material !== entry.material)
          throw new Error('Recreated resource')
        if (!entry.object.matrix.equals(control.root.children[j]!.matrix))
          throw new Error('Update paths differ')
      }
    }
    if (maximumError > 1e-12) throw new Error(`Oracle mismatch ${maximumError}`)
    console.log(
      JSON.stringify({
        parts,
        nodes,
        keys: nodes * keys * 3,
        faces: grid ? grid * grid : null,
        compileMs: +compileMs.toFixed(3),
        sampling: stats(sampling),
        matrices: stats(matrices),
        total: stats(total),
        documentUpdateControl: stats(wholeDocument),
        freshBounds: stats(freshBounds),
        cachedBounds: stats(cachedBounds),
        maximumError,
        resourcesReused: true,
      }),
    )
  } finally {
    posed.dispose()
    control.dispose()
  }
}
