import { cpus } from 'node:os'
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import { OrthographicCamera, Vector3 } from 'three'
import { sceneBounds } from '../src/scene/bounds'
import { indexSceneDocument } from '../src/scene/documentIndex'
import { transformPoint } from '../src/scene/matrix'
import { readSceneDocument } from '../src/scene/readDocument'
import { createSceneSkin } from '../src/scene/skinCommands'
import { createSceneSkinPaintStroke } from '../src/scene/skinPaint'
import { makeSceneGridGeometry } from '../src/testing/sceneFixtures'
import { makeSceneSkinFixture } from '../src/testing/sceneSkin'
import { paintPointerPath } from '../src/viewport/paintPointerPath'
import { SceneRenderResource } from '../src/viewport/sceneRenderResource'
import { pickSceneSkinPaint } from '../src/viewport/sceneSkinPaintPick'
import { sceneSkinPaintSpacing } from '../src/viewport/sceneSkinPaintSpacing'

// CPU picking + domain sampling only: no renderer, GPU, browser input dispatch or overlay uploads.
// Run each mode alone. The new resampled result intentionally differs from endpoint-only painting.
const mode = process.argv[2]
if (mode !== 'recorded' && mode !== 'resampled') throw new Error('Choose recorded or resampled')
// Reviewed lot 221 fixtures: endpoint-only and the intentionally denser screen path have distinct goldens.
const goldens: Record<typeof mode, Record<number, string>> = {
  recorded: {
    31: 'acd9709062a569b4a9f087ca25fc9ab7161c7591db5de5145c34e17f91e9d73a',
    90: 'a61538c86da8b537b400875dfa2102b63d0fcf833811fedb722ca42d3a92ba5b',
  },
  resampled: {
    31: '30858f8b339ec2da64ef2a1cfd617fd71d254812a8032f9123533986a4b4cb95',
    90: '25c23b6a7c77e09dacf851fd7c0f2ffb96e531a2e45d65e7f812963fc42a5b6a',
  },
}
GlobalRegistrator.register()
function stats(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b)
  const at = (q: number) => Number(sorted[Math.ceil(q * sorted.length) - 1]!.toFixed(3))
  return { p50: at(0.5), p95: at(0.95), p99: at(0.99) }
}
console.log(
  JSON.stringify({
    runtime: process.versions.bun,
    cpu: cpus()[0]?.model,
    mode,
    warmups: 3,
    samples: 10,
    canvas: [1024, 768],
    radius: 2,
  }),
)
for (const grid of [31, 90]) {
  const fixture = makeSceneSkinFixture(),
    mesh = makeSceneGridGeometry(grid)
  fixture.document.geometries = [mesh]
  const { id, ...input } = fixture.input
  const read = readSceneDocument(
    createSceneSkin(
      fixture.document,
      {
        ...input,
        weights: Object.fromEntries(
          Object.keys(mesh.vertices).map((vertexId) => [
            vertexId,
            [
              { jointId: 'upper', weight: 0.5 },
              { jointId: 'lower', weight: 0.5 },
            ],
          ]),
        ),
      },
      () => id,
    ),
  )
  if (read.status !== 'valid') throw new Error('Invalid benchmark fixture')
  const source = read.document,
    before = structuredClone(source),
    index = indexSceneDocument(source)
  const bounds = sceneBounds(index)!,
    center = bounds.min.map((value, axis) => (value + bounds.max[axis]!) / 2)
  const halfHeight =
    Math.max((bounds.max[1] - bounds.min[1]) / 2, ((bounds.max[0] - bounds.min[0]) * 3) / 8) * 1.1
  const camera = new OrthographicCamera(
    (-halfHeight * 4) / 3,
    (halfHeight * 4) / 3,
    halfHeight,
    -halfHeight,
    0.1,
    1000,
  )
  camera.position.set(center[0]!, center[1]!, bounds.max[2] + 100)
  camera.updateMatrixWorld(true)
  const canvas = document.createElement('canvas'),
    rect = new DOMRect(0, 0, 1024, 768)
  canvas.getBoundingClientRect = () => rect
  const resource = new SceneRenderResource()
  resource.update(source)
  resource.setFormBase(input.nodeId)
  resource.root.updateMatrixWorld(true)
  const target = { nodeId: input.nodeId, jointId: 'upper' }
  const clients = [0.125, grid / 4 - 0.125].map((x) => {
    const point = new Vector3(
      ...transformPoint(index.scene.worldMatrices.get(input.nodeId)!, [x, grid / 8, 0]),
    ).project(camera)
    return { clientX: (point.x + 1) * 512, clientY: (1 - point.y) * 384 }
  })
  const prepareTimes: number[] = [],
    firstSampleTimes: number[] = [],
    moveTimes: number[] = [],
    commitTimes: number[] = []
  let golden: string | undefined,
    changed = 0,
    queries = 0,
    rss = 0,
    coldFirstPick = 0,
    coldFirstSample = 0
  try {
    for (let run = 0; run < 13; run++) {
      const started = performance.now()
      const stroke = createSceneSkinPaintStroke(source, id, 'upper', {
        mode: 'add',
        radius: 2,
        strength: 0.25,
      })
      const prepared = performance.now()
      const first = pickSceneSkinPaint(canvas, camera, resource, index, target, clients[0]!)
      const picked = performance.now()
      if (!first?.surface) throw new Error('Missing initial surface')
      stroke.sample(first.sample)
      let spacing = sceneSkinPaintSpacing(camera, first.surface.point, 2, rect)
      const movement = performance.now()
      if (run === 0) {
        coldFirstPick = picked - prepared
        coldFirstSample = movement - prepared
      }
      queries = 0
      const path =
        mode === 'recorded'
          ? [clients[1]!]
          : paintPointerPath(clients[0]!, clients[1]!, rect, spacing)
      for (const point of path) {
        queries++
        const hit = pickSceneSkinPaint(canvas, camera, resource, index, target, point)
        spacing = hit?.surface ? sceneSkinPaintSpacing(camera, hit.surface.point, 2, rect) : 1
        if (hit) stroke.sample(hit.sample)
      }
      const moved = performance.now(),
        result = stroke.result(),
        next = stroke.commit(source),
        committed = performance.now()
      if (run >= 3) {
        prepareTimes.push(prepared - started)
        firstSampleTimes.push(movement - prepared)
        moveTimes.push(moved - movement)
        commitTimes.push(committed - moved)
      }
      const hash = new Bun.CryptoHasher('sha256').update(JSON.stringify(result)).digest('hex')
      if (hash !== goldens[mode][grid]) throw new Error('Golden weights changed')
      if (golden && golden !== hash) throw new Error('Non-deterministic weights')
      golden = hash
      changed = result.stats.changed
      for (const [vertexId, rows] of Object.entries(result.patch))
        if (!Bun.deepEquals(next.skins![0]!.weights[vertexId], rows))
          throw new Error('Commit differs from preview')
      if (
        next.geometries !== source.geometries ||
        next.skins![0]!.joints !== source.skins![0]!.joints
      )
        throw new Error('Geometry/binds changed')
      rss = Math.max(rss, process.memoryUsage().rss)
    }
    if (!Bun.deepEquals(source, before)) throw new Error('Source changed')
    console.log(
      JSON.stringify({
        grid,
        vertices: Object.keys(mesh.vertices).length,
        triangles: grid * grid * 2,
        queriesPerMove: queries,
        changed,
        sha256: golden,
        prepareMs: stats(prepareTimes),
        firstSampleMs: stats(firstSampleTimes),
        coldFirstPickMs: Number(coldFirstPick.toFixed(3)),
        coldFirstSampleMs: Number(coldFirstSample.toFixed(3)),
        longMoveMs: stats(moveTimes),
        commitMs: stats(commitTimes),
        sampledRssBytes: rss,
        sourceUnchanged: true,
      }),
    )
  } finally {
    resource.dispose()
  }
}
await GlobalRegistrator.unregister()
