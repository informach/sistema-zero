import { createHash, randomUUID } from 'node:crypto'
import { mkdir, open, readdir, readFile, rename, stat } from 'node:fs/promises'
import path from 'node:path'
import {
  type ImportBatchResult,
  type ImportFileLoadResult,
  type ImportInventory,
  type ImportSelection,
  idSchema,
  importPageSchema,
  importRunSchema,
  importSelectionSchema,
  importSourceIsText,
  importSourceResultSchema,
  inventoryDigestInput,
  inventorySchema,
  inventorySummary,
  type PreparedImport,
  preparedImportSchema,
  selectedImportSource,
  stableEditorialId,
} from '@sistemazero/marketing-contracts'
import { confinedSource, scanInventory, sourceTextBytes } from '@sistemazero/marketing-import/node'
import { z } from 'zod'
import type { SyncTransport } from '../sync/sync-engine'

const storedSchema = z
  .object({ id: idSchema, root: z.string().min(1), inventory: inventorySchema })
  .strict()
type Stored = z.infer<typeof storedSchema>
function summary(value: Stored): PreparedImport {
  return preparedImportSchema.parse({
    id: value.id,
    origin: value.inventory.origin,
    digest: value.inventory.digest,
    policyVersion: value.inventory.policyVersion,
    capturedAt: value.inventory.capturedAt,
    entryCount: value.inventory.entries.length,
    products: [...new Set(value.inventory.entries.map((entry) => entry.product))].sort(),
    summary: inventorySummary(value.inventory),
  })
}
/** Scoped to the manager's per-origin/user/project directory. Absolute paths never leave main. */
export class InventoryStore {
  constructor(private readonly directory: string) {}
  private file(id: string) {
    return path.join(this.directory, `${idSchema.parse(id)}.json`)
  }
  async prepare(
    root: string,
    origin: ImportInventory['origin'],
    signal: AbortSignal,
    onProgress: (files: number, bytes: number) => void,
  ) {
    const inventory = await scanInventory({ root, origin, signal, onProgress })
    const value: Stored = { id: randomUUID(), root, inventory }
    signal.throwIfAborted()
    await mkdir(this.directory, { recursive: true })
    const temporary = path.join(this.directory, `${value.id}.pending`)
    const file = await open(temporary, 'wx', 0o600)
    try {
      await file.writeFile(JSON.stringify(value))
      await file.sync()
    } finally {
      await file.close()
    }
    await rename(temporary, this.file(value.id))
    return summary(value)
  }
  private async load(id: string) {
    const file = this.file(id)
    if ((await stat(file)).size > 192 * 1024 ** 2)
      throw new Error('Inventário local excede o limite de leitura')
    const value = storedSchema.parse(JSON.parse(await readFile(file, 'utf8')))
    if (
      value.id !== id ||
      createHash('sha256')
        .update(
          inventoryDigestInput({
            policyVersion: value.inventory.policyVersion,
            origin: value.inventory.origin,
            entries: value.inventory.entries,
          }),
        )
        .digest('hex') !== value.inventory.digest
    )
      throw new Error(
        'Inventário local divergente; preserve o arquivo e faça uma nova leitura da origem',
      )
    return value
  }
  async list(before?: string): Promise<{ items: PreparedImport[]; nextCursor: string | null }> {
    await mkdir(this.directory, { recursive: true })
    if (before) idSchema.parse(before)
    const ids = (await readdir(this.directory))
      .filter((name) => /^[a-f0-9-]{36}\.json$/.test(name))
      .map((name) => name.slice(0, -5))
      .filter((id) => !before || id < before)
      .sort()
      .reverse()
    const items: PreparedImport[] = []
    for (const id of ids.slice(0, 20)) items.push(summary(await this.load(id)))
    return { items, nextCursor: ids.length > 20 ? (ids[19] ?? null) : null }
  }
  async page(id: string, cursor = 0) {
    z.number().int().min(0).max(100000).parse(cursor)
    const value = await this.load(id)
    return {
      prepared: summary(value),
      entries: value.inventory.entries.slice(cursor, cursor + 100),
      nextCursor: cursor + 100 < value.inventory.entries.length ? cursor + 100 : null,
    }
  }
  async synchronize(
    id: string,
    projectId: string,
    transport: SyncTransport,
    signal: AbortSignal,
    progress: (received: number, count: number) => void,
  ) {
    idSchema.parse(projectId)
    const value = await this.load(id),
      start = summary(value)
    const { summary: _summary, products: _products, ...input } = start
    const base = `/projects/${projectId}/imports`
    signal.throwIfAborted()
    let run = importRunSchema.parse(await transport.request(base, 'POST', input))
    if (
      run.digest !== input.digest ||
      run.id !== id ||
      run.projectId !== projectId ||
      run.entryCount !== input.entryCount
    )
      throw new Error('Servidor respondeu com outro inventário')
    if (run.state === 'retired') throw new Error('Este inventário foi desativado no servidor')
    // Read confirmed progress after a crash; never create a new run to mask a lost response.
    run = importPageSchema.parse(await transport.request(`${base}/${id}`)).run
    for (
      let offset = run.received;
      offset < value.inventory.entries.length;
      offset = run.received
    ) {
      signal.throwIfAborted()
      const chunk = value.inventory.entries.slice(offset, offset + 100)
      run = importRunSchema.parse(
        await transport.request(`${base}/${id}/chunk`, 'POST', { offset, entries: chunk }),
      )
      if (run.received <= offset || run.received > input.entryCount)
        throw new Error('Servidor não confirmou o avanço do inventário')
      progress(run.received, input.entryCount)
    }
    signal.throwIfAborted()
    return importRunSchema.parse(await transport.request(`${base}/${id}/finish`, 'POST', {}))
  }
  async loadText(
    id: string,
    projectId: string,
    ordinal: number,
    transport: SyncTransport,
    signal: AbortSignal,
  ) {
    idSchema.parse(projectId)
    z.number().int().min(0).max(99999).parse(ordinal)
    return this.textSource(await this.load(id), projectId, ordinal, transport, signal)
  }
  private async textSource(
    value: Stored,
    projectId: string,
    ordinal: number,
    transport: SyncTransport,
    signal: AbortSignal,
  ) {
    const entry = value.inventory.entries[ordinal],
      id = value.id
    if (!entry) throw new Error('Origem não encontrada no inventário')
    const bytes = await sourceTextBytes(value.root, entry, signal)
    signal.throwIfAborted()
    return importSourceResultSchema.parse(
      await transport.request(`/projects/${projectId}/imports/${id}/load-source`, 'POST', {
        operationId: await stableEditorialId(
          `${projectId}:${id}:${ordinal}:${entry.sha256}:load-text-v1`,
        ),
        ordinal,
        content: { kind: 'text', base64: bytes.toString('base64') },
      }),
    )
  }
  async loadFile(
    id: string,
    projectId: string,
    ordinal: number,
    transport: SyncTransport,
    signal: AbortSignal,
    upload: (
      file: string,
      expected: { sha256: string; size: number },
    ) => Promise<import('@sistemazero/marketing-contracts').UploadView>,
  ): Promise<ImportFileLoadResult> {
    idSchema.parse(projectId)
    z.number().int().min(0).max(99999).parse(ordinal)
    return this.fileSource(await this.load(id), projectId, ordinal, transport, signal, upload)
  }
  private async fileSource(
    value: Stored,
    projectId: string,
    ordinal: number,
    transport: SyncTransport,
    signal: AbortSignal,
    upload: Parameters<InventoryStore['loadFile']>[5],
    knownPage?: import('@sistemazero/marketing-contracts').ImportPage,
  ): Promise<ImportFileLoadResult> {
    const source = value.inventory.entries[ordinal],
      id = value.id
    if (!source?.sha256 || !source.bytes || !['eligible', 'review'].includes(source.disposition))
      throw new Error('Origem excluída, vazia ou pendente')
    const base = `/projects/${projectId}/imports/${id}`
    const remote =
      knownPage ?? importPageSchema.parse(await transport.request(`${base}?cursor=${ordinal}`))
    if (remote.run.state !== 'inventoried')
      throw new Error('Confirme o inventário antes de carregar os arquivos')
    const loaded = remote.entries.find((entry) => entry.ordinal === ordinal)
    if (remote.run.digest !== value.inventory.digest || loaded?.source.sha256 !== source.sha256)
      throw new Error('O servidor tem outro inventário; preserve esta origem e confira a carga')
    if (loaded.result) return { status: 'loaded', result: loaded.result }
    signal.throwIfAborted()
    const file = await confinedSource(value.root, source.path)
    const asset = await upload(file, { sha256: source.sha256, size: source.bytes })
    if (asset.manifest.sha256 !== source.sha256 || asset.manifest.size !== source.bytes)
      throw new Error('O arquivo enviado diverge da origem')
    if (asset.state === 'failed') throw new Error(asset.error ?? 'O servidor recusou este arquivo')
    if (asset.state !== 'confirmed') return { status: 'verifying', assetId: asset.manifest.id }
    signal.throwIfAborted()
    const result = importSourceResultSchema.parse(
      await transport.request(`${base}/load-source`, 'POST', {
        operationId: await stableEditorialId(
          `${projectId}:${id}:${ordinal}:${source.sha256}:load-asset-v1`,
        ),
        ordinal,
        content: { kind: 'asset', assetId: asset.manifest.id },
      }),
    )
    return { status: 'loaded', result }
  }
  /** The server's source receipts are the checkpoint, including a response lost after commit. */
  async loadSelection(
    id: string,
    projectId: string,
    rawSelection: ImportSelection,
    transport: SyncTransport,
    signal: AbortSignal,
    upload: Parameters<InventoryStore['loadFile']>[5],
    progress: (result: ImportBatchResult, path: string) => void,
  ): Promise<ImportBatchResult> {
    idSchema.parse(projectId)
    const selection = importSelectionSchema.parse(rawSelection),
      value = await this.load(id)
    const selected = value.inventory.entries.reduce(
      (count, source) => count + Number(selectedImportSource(source, selection)),
      0,
    )
    const result: ImportBatchResult = { selected, loaded: 0, reused: 0, verifying: 0 }
    for (let cursor = 0; cursor < value.inventory.entries.length; cursor += 100) {
      signal.throwIfAborted()
      if (
        !value.inventory.entries
          .slice(cursor, cursor + 100)
          .some((entry) => selectedImportSource(entry, selection))
      )
        continue
      const page = importPageSchema.parse(
        await transport.request(`/projects/${projectId}/imports/${id}?cursor=${cursor}`),
      )
      if (
        page.run.state !== 'inventoried' ||
        page.run.digest !== value.inventory.digest ||
        page.run.entryCount !== value.inventory.entries.length
      )
        throw new Error('Inventário não confirmado ou divergente no servidor')
      for (
        let ordinal = cursor;
        ordinal < Math.min(cursor + 100, value.inventory.entries.length);
        ordinal++
      ) {
        const source = value.inventory.entries[ordinal],
          remote = page.entries.find((entry) => entry.ordinal === ordinal)
        if (
          !source ||
          !remote ||
          remote.source.path !== source.path ||
          remote.source.sha256 !== source.sha256
        )
          throw new Error('O servidor não retornou todas as origens do inventário')
        if (!selectedImportSource(source, selection)) continue
        signal.throwIfAborted()
        progress(result, source.path)
        if (remote.result) {
          result.reused++
          continue
        }
        try {
          if (importSourceIsText(source)) {
            const loaded = await this.textSource(value, projectId, ordinal, transport, signal)
            result[loaded.status === 'reused' ? 'reused' : 'loaded']++
          } else {
            const loaded = await this.fileSource(
              value,
              projectId,
              ordinal,
              transport,
              signal,
              upload,
              page,
            )
            result[
              loaded.status === 'verifying'
                ? 'verifying'
                : loaded.result.status === 'reused'
                  ? 'reused'
                  : 'loaded'
            ]++
          }
        } catch (error) {
          signal.throwIfAborted()
          throw new Error(
            `Carga interrompida em ${source.path}. ${error instanceof Error ? error.message : 'Falha ao carregar a origem'}. Os itens confirmados foram preservados; retome com a mesma seleção.`,
            { cause: error },
          )
        }
      }
    }
    progress(result, '')
    return result
  }
}
