import { afterEach, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {
  type ImportInventory,
  type ImportSourceResult,
  type ImportStart,
  importSourceLoadSchema,
  inventorySchema,
  UPLOAD_PART_BYTES,
  type UploadView,
} from '@sistemazero/marketing-contracts'
import { InventoryStore } from '../src/main/imports/inventory-store'
import type { SyncTransport } from '../src/main/sync/sync-engine'

const owned: string[] = []
afterEach(async () => {
  for (const directory of owned.splice(0)) await rm(directory, { recursive: true, force: true })
})
class ConfirmedInventory implements SyncTransport {
  results = new Map<number, ImportSourceResult>()
  writes: number[] = []
  lost = false
  constructor(
    readonly projectId: string,
    readonly start: ImportStart,
    readonly inventory: ImportInventory,
  ) {}
  async request(route: string, method = 'GET', body?: unknown) {
    if (method === 'GET') {
      const cursor = Number(new URL(route, 'https://review.test').searchParams.get('cursor') ?? 0)
      return {
        run: {
          ...this.start,
          projectId: this.projectId,
          createdBy: '00000000-0000-4000-8000-000000000001',
          createdAt: this.start.capturedAt,
          state: 'inventoried',
          received: this.start.entryCount,
        },
        entries: this.inventory.entries.slice(cursor, cursor + 100).map((source, index) => ({
          ordinal: cursor + index,
          source,
          result: this.results.get(cursor + index) ?? null,
        })),
        nextCursor: cursor + 100 < this.start.entryCount ? cursor + 100 : null,
      }
    }
    expect(route).toEndWith('/load-source')
    const input = importSourceLoadSchema.parse(body),
      entry = this.inventory.entries[input.ordinal]
    if (!entry?.sha256) throw new Error('Origem ausente')
    this.writes.push(input.ordinal)
    const result: ImportSourceResult = {
      status: 'imported',
      sourceVersionId: randomUUID(),
      sourceHash: entry.sha256,
      destinations: [{ entityId: randomUUID(), revisionId: randomUUID() }],
      previousSourceVersion: false,
    }
    this.results.set(input.ordinal, result)
    if (this.lost) {
      this.lost = false
      throw new Error('Resposta perdida depois da confirmação')
    }
    return result
  }
}
async function fixture(files: Array<[string, string]>) {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'marketing-batch-'))
  owned.push(directory)
  const root = path.join(directory, 'source'),
    local = path.join(directory, 'local')
  for (const [name, content] of files) {
    const file = path.join(root, 'meus-produtos', name)
    await mkdir(path.dirname(file), { recursive: true })
    await writeFile(file, content)
  }
  const store = new InventoryStore(local),
    signal = new AbortController().signal
  const prepared = await store.prepare(root, 'fluxo-criativo', signal, () => {})
  const stored = JSON.parse(await readFile(path.join(local, `${prepared.id}.json`), 'utf8'))
  const inventory = inventorySchema.parse(stored.inventory)
  const { summary: _summary, products: _products, ...start } = prepared
  const server = new ConfirmedInventory(randomUUID(), start, inventory)
  return { directory, root, local, store, signal, prepared, server }
}
const selection = { product: 'produto-a', categories: ['copy'], includeReview: false } as const
test('bulk resume reads server receipts across pages after a lost response without resending imported text', async () => {
  const f = await fixture([
    ...Array.from({ length: 105 }, (_, i): [string, string] => [
      `produto-a/copy-${String(i).padStart(3, '0')}.md`,
      `Copy ${i}`,
    ]),
    ['produto-b/copy.md', 'Outro produto'],
    ['produto-a/prepare.mjs', 'throw new Error("never execute")'],
  ])
  f.server.lost = true
  const upload = async (): Promise<UploadView> => {
    throw new Error('Mídia não selecionada')
  }
  const chosen = { ...selection, categories: [...selection.categories] }
  await expect(
    f.store.loadSelection(
      f.prepared.id,
      f.server.projectId,
      chosen,
      f.server,
      f.signal,
      upload,
      () => {},
    ),
  ).rejects.toThrow('copy-000.md')
  expect(f.server.results.size).toBe(1)
  const result = await new InventoryStore(f.local).loadSelection(
    f.prepared.id,
    f.server.projectId,
    chosen,
    f.server,
    f.signal,
    upload,
    () => {},
  )
  expect(result).toEqual({ selected: 105, loaded: 104, reused: 1, verifying: 0 })
  expect(f.server.writes).toHaveLength(105)
  expect(new Set(f.server.writes).size).toBe(105)
  const repeated = await f.store.loadSelection(
    f.prepared.id,
    f.server.projectId,
    chosen,
    f.server,
    f.signal,
    upload,
    () => {},
  )
  expect(repeated).toEqual({ selected: 105, loaded: 0, reused: 105, verifying: 0 })
})
test('source files are not linked before confirmation and a canceled batch preserves confirmed sources', async () => {
  const f = await fixture([['produto-a/prepare.mjs', 'export const frames = 30']])
  const source = f.server.inventory.entries[0]
  if (!source?.sha256 || !source.bytes) throw new Error('Origem ausente')
  const expectedSource = { sha256: source.sha256, size: source.bytes }
  const asset: UploadView = {
    manifest: {
      schemaVersion: 1,
      projectId: f.server.projectId,
      id: randomUUID(),
      name: 'prepare.mjs',
      mime: 'text/plain',
      role: 'original',
      sourceAssetId: null,
      sha256: source.sha256,
      size: source.bytes,
      width: null,
      height: null,
      durationMs: null,
      codec: null,
      rotation: null,
    },
    state: 'verifying',
    partBytes: UPLOAD_PART_BYTES,
    parts: [],
    bytesReceived: true,
    error: null,
  }
  const chosen = {
    product: 'produto-a',
    categories: ['production-source'],
    includeReview: false,
  } satisfies import('@sistemazero/marketing-contracts').ImportSelection
  const upload = async (file: string, expected: { sha256: string; size: number }) => {
    expect(file).toBe(path.join(f.root, source.path))
    expect(expected).toEqual(expectedSource)
    return asset
  }
  expect(
    await f.store.loadSelection(
      f.prepared.id,
      f.server.projectId,
      chosen,
      f.server,
      f.signal,
      upload,
      () => {},
    ),
  ).toEqual({ selected: 1, loaded: 0, reused: 0, verifying: 1 })
  expect(f.server.writes).toHaveLength(0)
  asset.state = 'confirmed'
  expect(
    await f.store.loadSelection(
      f.prepared.id,
      f.server.projectId,
      chosen,
      f.server,
      f.signal,
      upload,
      () => {},
    ),
  ).toEqual({ selected: 1, loaded: 1, reused: 0, verifying: 0 })
  const cancel = new AbortController()
  cancel.abort(new Error('Cancelado'))
  await expect(
    f.store.loadSelection(
      f.prepared.id,
      f.server.projectId,
      chosen,
      f.server,
      cancel.signal,
      upload,
      () => {},
    ),
  ).rejects.toThrow('Cancelado')
  expect(f.server.results.size).toBe(1)
})
