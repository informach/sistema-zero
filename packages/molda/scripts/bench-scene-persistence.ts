import assert from 'node:assert/strict'
import { cpus } from 'node:os'
import type { UseStore } from 'idb-keyval'
import { structuredBytes } from '../src/core/structuredBytes'
import type { MoldaSceneDocument } from '../src/scene/document'
import { readSceneDocument } from '../src/scene/readDocument'
import { createScenePersistence } from '../src/state/scenePersistence'
import { nativeDatabase } from '../src/testing/nativeDatabase'
import { makeSceneAtlasDocument } from '../src/testing/sceneAtlasFixture'

/** Real persistence with fake-indexeddb: CPU/clone/transaction baseline, NOT browser disk IO. */
const WARMUP = 3
const SAMPLES = 10
const scenarios = [
  { name: 'small', side: 0, layers: 0, projects: 1, unique: false },
  { name: 'shared-8MiB', side: 512, layers: 4, projects: 1, unique: false },
  { name: 'unique-8MiB', side: 512, layers: 4, projects: 1, unique: true },
  { name: 'gallery-32MiB', side: 512, layers: 4, projects: 4, unique: false },
  { name: 'ceiling-32MiB', side: 1024, layers: 4, projects: 1, unique: true },
] as const
// Captured from the inline writer before any blob codec or persistence change (L215).
const goldens: Record<string, readonly [string, string]> = {
  small: [
    'a5927a62a1bf6a104c4e3f4822f8245939296393bbd48a75c41001856bb27d15',
    '2fbd535b665696dc0ba8b7fe20822ba22de679c6abdd2e837843735cd606fcfb',
  ],
  'shared-8MiB': [
    '90c2a5f0e51e54ad455074d0a39d8155a709845e4b2acd2968796acb1dc00540',
    'ca781b0ed119d4d0031d70a4ece8a989ce76039409007875dd9e743335657068',
  ],
  'unique-8MiB': [
    'e21e9124067e1ef8254ba090bf859debf44f623df59e680900cbf60a3b265e1b',
    'e86745482af69059cc4d424bf7c6a96e96f017018e6daa154b723df5b80a2b22',
  ],
  'gallery-32MiB': [
    '90c2a5f0e51e54ad455074d0a39d8155a709845e4b2acd2968796acb1dc00540',
    'ca781b0ed119d4d0031d70a4ece8a989ce76039409007875dd9e743335657068',
  ],
  'ceiling-32MiB': [
    '73ed729a3045de9c1f510b27b576013d6c3172854127e8a6a63160c795fe416b',
    '4288e987fbf406938c54be03c285c7072b5e50ec19dac9a86da590dcd825629a',
  ],
}

function fixture(config: (typeof scenarios)[number]): MoldaSceneDocument {
  const source = makeSceneAtlasDocument()
  const result = {
    ...source,
    images: config.side
      ? source.images.map((image, imageIndex) => ({
          ...image,
          width: config.side,
          height: config.side,
          encoding: 'rgba' as const,
          layers: Array.from({ length: config.layers }, (_, layerIndex) => {
            const pixels = new Uint8Array(config.side * config.side * 4)
            const variant = config.unique ? imageIndex * config.layers + layerIndex : 0
            for (let i = 0; i < pixels.length; i++) pixels[i] = (i * 31 + variant * 17) % 256
            return {
              id: `layer-${layerIndex}`,
              name: `Camada ${layerIndex}`,
              visible: layerIndex !== 1,
              opacity: layerIndex === 2 ? 0.5 : 1,
              pixels,
            }
          }),
        }))
      : source.images,
  }
  const read = readSceneDocument(result)
  assert.equal(read.status, 'valid')
  if (read.status !== 'valid') throw new Error('Invalid benchmark fixture')
  return read.document
}

/** Ordered metadata plus exact raw channels, including invisible paint/RGB under alpha zero. */
function digest(document: MoldaSceneDocument): string {
  const hash = new Bun.CryptoHasher('sha256')
  hash.update(
    JSON.stringify({
      ...document,
      images: document.images.map((image) => ({
        ...image,
        layers: image.layers.map((layer) => ({ ...layer, pixels: layer.pixels.byteLength })),
      })),
    }),
  )
  for (const image of document.images) for (const layer of image.layers) hash.update(layer.pixels)
  return hash.digest('hex')
}

function stats(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b)
  const at = (q: number) => Number(sorted[Math.ceil(sorted.length * q) - 1]!.toFixed(3))
  return { p50: at(0.5), p95: at(0.95), p99: at(0.99) }
}

/** Separate diagnostic pass; the timed path does not instrument object-store requests. */
function observe(store: UseStore) {
  const reads: string[] = []
  const writes: Array<{ key: string; payloadBytes: number }> = []
  const observed: UseStore = (mode, callback) =>
    store(mode, (objectStore) =>
      callback(
        new Proxy(objectStore, {
          get(target, property) {
            if (property === 'get')
              return (key: IDBValidKey | IDBKeyRange) => {
                reads.push(String(key))
                return target.get(key)
              }
            if (property === 'openCursor')
              return (key?: IDBValidKey | IDBKeyRange | null, direction?: IDBCursorDirection) => {
                reads.push(String(key))
                return target.openCursor(key, direction)
              }
            if (property === 'getAll')
              return (key?: IDBValidKey | IDBKeyRange | null, count?: number) => {
                reads.push(`*getAll:${String(key)}*`)
                return target.getAll(key, count)
              }
            if (property === 'put')
              return (value: unknown, key?: IDBValidKey) => {
                writes.push({ key: String(key), payloadBytes: structuredBytes(value) })
                return target.put(value, key)
              }
            const value = Reflect.get(target, property, target)
            return typeof value === 'function' ? value.bind(target) : value
          },
        }),
      ),
    )
  return { store: observed, reads, writes }
}

