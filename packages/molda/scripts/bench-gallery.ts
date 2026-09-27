/** CPU/IDB-emulation comparison, not browser latency, heap or device certification. */
import assert from 'node:assert/strict'
import { cpus } from 'node:os'
import { IDBFactory, IDBObjectStore } from 'fake-indexeddb'
import { summarizeAsset } from '../src/core/assetSummary'
import { createModelAsset, createPart } from '../src/core/model'
import { createMoldaPersistence } from '../src/state/persistence'
import { DOCUMENT_KEY_PREFIX, SUMMARY_KEY_PREFIX } from '../src/state/storageKeys'

Object.assign(globalThis, { indexedDB: new IDBFactory() })
const persistence = createMoldaPersistence({ namespace: 'bench-summary' })
const assets = Array.from({ length: 120 }, (_, index) => ({
  ...createModelAsset({ name: `modelo-${index}`, now: 1000 + index, starter: false }),
  id: `model-${index}`,
  parts: Array.from({ length: 128 }, (_, part) =>
    createPart({
      id: `p${part}`,
      name: `peca-${part}`,
      color: 1 + (part % 15),
      from: [(part % 8) - 4, Math.floor(part / 8) % 4, Math.floor(part / 32) - 2],
      to: [(part % 8) - 3, (Math.floor(part / 8) % 4) + 1, Math.floor(part / 32) - 1],
    }),
  ),
}))
await persistence.saveMany(assets)
let documents = 0
let summaries = 0
const originalCursor = IDBObjectStore.prototype.openCursor
IDBObjectStore.prototype.openCursor = function (...args) {
  if (typeof args[0] === 'string') {
    if (args[0].startsWith(DOCUMENT_KEY_PREFIX)) documents += 1
    if (args[0].startsWith(SUMMARY_KEY_PREFIX)) summaries += 1
  }
  return originalCursor.apply(this, args)
}

async function measure(name: string, task: () => Promise<unknown>): Promise<void> {
  for (let i = 0; i < 3; i += 1) await task()
  documents = summaries = 0
  const times: number[] = []
  for (let i = 0; i < 20; i += 1) {
    const start = performance.now()
    await task()
    times.push(performance.now() - start)
  }
  times.sort((a, b) => a - b)
  console.log({
    name,
    p50: times[9]?.toFixed(2),
    p95: times[18]?.toFixed(2),
    documentReadsPerList: documents / 20,
    summaryReadsPerList: summaries / 20,
  })
}

try {
  console.log({
    runtime: Bun.version,
    cpu: cpus()[0]?.model,
    documents: 120,
    partsPerModel: 128,
    warmups: 3,
    samples: 20,
    environment: 'fake-indexeddb; no browser/GPU',
  })
  const listing = persistence.listSummaries
  assert.ok(listing)
  const before = (await persistence.loadAll())
    .map(summarizeAsset)
    .sort((a, b) => a.id.localeCompare(b.id))
  const after = (await listing()).sort((a, b) => a.id.localeCompare(b.id))
  assert.deepEqual(after, before)
  await measure('loadAll + summaries', async () =>
    (await persistence.loadAll()).map(summarizeAsset),
  )
  await measure('indexed summaries', listing)
  assert.equal(documents, 0)
  assert.equal(summaries, 120 * 20)
} finally {
  IDBObjectStore.prototype.openCursor = originalCursor
  persistence.dispose?.()
}
