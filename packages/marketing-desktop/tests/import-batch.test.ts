import { afterEach, expect, test } from 'bun:test'
import { createHash, randomUUID } from 'node:crypto'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {
  type ImportDecision,
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
  decisions = new Map<number, ImportDecision>()
  results = new Map<number, ImportSourceResult>()
  assets = new Map<string, UploadView>()
  writes: number[] = []
  lost = false
  product = 'produto-a'
  constructor(
    readonly projectId: string,
    readonly start: ImportStart,
    readonly inventory: ImportInventory,
  ) {}
  async request(route: string, method = 'GET', body?: unknown) {
    if (method === 'GET') {
      if (/\/assets\/[a-f0-9-]+$/.test(route)) {
        const value = this.assets.get(route.split('/').at(-1) ?? '')
        if (!value) throw new Error('Arquivo ausente')
        return value
      }
      if (route.endsWith('/import-products'))
        return [
          {
            projectId: this.projectId,
            origin: this.start.origin,
            product: this.product,
            includeShared: false,
            revisionId: '00000000-0000-4000-8000-000000000002',
            updatedBy: '00000000-0000-4000-8000-000000000001',
            updatedAt: this.start.capturedAt,
          },
        ]
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
          decision: this.decisions.get(cursor + index) ?? null,
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
test('arquivo técnico vazio conserva origem e hash sem tentar enviar mídia vazia', async () => {
  const f = await fixture([['produto-a/style.css', '']])
  const result = await f.store.loadSelection(
    f.prepared.id,
    f.server.projectId,
    {
      product: 'produto-a',
      categories: ['production-source'],
      includeReview: true,
    },
    f.server,
    f.signal,
    async () => {
      throw new Error('Não deve enviar mídia vazia')
    },
    () => {},
  )
  expect(result).toEqual({ selected: 1, loaded: 1, reused: 0, verifying: 0, skipped: 0 })
  expect(f.server.results.get(0)?.sourceHash).toBe(createHash('sha256').update('').digest('hex'))
})
test('wrong product and all-product selections fail before reading source content or starting uploads', async () => {
  const f = await fixture([
    ['produto-a/copy.md', 'Copy'],
    ['produto-b/arte.png', 'Imagem'],
  ])
  let uploads = 0
  const upload = async (): Promise<UploadView> => {
    uploads++
    throw new Error('Não deve enviar')
  }
  const wrong = {
    product: 'produto-b',
    categories: ['support-media'] as const,
    includeReview: false,
  }
  await expect(
    f.store.loadSelection(
      f.prepared.id,
      f.server.projectId,
      { ...wrong, categories: [...wrong.categories] },
      f.server,
      f.signal,
      upload,
      () => {},
    ),
  ).rejects.toThrow('Vincule')
  await expect(
    f.store.loadSelection(
      f.prepared.id,
      f.server.projectId,
      { product: null, categories: ['copy'], includeReview: false },
      f.server,
      f.signal,
      upload,
      () => {},
    ),
  ).rejects.toThrow('um produto')
  const ordinal = f.server.inventory.entries.findIndex((entry) => entry.product === 'produto-b')
  await expect(
    f.store.loadFile(f.prepared.id, f.server.projectId, ordinal, f.server, f.signal, upload),
  ).rejects.toThrow('Vincule')
  f.server.product = 'produto-b'
  await expect(
    f.store.loadText(f.prepared.id, f.server.projectId, 0, f.server, f.signal),
  ).rejects.toThrow('Vincule')
  expect(uploads).toBe(0)
  expect(f.server.writes).toHaveLength(0)
})
test('bulk preserves recorded omissions and deferrals without reading or uploading those files', async () => {
  const f = await fixture([
    ['produto-a/copy.md', 'Copy que precisa de revisão.'],
    ['produto-a/video.mp4', 'Original a conferir.'],
    ['produto-a/z-copy.md', 'Copy que deve ser preservada.'],
  ])
  for (const [ordinal, state] of [
    [0, 'deferred'],
    [1, 'omitted'],
  ] as const) {
    f.server.decisions.set(ordinal, {
      inventoryId: f.prepared.id,
      ordinal,
      state,
      revisionId: randomUUID(),
      reason: 'Revisar origem antes de preservar este arquivo.',
      decidedAt: new Date().toISOString(),
      decidedBy: randomUUID(),
    })
  }
  const upload = async (): Promise<UploadView> => {
    throw new Error('Não deve enviar mídia adiada')
  }
  const result = await f.store.loadSelection(
    f.prepared.id,
    f.server.projectId,
    { product: 'produto-a', categories: ['copy', 'support-media'], includeReview: false },
    f.server,
    f.signal,
    upload,
    () => {},
  )
  expect(result).toEqual({ selected: 3, loaded: 1, reused: 0, verifying: 0, skipped: 2 })
  expect(f.server.writes).toEqual([2])
  await expect(
    f.store.loadFile(f.prepared.id, f.server.projectId, 1, f.server, f.signal, upload),
  ).rejects.toThrow('Reabra a pendência')
})
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
  expect(result).toEqual({ selected: 105, loaded: 104, reused: 1, verifying: 0, skipped: 0 })
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
  expect(repeated).toEqual({ selected: 105, loaded: 0, reused: 105, verifying: 0, skipped: 0 })
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
  f.server.assets.set(asset.manifest.id, asset)
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
  ).toEqual({ selected: 1, loaded: 0, reused: 0, verifying: 1, skipped: 0 })
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
  ).toEqual({ selected: 1, loaded: 1, reused: 0, verifying: 0, skipped: 0 })
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

test('batch reconciles files confirmed during later uploads without uploading twice; lost receipts resume safely', async () => {
  const f = await fixture([
    ['produto-a/a.mjs', 'export const a = 1'],
    ['produto-a/b.mjs', 'export const b = 2'],
  ])
  const chosen = {
    product: 'produto-a',
    categories: ['production-source'],
    includeReview: false,
  } satisfies import('@sistemazero/marketing-contracts').ImportSelection
  let uploads = 0
  const upload = async (
    file: string,
    expected: { sha256: string; size: number },
  ): Promise<UploadView> => {
    uploads++
    const id = randomUUID()
    const view: UploadView = {
      manifest: {
        schemaVersion: 1,
        id,
        projectId: f.server.projectId,
        name: path.basename(file),
        mime: 'text/plain',
        role: 'original',
        sourceAssetId: null,
        sha256: expected.sha256,
        size: expected.size,
        width: null,
        height: null,
        durationMs: null,
        codec: null,
        rotation: null,
      },
      state: 'verifying',
      bytesReceived: true,
      partBytes: UPLOAD_PART_BYTES,
      parts: [],
      error: null,
    }
    f.server.assets.set(id, { ...view, state: 'confirmed' })
    return view
  }
  f.server.lost = true
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
  ).rejects.toThrow('Resposta perdida')
  expect(uploads).toBe(2)
  expect(f.server.results.size).toBe(1)
  // The durable receipt skips the first source on restart. The second original is
  // already confirmed; the uploader resolves it without sending bytes again.
  const recovered = await f.store.loadSelection(
    f.prepared.id,
    f.server.projectId,
    chosen,
    f.server,
    f.signal,
    async (file) => {
      const saved = [...f.server.assets.values()].find(
        (entry) => entry.manifest.name === path.basename(file),
      )
      if (!saved) throw new Error('Original não preservado')
      return saved
    },
    () => {},
  )
  expect(recovered).toEqual({ selected: 2, loaded: 1, reused: 1, verifying: 0, skipped: 0 })
  expect(uploads).toBe(2)
  expect(f.server.writes).toEqual([0, 1])
})