console.info(
  JSON.stringify({
    runtime: process.versions.bun,
    cpu: cpus()[0]?.model,
    platform: process.platform,
    warmup: WARMUP,
    samples: SAMPLES,
    storage: 'fake-indexeddb; costs are structuredBytes estimates, not physical disk bytes',
  }),
)

const scenarioName = process.argv[2]
if (scenarioName && !scenarios.some((scenario) => scenario.name === scenarioName))
  throw new Error('Unknown benchmark scenario')
for (const config of scenarios.filter(
  (scenario) => !scenarioName || scenario.name === scenarioName,
)) {
  const source = fixture(config)
  const sourceDigest = digest(source)
  assert.equal(sourceDigest, goldens[config.name]![0], 'Source golden changed')
  let current = source
  const db = await nativeDatabase({ name: `scene-persistence-${config.name}` })
  try {
    const persistence = createScenePersistence(db.store)
    for (let i = 0; i < config.projects; i++) {
      const doc = i === 0 ? source : { ...source, id: `copy-${i}` }
      assert.deepEqual(await persistence.save(doc, null), { status: 'saved', revision: 1 })
    }
    let revision = 1
    const times = { saveMetadata: [], savePaint: [], read: [], list: [] } as Record<
      'saveMetadata' | 'savePaint' | 'read' | 'list',
      number[]
    >
    let sampledRssBytes = 0
    let sampledHeapUsedBytes = 0
    for (let run = 0; run < WARMUP + SAMPLES; run++) {
      const metadata = { ...current, name: `Nome editado ${run}`, updatedAt: current.updatedAt + 1 }
      const painted = structuredClone(metadata)
      painted.images[0]!.layers[0]!.pixels[0]! ^= 1
      // Deliberate GC OUTSIDE timed operations. Results report sampled memory, not peak RAM.
      Bun.gc(true)
      for (const [operation, document] of [
        ['saveMetadata', metadata],
        ['savePaint', painted],
      ] as const) {
        const start = performance.now()
        const result = await persistence.save(document, revision)
        const ms = performance.now() - start
        assert.deepEqual(result, { status: 'saved', revision: ++revision })
        if (run >= WARMUP) times[operation].push(ms)
      }
      let start = performance.now()
      const read = await persistence.read(source.id)
      const readMs = performance.now() - start
      assert.equal(read.status, 'active')
      if (read.status !== 'active') throw new Error('Saved fixture missing')
      assert.ok(Bun.deepEquals(read.document, painted), 'Roundtrip changed authorial data')
      start = performance.now()
      const list = await persistence.listSummaries()
      const listMs = performance.now() - start
      assert.equal(list.summaries.length, config.projects)
      assert.equal(list.issues.length, 0)
      if (run >= WARMUP) {
        times.read.push(readMs)
        times.list.push(listMs)
      }
      const memory = process.memoryUsage()
      sampledRssBytes = Math.max(sampledRssBytes, memory.rss)
      sampledHeapUsedBytes = Math.max(sampledHeapUsedBytes, memory.heapUsed)
      current = painted
    }
    const observed = observe(db.store)
    assert.equal(
      (
        await createScenePersistence(observed.store).save(
          { ...current, name: 'Somente o nome mudou' },
          revision,
        )
      ).status,
      'saved',
    )
    const stored = await db.dump()
    const rawPayloadBytes = [...stored.values()].reduce<number>(
      (sum, value) => sum + structuredBytes(value),
      0,
    )
    const unique = new Map<string, number>()
    let pixelBytes = 0
    for (const image of source.images)
      for (const layer of image.layers) {
        pixelBytes += layer.pixels.byteLength
        unique.set(
          new Bun.CryptoHasher('sha256').update(layer.pixels).digest('hex'),
          layer.pixels.byteLength,
        )
      }
    assert.equal(digest(source), sourceDigest, 'Caller source changed')
    assert.equal(digest(current), goldens[config.name]![1], 'Painted golden changed')
    const milliseconds = Object.fromEntries(
      Object.entries(times).map(([operation, values]) => [operation, stats(values)]),
    )
    console.info(
      JSON.stringify({
        scenario: config.name,
        projects: config.projects,
        pixelBytesPerProject: pixelBytes,
        initialUniquePixelBytesInGallery: [...unique.values()].reduce((a, b) => a + b, 0),
        rawPayloadBytes,
        milliseconds,
        metadataSavesPerSecondAtP50: Number((1000 / stats(times.saveMetadata).p50).toFixed(3)),
        sampledRssBytes,
        sampledHeapUsedBytes,
        diagnosticMetadataSave: { reads: observed.reads, writes: observed.writes },
        sourceSha256: sourceDigest,
        paintedSha256: digest(current),
        sourceUnchanged: true,
      }),
    )
  } finally {
    db.close()
  }
}
