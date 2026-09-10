import { type SceneAnimationKeyInput, setSceneAnimationKey } from '../src/scene/animationCommands'
import { setSceneAnimationKeys } from '../src/scene/animationKeyBatch'
import type { MoldaSceneDocument } from '../src/scene/document'
import { readSceneDocument } from '../src/scene/readDocument'
import { animatedScene } from '../src/testing/sceneAnimation'
import { makeSceneGridGeometry } from '../src/testing/sceneFixtures'

function stats(values: number[]) {
  const ordered = [...values].sort((a, b) => a - b)
  const at = (p: number) => Number(ordered[Math.ceil(p * ordered.length) - 1]!.toFixed(3))
  return { p50: at(0.5), p95: at(0.95), maximum: at(1) }
}

// CPU command-boundary comparison; excludes React, GPU, history allocation and persistence.
for (const [parts, grid] of [
  [1, 96],
  [128, 0],
] as const) {
  const base = animatedScene(),
    mesh = base.nodes.find((node) => node.kind === 'mesh')!
  const geometry = grid ? makeSceneGridGeometry(grid) : base.geometries[0]!
  const source: MoldaSceneDocument = {
    ...base,
    geometries: [geometry],
    mirrors: [],
    nodes: Array.from({ length: parts }, (_, i) => ({
      ...mesh,
      id: `part-${i}`,
      parentId: null,
      geometryId: geometry.id,
    })),
    animations: [{ ...base.animations[0]!, tracks: [] }],
  }
  const read = readSceneDocument(source)
  if (read.status !== 'valid') throw new Error(JSON.stringify(read))
  const inputs: SceneAnimationKeyInput[] = source.nodes.flatMap(
    (node): SceneAnimationKeyInput[] => [
      {
        nodeId: node.id,
        channel: 'translation',
        key: {
          time: 1.123456789123,
          value: [1.23456789123, Number.MIN_VALUE, -2],
          interpolation: 'smooth',
        },
      },
      {
        nodeId: node.id,
        channel: 'rotation',
        key: { time: 1.123456789123, value: [0, 0, 1, 0], interpolation: 'linear' },
      },
      {
        nodeId: node.id,
        channel: 'scale',
        key: { time: 1.123456789123, value: [-1, 2, 0], interpolation: 'step' },
      },
    ],
  )
  const sequential: number[] = [],
    batch: number[] = []
  for (let run = 0; run < 23; run++) {
    const results = (run % 2 ? [true, false] : [false, true]).map((together) => {
      const start = performance.now()
      const result = together
        ? setSceneAnimationKeys(source, 'clip', inputs)
        : inputs.reduce((current, key) => setSceneAnimationKey(current, 'clip', key), source)
      const ms = performance.now() - start
      if (run >= 3) (together ? batch : sequential).push(ms)
      if (
        result.nodes !== source.nodes ||
        result.geometries !== source.geometries ||
        result.images !== source.images
      )
        throw new Error('Untouched resources were copied')
      return result
    })
    if (JSON.stringify(results[0]!.animations) !== JSON.stringify(results[1]!.animations))
      throw new Error('Commands differ')
  }
  console.log(
    JSON.stringify({
      parts,
      faces: grid * grid,
      keys: inputs.length,
      warmup: 3,
      samples: 20,
      sequential: stats(sequential),
      batch: stats(batch),
      identicalAnimations: true,
      untouchedResourcesReused: true,
    }),
  )
}