test('a font original confirmed after upload can finish its source receipt', async () => {
  const f = await fixture([['produto-a/nunito.woff2', 'original-font-bytes']])
  const result = await f.store.loadSelection(
    f.prepared.id,
    f.server.projectId,
    { product: 'produto-a', categories: ['support-media'], includeReview: false },
    f.server,
    f.signal,
    async (file, expected) => {
      const id = randomUUID()
      const view: UploadView = {
        manifest: {
          schemaVersion: 1,
          id,
          projectId: f.server.projectId,
          name: path.basename(file),
          mime: 'font/woff2',
          role: 'font',
          sourceAssetId: null,
          sha256: expected.sha256,
          size: expected.size,
          width: null,
          height: null,
          durationMs: null,
          codec: null,
          rotation: null,
        },
        state: 'verifying',
        bytesReceived: true,
        partBytes: UPLOAD_PART_BYTES,
        parts: [],
        error: null,
      }
      f.server.assets.set(id, { ...view, state: 'confirmed' })
      return view
    },
    () => {},
  )
  expect(result).toEqual({ selected: 1, loaded: 1, reused: 0, skipped: 0, verifying: 0 })
  expect(f.server.writes).toEqual([0])
})
test('final verification refuses a confirmed asset from another project before creating a source receipt', async () => {
  const f = await fixture([['produto-a/prepare.mjs', 'export const frames = 30']])
  const chosen = {
    product: 'produto-a',
    categories: ['production-source'],
    includeReview: false,
  } satisfies import('@sistemazero/marketing-contracts').ImportSelection
  await expect(
    f.store.loadSelection(
      f.prepared.id,
      f.server.projectId,
      chosen,
      f.server,
      f.signal,
      async (file, expected) => {
        const id = randomUUID()
        const view: UploadView = {
          manifest: {
            schemaVersion: 1,
            id,
            projectId: f.server.projectId,
            name: path.basename(file),
            mime: 'text/plain',
            role: 'original',
            sourceAssetId: null,
            sha256: expected.sha256,
            size: expected.size,
            width: null,
            height: null,
            durationMs: null,
            codec: null,
            rotation: null,
          },
          state: 'verifying',
          bytesReceived: true,
          partBytes: UPLOAD_PART_BYTES,
          parts: [],
          error: null,
        }
        f.server.assets.set(id, {
          ...view,
          state: 'confirmed',
          manifest: { ...view.manifest, projectId: randomUUID() },
        })
        return view
      },
      () => {},
    ),
  ).rejects.toThrow('não corresponde ao original')
  expect(f.server.writes).toEqual([])
})
