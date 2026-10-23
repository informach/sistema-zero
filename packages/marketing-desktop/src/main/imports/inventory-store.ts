import { createHash, randomUUID } from 'node:crypto'
import { mkdir, open, readdir, readFile, rename, stat } from 'node:fs/promises'
import path from 'node:path'
import {
  type ImportBatchResult,
  type ImportFileLoadResult,
  type ImportInventory,
  type ImportSelection,
  idSchema,
  importOfficeViewSchema,
  importPageSchema,
  importProductAllowed,
  importProductBindingSchema,
  importProductionPreviewSchema,
  importRunSchema,
  importSelectionSchema,
  importSourceIsText,
  importSourceResultSchema,
  inventoryDigestInput,
  inventorySchema,
  inventorySummary,
  isImportSourceAsset,
  type PreparedImport,
  type ProductionShareResult,
  preparedImportSchema,
  productionReportSchema,
  selectedImportSource,
  stableEditorialId,
  uploadViewSchema,
} from '@sistemazero/marketing-contracts'
import { productionFolders, productionInputs } from '@sistemazero/marketing-import'
import {
  boundedSourceBytes,
  confinedSource,
  reviewInventoryProduction,
  scanInventory,
  sourceTextBytes,
} from '@sistemazero/marketing-import/node'
import { extractOfficeText } from '@sistemazero/marketing-import/office'
import { z } from 'zod'
import { rateLimitedTransport } from '../sync/rate-limit'
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
async function checkProduct(
  transport: SyncTransport,
  projectId: string,
  origin: ImportInventory['origin'],
  product: string | null,
) {
  if (product === null)
    throw new Error('Selecione um produto por carga; cada projeto tem um vínculo próprio')
  const bindings = z
    .array(importProductBindingSchema)
    .max(2)
    .parse(await transport.request(`/projects/${projectId}/import-products`))
  const binding = bindings.find((value) => value.origin === origin && value.projectId === projectId)
  if (!binding || !importProductAllowed(binding, product))
    throw new Error('Vincule este produto ao projeto antes de carregar seu conteúdo')
}
/** Scoped to the manager's per-origin/user/project directory. Absolute paths never leave main. */
export class InventoryStore {
  constructor(private readonly directory: string) {}
  async rescan(
    id: string,
    signal: AbortSignal,
    onProgress: (files: number, bytes: number) => void,
  ) {
    const previous = await this.load(id)
    return this.prepare(previous.root, previous.inventory.origin, signal, onProgress)
  }
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
  async productionFolders(id: string) {
    const { inventory } = await this.load(id)
    const folders = inventory.origin === 'sistema-zero' ? productionFolders(inventory.entries) : []
    if (folders.length > 1000) throw new Error('Inventário excede 1.000 pastas de produção')
    return folders
  }
  async reviewProduction(id: string, folderPath: string, signal: AbortSignal) {
    const { root, inventory } = await this.load(id)
    const review = await reviewInventoryProduction({ root, inventory, folderPath, signal })
    return importProductionPreviewSchema.parse({
      inventoryId: id,
      inventoryDigest: inventory.digest,
      reviewedAt: new Date().toISOString(),
      review,
    })
  }
  async shareProduction(
    id: string,
    projectId: string,
    folderPath: string,
    transport: SyncTransport,
    signal: AbortSignal,
    upload: Parameters<InventoryStore['loadFile']>[5],
    progress: (message: string) => void,
  ): Promise<ProductionShareResult> {
    idSchema.parse(projectId)
    const value = await this.load(id)
    if (value.inventory.origin !== 'sistema-zero')
      throw new Error('Origem de produção não reconhecida')
    const { folder, selected } = productionInputs(value.inventory.entries, folderPath)
    const limited = rateLimitedTransport(transport, signal, (ms) =>
      progress(`Aguardando o servidor por ${Math.ceil(ms / 1000)} s`),
    )
    await checkProduct(limited, projectId, value.inventory.origin, folder.product)
    await reviewInventoryProduction({
      root: value.root,
      inventory: value.inventory,
      folderPath,
      signal,
    })
    let pending = 0
    for (const [index, entry] of selected.entries()) {
      signal.throwIfAborted()
      progress(`${index + 1} de ${selected.length} fontes da conferência · ${entry.source.path}`)
      if (entry.kind === 'media') {
        const result = await this.fileSource(
          value,
          projectId,
          entry.ordinal,
          limited,
          signal,
          upload,
        )
        if (result.status === 'verifying') pending++
      } else await this.textSource(value, projectId, entry.ordinal, limited, signal)
    }
    if (pending) return { status: 'verifying', pending }
    signal.throwIfAborted()
    const report = productionReportSchema.parse(
      await limited.request(`/projects/${projectId}/imports/${id}/production-reports`, 'POST', {
        operationId: await stableEditorialId(
          `${projectId}:${id}:${folderPath}:production-report-${folder.key.startsWith('P') ? 'v1' : 'v2'}`,
        ),
        folderPath,
      }),
    )
    return { status: 'shared', report }
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
    const limited = rateLimitedTransport(transport, signal)
    signal.throwIfAborted()
    let run = importRunSchema.parse(await limited.request(base, 'POST', input))
    if (
      run.digest !== input.digest ||
      run.id !== id ||
      run.projectId !== projectId ||
      run.entryCount !== input.entryCount
    )
      throw new Error('Servidor respondeu com outro inventário')
    if (run.state === 'retired') throw new Error('Este inventário foi desativado no servidor')
    // Read confirmed progress after a crash; never create a new run to mask a lost response.
    run = importPageSchema.parse(await limited.request(`${base}/${id}`)).run
    for (
      let offset = run.received;
      offset < value.inventory.entries.length;
      offset = run.received
    ) {
      signal.throwIfAborted()
      const chunk = value.inventory.entries.slice(offset, offset + 100)
      run = importRunSchema.parse(
        await limited.request(`${base}/${id}/chunk`, 'POST', { offset, entries: chunk }),
      )
      if (run.received <= offset || run.received > input.entryCount)
        throw new Error('Servidor não confirmou o avanço do inventário')
      progress(run.received, input.entryCount)
    }
    signal.throwIfAborted()
    return importRunSchema.parse(await limited.request(`${base}/${id}/finish`, 'POST', {}))
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
    const value = await this.load(id),
      transportWithLimit = rateLimitedTransport(transport, signal)
    const source = value.inventory.entries[ordinal]
    if (!source) throw new Error('Origem não encontrada no inventário')
    await checkProduct(transportWithLimit, projectId, value.inventory.origin, source.product)
    return this.textSource(value, projectId, ordinal, transportWithLimit, signal)
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
          `${projectId}:${id}:${ordinal}:${entry.sha256}:load-text-v2`,
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
    const value = await this.load(id),
      transportWithLimit = rateLimitedTransport(transport, signal)
    const source = value.inventory.entries[ordinal]
    if (!source) throw new Error('Origem não encontrada no inventário')
    await checkProduct(transportWithLimit, projectId, value.inventory.origin, source.product)
    return this.fileSource(value, projectId, ordinal, transportWithLimit, signal, upload)
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
    if (
      !source?.sha256 ||
      source.bytes === null ||
      !['eligible', 'review'].includes(source.disposition)
    )
      throw new Error('Origem excluída ou pendente')
    const base = `/projects/${projectId}/imports/${id}`
    const remote =
      knownPage ?? importPageSchema.parse(await transport.request(`${base}?cursor=${ordinal}`))
    if (remote.run.state !== 'inventoried')
      throw new Error('Confirme o inventário antes de carregar os arquivos')
    const loaded = remote.entries.find((entry) => entry.ordinal === ordinal)
    if (remote.run.digest !== value.inventory.digest || loaded?.source.sha256 !== source.sha256)
      throw new Error('O servidor tem outro inventário; preserve esta origem e confira a carga')
    if (loaded.result) {
      await this.extractOfficeSource(value, projectId, ordinal, loaded.result, transport, signal)
      return { status: 'loaded', result: loaded.result }
    }
    if (loaded.decision && loaded.decision.state !== 'pending')
      throw new Error(
        'Uma decisão mantém esta origem fora da carga. Reabra a pendência antes de importar',
      )
    signal.throwIfAborted()
    if (source.bytes === 0)
      return {
        status: 'loaded',
        result: await this.textSource(value, projectId, ordinal, transport, signal),
      }
    if (/\.(docx|xlsx)$/i.test(source.path) && source.bytes <= 196608)
      extractOfficeText(await boundedSourceBytes(value.root, source, signal), source.path)
    const file = await confinedSource(value.root, source.path)
    const asset = await upload(file, { sha256: source.sha256, size: source.bytes })
    if (
      asset.manifest.projectId !== projectId ||
      !isImportSourceAsset(asset.manifest) ||
      asset.manifest.sha256 !== source.sha256 ||
      asset.manifest.size !== source.bytes
    )
      throw new Error('O arquivo enviado diverge da origem')
    if (asset.state === 'failed') throw new Error(asset.error ?? 'O servidor recusou este arquivo')
    if (asset.state !== 'confirmed') return { status: 'verifying', assetId: asset.manifest.id }
    signal.throwIfAborted()
    return {
      status: 'loaded',
      result: await this.linkFileSource(
        value,
        projectId,
        ordinal,
        transport,
        asset.manifest.id,
        signal,
      ),
    }
  }
  private async linkFileSource(
    value: Stored,
    projectId: string,
    ordinal: number,
    transport: SyncTransport,
    assetId: string,
    signal: AbortSignal,
  ) {
    const source = value.inventory.entries[ordinal]
    if (!source?.sha256) throw new Error('Origem ausente do inventário')
    const result = importSourceResultSchema.parse(
      await transport.request(`/projects/${projectId}/imports/${value.id}/load-source`, 'POST', {
        operationId: await stableEditorialId(
          `${projectId}:${value.id}:${ordinal}:${source.sha256}:load-asset-v1`,
        ),
        ordinal,
        content: { kind: 'asset', assetId },
      }),
    )
    await this.extractOfficeSource(value, projectId, ordinal, result, transport, signal)
    return result
  }
  private async extractOfficeSource(
    value: Stored,
    projectId: string,
    ordinal: number,
    result: import('@sistemazero/marketing-contracts').ImportSourceResult,
    transport: SyncTransport,
    signal: AbortSignal,
  ) {
    const source = value.inventory.entries[ordinal]
    if (
      !source ||
      !/\.(docx|xlsx)$/i.test(source.path) ||
      source.bytes === null ||
      source.bytes > 196608
    )
      return
    const endpoint = `/projects/${projectId}/import-sources/${result.sourceVersionId}/office-text`
    const prior = importOfficeViewSchema.parse(await transport.request(endpoint))
    if (prior.destinations.length) return
    const bytes = await boundedSourceBytes(value.root, source, signal)
    signal.throwIfAborted()
    importOfficeViewSchema.parse(
      await transport.request(endpoint, 'POST', {
        operationId: await stableEditorialId(
          `${projectId}:${result.sourceVersionId}:${prior.parserVersion}`,
        ),
        base64: bytes.toString('base64'),
      }),
    )
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
    const result: ImportBatchResult = { selected, loaded: 0, reused: 0, verifying: 0, skipped: 0 }
    const pending = new Map<number, string>()
    const limited = rateLimitedTransport(transport, signal, (milliseconds) =>
      progress(result, `Aguardando o servidor por ${Math.ceil(milliseconds / 1000)} s`),
    )
    await checkProduct(limited, projectId, value.inventory.origin, selection.product)
    for (let cursor = 0; cursor < value.inventory.entries.length; cursor += 100) {
      signal.throwIfAborted()
      if (
        !value.inventory.entries
          .slice(cursor, cursor + 100)
          .some((entry) => selectedImportSource(entry, selection))
      )
        continue
      const page = importPageSchema.parse(
        await limited.request(`/projects/${projectId}/imports/${id}?cursor=${cursor}`),
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
          await this.extractOfficeSource(value, projectId, ordinal, remote.result, limited, signal)
          result.reused++
          continue
        }
        if (remote.decision && ['deferred', 'omitted'].includes(remote.decision.state)) {
          result.skipped++
          progress(result, `Decisão preservada · ${source.path}`)
          continue
        }
        try {
          if (importSourceIsText(source)) {
            const loaded = await this.textSource(value, projectId, ordinal, limited, signal)
            result[loaded.status === 'reused' ? 'reused' : 'loaded']++
          } else {
            const loaded = await this.fileSource(
              value,
              projectId,
              ordinal,
              limited,
              signal,
              upload,
              page,
            )
            if (loaded.status === 'verifying') pending.set(ordinal, loaded.assetId)
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
    // Verification progresses while later originals are uploaded. Reconcile those
    // receipts once without retransmitting files or requiring another full scan.
    // A slow verifier stays explicitly pending; cancellation and restart are safe.
    for (const [ordinal, assetId] of pending) {
      signal.throwIfAborted()
      const source = value.inventory.entries[ordinal]
      if (!source) throw new Error('Origem ausente do inventário')
      progress(result, `Conferindo arquivo recebido · ${source.path}`)
      const file = uploadViewSchema.parse(
        await limited.request(`/projects/${projectId}/assets/${assetId}`),
      )
      if (
        file.manifest.id !== assetId ||
        file.manifest.projectId !== projectId ||
        file.manifest.sha256 !== source.sha256 ||
        file.manifest.size !== source.bytes ||
        !isImportSourceAsset(file.manifest)
      )
        throw new Error(`A confirmação não corresponde ao original: ${source.path}`)
      if (file.state === 'failed')
        throw new Error(
          `Arquivo recusado: ${source.path}. ${file.error ?? 'Confira o envio na biblioteca.'}`,
        )
      if (file.state !== 'confirmed') continue
      signal.throwIfAborted()
      const linked = await this.linkFileSource(value, projectId, ordinal, limited, assetId, signal)
      result[linked.status === 'reused' ? 'reused' : 'loaded']++
      result.verifying--
    }
    progress(result, '')
    return result
  }
}
