import { cpus } from 'node:os'
import { indexSceneDocument } from '../src/scene/documentIndex'
import { transformPoint } from '../src/scene/matrix'
import { readSceneDocument } from '../src/scene/readDocument'
import { createSceneSkin } from '../src/scene/skinCommands'
import { createSceneSkinPaintStroke } from '../src/scene/skinPaint'
import { makeSceneGridGeometry } from '../src/testing/sceneFixtures'
import { makeSceneSkinFixture } from '../src/testing/sceneSkin'

// Lot 120 baseline. A change here requires an explicit review of painted weights and refusals.
const goldens: Record<number, string> = {
  1024: '27fba6087dafc4695c6aadb7e4834d8d1c85c64b81635b571636fb4a3b7b5d64',
  8281: 'a341e4ac86fa10de36e84037116f4c86c31eda70db00f7d644629324a280bfc5',
  131072: 'a341e4ac86fa10de36e84037116f4c86c31eda70db00f7d644629324a280bfc5',
}

function stats(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b),
    at = (quantile: number) => Number(sorted[Math.ceil(sorted.length * quantile) - 1]!.toFixed(3))
  return { p50: at(0.5), p95: at(0.95), p99: at(0.99), max: at(1) }
}
// CPU domain baseline, not browser input/GPU. Run alone, without concurrent tests/builds.
console.log(
  JSON.stringify({
    bun: process.versions.bun,
    cpu: cpus()[0]?.model,
    warmup: 3,
    runs: 10,
    movementSamplesPerStroke: 32,
  }),
)
for (const [grid, vertexCount] of [
  [31, 1024],
  [90, 8281],
  [100, 131072],
] as const) {
  const {
      document,
      input: { id, ...input },
    } = makeSceneSkinFixture(),
    mesh = makeSceneGridGeometry(grid)
  for (let i = (grid + 1) ** 2; i < vertexCount; i++) mesh.vertices[`loose-${i}`] = [0, 0, 0]
  document.geometries = [mesh]
  input.weights = Object.fromEntries(
    Object.keys(mesh.vertices).map((id) => [
      id,
      [
        { jointId: 'upper', weight: 0.5 },
        { jointId: 'lower', weight: 0.5 },
      ],
    ]),
  )
  const read = readSceneDocument(createSceneSkin(document, input, () => id))
  if (read.status !== 'valid') throw new Error(JSON.stringify(read))
  const source = read.document,
    before = structuredClone(source),
    matrix = indexSceneDocument(source).scene.worldMatrices.get(input.nodeId)!,
    samples = Array.from({ length: 33 }, (_, i) => {
      const x = i % grid
      return { faceId: `f_${x}_0`, point: transformPoint(matrix, mesh.vertices[`v_${x}_0`]!) }
    }),
    prepare: number[] = [],
    first: number[] = [],
    movement: number[] = [],
    commit: number[] = []
  let golden: string | undefined,
    changed = 0,
    rss = 0
  for (let run = 0; run < 13; run++) {
    const started = performance.now(),
      stroke = createSceneSkinPaintStroke(source, id, 'upper', {
        mode: 'add',
        radius: 2,
        strength: 0.25,
      }),
      prepared = performance.now()
    stroke.sample(samples[0]!)
    const touched = performance.now()
    if (run >= 3) {
      prepare.push(prepared - started)
      first.push(touched - prepared)
    }
    for (const sample of samples.slice(1)) {
      const from = performance.now()
      stroke.sample(sample)
      if (run >= 3) movement.push(performance.now() - from)
    }
    const from = performance.now(),
      result = stroke.result(),
      next = stroke.commit(source)
    if (run >= 3) commit.push(performance.now() - from)
    const hash = new Bun.CryptoHasher('sha256').update(JSON.stringify(result)).digest('hex')
    if (hash !== goldens[vertexCount]) throw new Error('Golden result changed')
    if (golden && golden !== hash) throw new Error('Non-deterministic stroke')
    for (const [vertexId, weights] of Object.entries(result.patch))
      if (!Bun.deepEquals(next.skins![0]!.weights[vertexId], weights))
        throw new Error('Commit differs from the golden patch')
    golden = hash
    changed = result.stats.changed
    if (
      next.skins![0]!.joints !== source.skins![0]!.joints ||
      next.geometries !== source.geometries
    )
      throw new Error('Authorial bind/geometry changed')
    rss = Math.max(rss, process.memoryUsage().rss)
  }
  if (!Bun.deepEquals(source, before)) throw new Error('Source changed')
  console.log(
    JSON.stringify({
      grid,
      vertices: vertexCount,
      triangles: grid * grid * 2,
      changed,
      prepareMs: stats(prepare),
      firstSampleMs: stats(first),
      movementMs: stats(movement),
      sparseCommandMs: stats(commit),
      sha256: golden,
      sampledRssBytes: rss,
      sourceUnchanged: true,
    }),
  )
}
