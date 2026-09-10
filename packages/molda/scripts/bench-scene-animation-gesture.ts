import { Mesh } from 'three'
import type { SceneAnimationKeyInput } from '../src/scene/animationCommands'
import { setSceneAnimationKeys } from '../src/scene/animationKeyBatch'
import { prepareSceneAnimationPoseTransform } from '../src/scene/animationPoseTransform'
import type { ModelSceneNode, MoldaSceneDocument } from '../src/scene/document'
import { identityMatrix } from '../src/scene/matrix'
import { readSceneDocument } from '../src/scene/readDocument'
import { prepareSceneAnimation, type SceneAnimationPose } from '../src/scene/sampleAnimation'
import { animatedScene } from '../src/testing/sceneAnimation'
import { makeSceneGridGeometry } from '../src/testing/sceneFixtures'
import { SceneRenderResource } from '../src/viewport/sceneRenderResource'

function stats(values: number[]) {
  values.sort((a, b) => a - b)
  const at = (p: number) => +values[Math.ceil(values.length * p) - 1]!.toFixed(3)
  return { p50: at(0.5), p95: at(0.95), max: at(1) }
}

// Current batch-key + recompile path is a comparative control, not an older shipped gizmo.
for (const [parts, count, grid] of [
  [1, 1, 96],
  [128, 128, 0],
  [128, 512, 0],
] as const) {
  const base = animatedScene(),
    mesh = base.nodes.find((node) => node.kind === 'mesh')!
  const geometry = grid ? makeSceneGridGeometry(grid) : base.geometries[0]!
  const source: MoldaSceneDocument = {
    ...base,
    mirrors: [],
    geometries: [geometry],
    nodes: Array.from({ length: count }, (_, i): ModelSceneNode => {
      const common = {
        id: `part-${i}`,
        name: `Peça ${i}`,
        parentId: null,
        transform: mesh.transform,
        hidden: false,
        locked: false,
      }
      return i < parts
        ? { ...common, kind: 'mesh', geometryId: geometry.id, materialId: mesh.materialId }
        : { ...common, kind: 'locator' }
    }),
    animations: [{ ...base.animations[0]!, tracks: [] }],
  }
  const keyCount = count === 512 ? 128 : 64
  source.animations![0]!.tracks = source.nodes.map((node) => ({
    nodeId: node.id,
    channel: 'translation',
    keys: Array.from({ length: keyCount }, (_, j) => ({
      time: (j / keyCount) * 2,
      value: [0, 0, 0],
      interpolation: 'linear',
    })),
  }))
  const read = readSceneDocument(source)
  if (read.status !== 'valid') throw new Error(JSON.stringify(read))
  const ids = source.nodes.map((node) => node.id)
  const started = performance.now()
  const prepared = prepareSceneAnimationPoseTransform(source, 'clip', ids, 0)
  const prepareMs = performance.now() - started
  const fast = new SceneRenderResource(),
    control = new SceneRenderResource()
  const update: number[] = [],
    rebuild: number[] = []
  try {
    fast.update(source)
    control.update(source)
    const resources = fast.root.children.map((object) => {
      if (!(object instanceof Mesh)) throw new Error('Expected mesh')
      return { object, geometry: object.geometry, material: object.material }
    })
    for (let i = 0; i < 40; i++) {
      const delta = identityMatrix()
      delta[12] = (i + 1) / 100
      let actual: SceneAnimationPose | null = null,
        expected: SceneAnimationPose | null = null
      for (const usePrepared of i % 2 ? [true, false] : [false, true]) {
        const start = performance.now()
        if (usePrepared) {
          actual = prepared.apply(prepared.original, delta).pose
          fast.setPose(actual)
          if (i >= 10) update.push(performance.now() - start)
        } else {
          const keys: SceneAnimationKeyInput[] = ids.map((nodeId) => ({
            nodeId,
            channel: 'translation',
            key: { time: 0, value: [delta[12], 0, 0], interpolation: 'linear' },
          }))
          const candidate = setSceneAnimationKeys(source, 'clip', keys)
          expected = prepareSceneAnimation(candidate, 'clip').sample(0, false)
          control.update(candidate)
          control.setPose(expected)
          if (i >= 10) rebuild.push(performance.now() - start)
        }
      }
      if (
        JSON.stringify([...actual!.worldMatrices]) !== JSON.stringify([...expected!.worldMatrices])
      )
        throw new Error('Pose outputs differ')
      for (const entry of resources)
        if (entry.object.geometry !== entry.geometry || entry.object.material !== entry.material)
          throw new Error('Recreated GPU resource')
    }
    console.log(
      JSON.stringify({
        parts,
        nodes: count,
        keys: count * keyCount,
        faces: grid ? grid * grid : null,
        prepareMs: +prepareMs.toFixed(3),
        preparedPoseAndResource: stats(update),
        batchRecompileAndResourceControl: stats(rebuild),
        exactWorldMatrices: true,
        resourcesReused: true,
      }),
    )
  } finally {
    fast.dispose()
    control.dispose()
  }
}
