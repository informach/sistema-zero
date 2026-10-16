import { createHash, randomUUID } from 'node:crypto'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { z } from 'zod'
import { editionDownloadSchema } from '../../../../marketing-contracts/src/approval'
import {
  type AssetExportRequest,
  assetDownloadSchema,
  assetFilename,
  assetManifestSchema,
} from '../../../../marketing-contracts/src/assets'
import { idSchema } from '../../../../marketing-contracts/src/common'
import { enqueueSchema } from '../../../../marketing-contracts/src/sync'
import type { WorkspaceRequest } from '../../shared/connection'
import type { Asset } from '../../shared/contracts'
import { LocalAssets } from '../assets'
import type { ExpectedSource } from '../media/copy-source'
import { exportVerifiedFile } from '../media/export-file'
import { mediaMetadata } from '../media/probe-image'
import { type DesktopServerSession, ServerRequestError } from '../server-session'
import { downloadAsset } from './asset-download'
import { AssetTransfer } from './asset-transfer'
import { DiskBudget } from './disk-budget'
import { LocalWorkspaceStore } from './local-store'
import type { SyncTransport } from './sync-engine'
import { type SyncReport, SyncTransportError, WorkspaceSyncEngine } from './sync-engine'

type Workspace = {
  store: LocalWorkspaceStore
  engine: WorkspaceSyncEngine
  transport: SyncTransport
  root: string
  media: Map<string, Promise<LocalAssets>>
}
export class DesktopWorkspaceManager {
  private readonly stores = new Map<string, Workspace>()
  private active: Workspace | undefined
  private timer: ReturnType<typeof setTimeout> | undefined
  private stopped = false
  private delay = 5000
  private readonly abort = new AbortController()
  private readonly transfers = new Map<string, Promise<unknown>>()
  private readonly downloads = new Map<string, Promise<Asset>>()
  private readonly disk: DiskBudget
  private maintenance = false
  constructor(
    private readonly directory: string,
    private readonly server: DesktopServerSession,
    private readonly changed: (report: SyncReport) => void,
  ) {
    this.disk = new DiskBudget(directory)
  }
  storageUsage() {
    return this.disk.usage()
  }
  async clearConfirmedCache(scope: WorkspaceRequest['scope'], projectId: string) {
    if (this.transferring || this.maintenance)
      throw new Error('Aguarde as transferências antes de liberar o cache')
    return this.track(`maintenance:${projectId}`, async () => {
      this.maintenance = true
      try {
        const resources = await this.resources(scope, projectId),
          files = resources.assets.list()
        const protectedIds = resources.store.protectedAssets(
          projectId,
          files.map((file) => file.id),
        )
        let freedBytes = 0,
          removed = 0,
          preserved = 0
        for (const file of files) {
          if (protectedIds.has(file.id)) {
            preserved++
            continue
          }
          const download = z
            .object({ manifest: assetManifestSchema, url: z.string().url() })
            .parse(
              await resources.transport.request(
                `/projects/${projectId}/assets/${file.id}/download`,
              ),
            )
          if (
            download.manifest.sha256 !== file.sha256 ||
            download.manifest.id !== file.id ||
            download.manifest.projectId !== projectId
          )
            throw new Error(
              'O servidor não confirmou uma cópia equivalente; o arquivo local foi preservado',
            )
          freedBytes += await resources.assets.evict(file.id)
          removed++
        }
        return { freedBytes, removed, preserved }
      } finally {
        this.maintenance = false
      }
    })
  }
  private async workspace() {
    if (this.stopped) throw new Error('A sincronização está encerrando')
    let state = this.server.cachedState
    if (state.status === 'disconnected') state = await this.server.status()
    if (!state.origin || !state.userId || state.status === 'disconnected')
      throw new Error('Conecte sua conta para abrir o acervo compartilhado')
    const scope = { origin: state.origin, userId: state.userId }
    const key = createHash('sha256').update(JSON.stringify(scope)).digest('hex')
    let workspace = this.stores.get(key)
    if (!workspace) {
      const root = path.join(this.directory, key)
      await mkdir(root, { recursive: true })
      if (this.stopped) throw new Error('A sincronização está encerrando')
      workspace = this.stores.get(key)
      if (!workspace) {
        const store = new LocalWorkspaceStore(path.join(root, 'workspace.sqlite'), scope)
        const transport: SyncTransport = {
          request: async (requestPath, method = 'GET', body) => {
            try {
              return await this.server.workspace(
                { scope, path: requestPath, method, body },
                this.abort.signal,
              )
            } catch (error) {
              if (error instanceof ServerRequestError)
                throw new SyncTransportError(error.status, error.code, error.message)
              throw error
            }
          },
        }
        const engine = new WorkspaceSyncEngine(store, transport, (report) => {
          if (this.active?.store === store) this.changed(report)
        })
        workspace = { store, engine, transport, root, media: new Map() }
        this.stores.set(key, workspace)
      }
    }
    this.guard(workspace)
    if (this.active && this.active !== workspace) {
      for (const media of this.active.media.values()) (await media).close()
      this.active.media.clear()
    }
    this.active = workspace
    this.schedule()
    return workspace
  }
  private guard(workspace: Workspace) {
    const current = this.server.cachedState
    if (
      current.origin !== workspace.store.scope.origin ||
      current.userId !== workspace.store.scope.userId ||
      current.status === 'disconnected'
    )
      throw new Error('A conta mudou. Reabra o acervo na conta correta.')
  }
  private schedule() {
    if (this.stopped || this.timer) return
    this.timer = setTimeout(() => {
      this.timer = undefined
      const active = this.active
      if (!active) return
      void active.engine
        .synchronize()
        .then((report) => {
          this.delay = report.phase === 'offline' ? Math.min(this.delay * 2, 60000) : 5000
        })
        .finally(() => this.schedule())
    }, this.delay)
    this.timer.unref()
  }
  async synchronize() {
    return (await this.workspace()).engine.synchronize(true)
  }
  async projects() {
    const workspace = await this.workspace()
    this.guard(workspace)
    return workspace.store.projects()
  }
  async view(projectId: string) {
    idSchema.parse(projectId)
    const workspace = await this.workspace()
    this.guard(workspace)
    return {
      items: workspace.store.items(projectId),
      pending: workspace.store.pending(projectId),
      pendingBatches: workspace.store.pendingBatches(projectId),
      resolvedDrafts: workspace.store.resolvedDrafts(projectId),
      transfers: workspace.store.transfers(projectId),
      report: workspace.engine.state(),
    }
  }
  async enqueue(scope: WorkspaceRequest['scope'], raw: unknown) {
    const workspace = await this.workspace()
    if (
      workspace.store.scope.origin !== scope.origin ||
      workspace.store.scope.userId !== scope.userId
    )
      throw new Error('A conta mudou. Reabra o projeto antes de salvar.')
    return workspace.store.enqueue(enqueueSchema.parse(raw))
  }
  async enqueueBatch(scope: WorkspaceRequest['scope'], raw: unknown) {
    const workspace = await this.workspace()
    if (
      workspace.store.scope.origin !== scope.origin ||
      workspace.store.scope.userId !== scope.userId
    )
      throw new Error('A conta mudou. Reabra o projeto antes de salvar.')
    return workspace.store.enqueueBatch(raw)
  }
  async resolveDrafts(scope: WorkspaceRequest['scope'], raw: unknown) {
    const workspace = await this.workspace()
    if (
      workspace.store.scope.origin !== scope.origin ||
      workspace.store.scope.userId !== scope.userId
    )
      throw new Error('A conta mudou. Reabra o projeto antes de resolver.')
    workspace.store.resolveDrafts(raw)
  }
  async resources(scope: WorkspaceRequest['scope'], projectId: string) {
    idSchema.parse(projectId)
    const workspace = await this.workspace()
    if (
      workspace.store.scope.origin !== scope.origin ||
      workspace.store.scope.userId !== scope.userId
    )
      throw new Error('A conta mudou; reabra o projeto')
    const project = workspace.store.projects().find((item) => item.id === projectId)
    if (!project) throw new Error('Projeto indisponível nesta conta')
    let pending = workspace.media.get(projectId)
    const directory = path.join(workspace.root, projectId)
    if (!pending) {
      pending = (async () => {
        const media = new LocalAssets(path.join(directory, 'assets'), (bytes) =>
          this.disk.reserve(bytes),
        )
        await media.start()
        return media
      })()
      workspace.media.set(projectId, pending)
      void pending.catch(() => workspace.media.delete(projectId))
    }
    const assets = await pending
    this.guard(workspace)
    return {
      store: workspace.store,
      transport: workspace.transport,
      assets,
      directory,
      runtimeDirectory: path.join(
        this.directory,
        'runtime',
        createHash('sha256')
          .update(JSON.stringify({ scope, projectId }))
          .digest('hex')
          .slice(0, 24),
      ),
      project,
      transfer: new AssetTransfer(workspace.store, assets, workspace.transport),
    }
  }
  async importMedia(
    scope: WorkspaceRequest['scope'],
    projectId: string,
    file: string,
    options: { expected?: ExpectedSource; signal?: AbortSignal } = {},
  ) {
    return this.track(`import:${randomUUID()}`, async () => {
      const resources = await this.resources(scope, projectId)
      if (!resources.project.permissions.includes('edit'))
        throw new Error('Esta conta não pode adicionar arquivos ao projeto')
      const existing = options.expected
        ? resources.assets
            .list()
            .find(
              (asset) =>
                asset.name === path.basename(file) &&
                asset.sha256 === options.expected?.sha256 &&
                asset.size === options.expected.size,
            )
        : undefined
      const signal = options.signal
        ? AbortSignal.any([options.signal, this.abort.signal])
        : this.abort.signal
      signal.throwIfAborted()
      const asset = existing
        ? (await resources.assets.verify(existing.id)).asset
        : await resources.assets.importFile(file, { ...options, signal })
      if (
        resources.store
          .transfers(projectId)
          .some((transfer) => transfer.input.manifest.id === asset.id)
      )
        return asset
      let metadata: Awaited<ReturnType<typeof mediaMetadata>>
      try {
        metadata = await mediaMetadata(resources.assets.get(asset.id).path, asset.mime, signal)
      } catch (error) {
        if (!existing) await resources.assets.evict(asset.id)
        throw error
      }
      const { url: _url, ...identity } = asset
      const manifest = assetManifestSchema.parse({
        ...identity,
        schemaVersion: 1,
        projectId,
        role: asset.mime === 'font/woff2' ? 'font' : 'original',
        sourceAssetId: null,
        ...metadata,
      })
      resources.store.stageTransfer({ operationId: randomUUID(), manifest })
      return asset
    })
  }
  private track<T>(key: string, operation: () => Promise<T>): Promise<T> {
    if (this.maintenance)
      throw new Error('Aguarde a liberação do cache antes de transferir arquivos')
    if (this.stopped) throw new Error('O app está encerrando; o arquivo será preservado')
    if (this.transfers.has(key)) throw new Error('Este arquivo já está sendo transferido')
    const flight = operation().finally(() => this.transfers.delete(key))
    this.transfers.set(key, flight)
    return flight
  }
  get transferring() {
    return this.transfers.size > 0
  }
  async upload(
    scope: WorkspaceRequest['scope'],
    projectId: string,
    assetId: string,
    progress: (fraction: number) => void,
    signal?: AbortSignal,
  ) {
    idSchema.parse(assetId)
    return this.track(`upload:${assetId}`, async () => {
      const resources = await this.resources(scope, projectId)
      const pending = resources.store
        .transfers(projectId)
        .find((item) => item.input.manifest.id === assetId)
      if (!pending) throw new Error('Arquivo não está na fila deste projeto')
      return resources.transfer.upload(
        pending.input,
        signal ? AbortSignal.any([signal, this.abort.signal]) : this.abort.signal,
        progress,
      )
    })
  }
  download(scope: WorkspaceRequest['scope'], projectId: string, assetId: string) {
    idSchema.parse(assetId)
    const key = JSON.stringify({ scope, projectId, assetId }),
      existing = this.downloads.get(key)
    if (existing) return existing
    const flight = this.track(`download:${key}`, async () => {
      const resources = await this.resources(scope, projectId)
      return downloadAsset(
        projectId,
        assetId,
        resources.assets,
        resources.transport,
        this.abort.signal,
      )
    }).finally(() => this.downloads.delete(key))
    this.downloads.set(key, flight)
    return flight
  }
  exportEditionFile(
    scope: WorkspaceRequest['scope'],
    input: import('@sistemazero/marketing-contracts').EditionExportRequest,
    choose: (filename: string) => Promise<string | null>,
  ) {
    return this.track(`export:${input.editionId}:${input.assetId}`, async () => {
      const resources = await this.resources(scope, input.projectId)
      const descriptor = editionDownloadSchema.parse(
        await resources.transport.request(
          `/projects/${input.projectId}/editions/${input.editionId}/files/${input.componentId}`,
        ),
      )
      if (
        descriptor.editionId !== input.editionId ||
        descriptor.componentId !== input.componentId ||
        descriptor.editionHash !== input.expectedHash ||
        descriptor.manifest.id !== input.assetId ||
        descriptor.manifest.projectId !== input.projectId
      )
        throw new Error('O arquivo não corresponde à edição conferida')
      const destination = await choose(descriptor.filename)
      if (!destination) return false
      const asset = await downloadAsset(
        input.projectId,
        input.assetId,
        resources.assets,
        resources.transport,
        this.abort.signal,
      )
      if (asset.sha256 !== descriptor.manifest.sha256 || asset.size !== descriptor.manifest.size)
        throw new Error('O arquivo local diverge da edição aprovada')
      const verified = await resources.assets.verify(asset.id)
      await exportVerifiedFile(verified.path, destination, descriptor.manifest, this.abort.signal)
      return true
    })
  }
  exportAssetFile(
    scope: WorkspaceRequest['scope'],
    input: AssetExportRequest,
    choose: (filename: string) => Promise<string | null>,
  ) {
    return this.track(`export-asset:${input.assetId}`, async () => {
      const resources = await this.resources(scope, input.projectId)
      const descriptor = assetDownloadSchema.parse(
        await resources.transport.request(
          `/projects/${input.projectId}/assets/${input.assetId}/export`,
        ),
      )
      if (
        descriptor.manifest.id !== input.assetId ||
        descriptor.manifest.projectId !== input.projectId ||
        descriptor.manifest.sha256 !== input.expectedHash
      )
        throw new Error('O arquivo não corresponde à referência selecionada')
      const destination = await choose(assetFilename(descriptor.manifest.name))
      if (!destination) return false
      const asset = await downloadAsset(
        input.projectId,
        input.assetId,
        resources.assets,
        resources.transport,
        this.abort.signal,
      )
      if (asset.sha256 !== input.expectedHash || asset.size !== descriptor.manifest.size)
        throw new Error('O arquivo local diverge do original confirmado')
      const verified = await resources.assets.verify(asset.id)
      await exportVerifiedFile(verified.path, destination, descriptor.manifest, this.abort.signal)
      return true
    })
  }
  async stop() {
    this.stopped = true
    if (this.timer) clearTimeout(this.timer)
    this.abort.abort()
    await Promise.allSettled([...this.transfers.values()])
    for (const workspace of this.stores.values()) {
      await workspace.engine.waitForIdle()
      for (const media of workspace.media.values()) (await media).close()
      workspace.store.close()
    }
    this.stores.clear()
  }
}
