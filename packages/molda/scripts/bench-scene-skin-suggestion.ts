import { cpus } from 'node:os'
import type { SceneMeshGeometry } from '../src/scene/document'
import { identityMatrix } from '../src/scene/matrix'
import { readSceneDocument } from '../src/scene/readDocument'
import { prepareSceneSkinSuggestion } from '../src/scene/skinSuggestion'
import { makeSceneSkinFixture } from '../src/testing/sceneSkin'
import { suggestSkinInWorker } from '../src/workers/sceneSkinSuggestion'

// Captured before the lot 110 optimization. Updating these requires an explicit behavior review.
const goldens: Record<number, string> = {
  1024: '2494349f09bc26c1e0e89d45f1b82c88ad98a306ff77b968ab732324330223e1',
  8192: '3d61fb6128fe09398380464f68b7cc0eae2e0ff72b0c34fd4689501fd784fc3d',
  131072: '2efdb97bdc22d9cd94468c16e6f367ff1ecd938188b8ff1d8b186d8c40489c36',
}

function stats(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b)
  const rounded = (value: number) => Number(value.toFixed(3))
  return {
    minimum: rounded(sorted[0]!),
    median: rounded(sorted[Math.floor(sorted.length / 2)]!),
    p95: rounded(sorted[Math.ceil(sorted.length * 0.95) - 1]!),
    p99: rounded(sorted[Math.ceil(sorted.length * 0.99) - 1]!),
    maximum: rounded(sorted.at(-1)!),
  }
}

// CPU/transport baseline, not browser input latency or GPU throughput. Run without builds/tests.
console.log(
  JSON.stringify({
    bun: process.versions.bun,
    platform: process.platform,
    cpu: cpus()[0]?.model,
    warmup: 3,
    samples: 10,
  }),
)
for (const [vertices, jointCount] of [
  [1024, 16],
  [8192, 64],
  [131072, 256],
] as const) {
  const { document } = makeSceneSkinFixture(),
    mesh = document.nodes[0]!
  document.nodes = [
    { ...mesh, parentId: null, transform: { kind: 'affine', matrix: identityMatrix() } },
    ...Array.from({ length: jointCount }, (_, i) => ({
      id: `joint-${i}`,
      name: `Osso ${i}`,
      kind: 'locator' as const,
      parentId: i === 0 ? null : `joint-${i - 1}`,
      hidden: false,
      locked: false,
      transform: {
        kind: 'trs' as const,
        translation: [0, 1 / 256, 0] as [number, number, number],
        rotation: [0, 0, 0, 1] as [number, number, number, number],
        scale: [1, 1, 1] as [number, number, number],
      },
    })),
  ]
  const geometry = document.geometries[0] as SceneMeshGeometry
  geometry.vertices = {
    ...geometry.vertices,
    ...Object.fromEntries(
      Array.from({ length: vertices - 4 }, (_, i) => [
        `point-${i}`,
        [(i % 64) / 64 - 0.5, (Math.floor(i / 64) % 256) / 256, 0.1],
      ]),
    ),
  }
  const read = readSceneDocument(document)
  if (read.status !== 'valid') throw new Error(JSON.stringify(read))
  const source = read.document,
    before = structuredClone(source),
    prepare: number[] = [],
    dispatch: number[] = [],
    replyAndResolve: number[] = [],
    total: number[] = []
  let golden: string | undefined,
    sampledRssBytes = 0
  for (let run = 0; run < 13; run++) {
    let replyStarted = 0
    const started = performance.now(),
      data = prepareSceneSkinSuggestion(source, {
        nodeId: mesh.id,
        jointIds: source.nodes.slice(1).map((node) => node.id),
        method: 'segments',
      }),
      prepared = performance.now(),
      pending = suggestSkinInWorker(
        { sourceKey: `benchmark:${vertices}:${jointCount}:${run}`, data },
        undefined,
        () => {
          const worker = new Worker(
            new URL('../src/workers/sceneSkinSuggestion.worker.ts', import.meta.url),
            { type: 'module' },
          )
          // Registered before the task reader: includes reply validation, cleanup and resolution.
          worker.addEventListener('message', () => {
            replyStarted = performance.now()
          })
          return worker
        },
      ),
      sent = performance.now(),
      result = await pending,
      done = performance.now()
    if (run >= 3) {
      prepare.push(prepared - started)
      dispatch.push(sent - prepared)
      replyAndResolve.push(done - replyStarted)
      total.push(done - started)
    }
    const hash = new Bun.CryptoHasher('sha256').update(JSON.stringify(result)).digest('hex')
    if (hash !== goldens[vertices]) throw new Error('Golden result changed')
    if (golden !== undefined && golden !== hash) throw new Error('Non-deterministic result')
    golden = hash
    sampledRssBytes = Math.max(sampledRssBytes, process.memoryUsage().rss)
    if (
      Object.keys(result.weights).length !== vertices ||
      data.positions.byteLength !== vertices * 3 * 8
    )
      throw new Error('Lost points or detached source buffer')
  }
  if (!Bun.deepEquals(source, before)) throw new Error('Source changed')
  console.log(
    JSON.stringify({
      vertices,
      joints: jointCount,
      prepareMs: stats(prepare),
      dispatchMs: stats(dispatch),
      replyAndResolveMs: stats(replyAndResolve),
      totalMs: stats(total),
      sha256: golden,
      sampledRssBytes,
      sourceUnchanged: true,
      sourceBuffersAttached: true,
    }),
  )
}
