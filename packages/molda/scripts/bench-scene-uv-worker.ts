import { strict as assert } from 'node:assert'
import { cpus, platform } from 'node:os'
import type { SceneMeshGeometry } from '../src/scene/document'
import { autoMeshUv } from '../src/scene/meshUvAuto'
import { unfoldMeshUv } from '../src/scene/meshUvUnfold'
import { readSceneGeometry } from '../src/scene/readGeometry'
import { makeSceneGridGeometry } from '../src/testing/sceneFixtures'
import { autoUvInWorker } from '../src/workers/sceneUv'

/** One-shot worker/clone/reply validation probe. No React, commit, viewport, GPU or input-latency claim. */
function stats(values: number[]) {
  values.sort((a, b) => a - b)
  return {
    p50: +values[Math.floor(values.length / 2)]!.toFixed(3),
    p95: +values[Math.ceil(values.length * 0.95) - 1]!.toFixed(3),
  }
}
console.info(`${platform()}; ${cpus()[0]?.model}; Bun ${Bun.version}; warmup=3 samples=20`)
for (const size of [16, 48, 96]) {
  const mesh = makeSceneGridGeometry(size),
    faceIds = Object.keys(mesh.faces),
    padding = 0.001
  assert.deepEqual(readSceneGeometry(mesh), mesh)
  for (const preserveCuts of [false, true]) {
    const expected = preserveCuts
      ? autoMeshUv(mesh, faceIds, padding)
      : unfoldMeshUv(mesh, faceIds, padding)
    const elapsed: number[] = [],
      gaps: number[] = []
    let ticks = 0
    for (let sample = 0; sample < 23; sample++) {
      let last = performance.now(),
        maxGap = 0,
        count = 0
      const timer = setInterval(() => {
        const now = performance.now()
        maxGap = Math.max(maxGap, now - last)
        last = now
        count++
      }, 1)
      let result: SceneMeshGeometry
      let total = 0
      try {
        const start = performance.now()
        result = await autoUvInWorker({
          mesh,
          faceIds,
          padding,
          sourceKey: `bench:${sample}`,
          unfold: { cuts: [], preserveCuts },
        })
        total = performance.now() - start
        await new Promise((resolve) => setTimeout(resolve, 1))
      } finally {
        clearInterval(timer)
      }
      assert.deepEqual(result, expected)
      assert.equal(result.vertices, mesh.vertices)
      if (sample >= 3) {
        elapsed.push(total)
        gaps.push(maxGap)
        ticks += count
      }
    }
    console.info(
      JSON.stringify({
        faces: faceIds.length,
        preserveCuts,
        samples: elapsed.length,
        totalMs: stats(elapsed),
        maxTimerGapMs: stats(gaps),
        ticks,
        exact: true,
      }),
    )
  }
}
