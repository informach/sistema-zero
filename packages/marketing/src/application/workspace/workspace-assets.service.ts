import {
  assetFilename,
  assetLibraryQuerySchema,
  idSchema,
  UPLOAD_PART_BYTES,
  type UploadView,
  uploadPartSchema,
  uploadStartSchema,
} from '@sistemazero/marketing-contracts'
import type { MultipartStore } from '../../domain/ports/multipart-store.port'
import type {
  UploadRecord,
  WorkspaceAssetsRepository,
} from '../../domain/ports/workspace-assets-repository.port'
import { WorkspaceError } from '../../domain/workspace/workspace-error'
import type { Actor } from '../actor'
import { parseWorkspace, payloadHash, workspaceActor } from './workspace.service'

export class WorkspaceAssetsService {
  constructor(
    private readonly repo: WorkspaceAssetsRepository,
    private readonly store: MultipartStore | null,
  ) {}
  private storage() {
    if (!this.store)
      throw new WorkspaceError(
        'MEDIA_NOT_CONFIGURED',
        'O armazenamento de mídia não está configurado no servidor',
      )
    return this.store
  }
  list(actor: Actor, projectId: string, query: unknown) {
    return this.repo.list(
      workspaceActor(actor),
      parseWorkspace(idSchema, projectId),
      parseWorkspace(assetLibraryQuerySchema, query).after,
    )
  }
  private async view(record: UploadRecord): Promise<UploadView> {
    const view: UploadView = {
      manifest: record.manifest,
      state: record.state,
      partBytes: UPLOAD_PART_BYTES,
      bytesReceived: ['verifying', 'confirmed', 'failed'].includes(record.state),
      parts: [],
      error: record.error,
    }
    if (record.state === 'uploading' && record.uploadId) {
      try {
        view.parts = await this.storage().listParts(record.storageKey, record.uploadId)
      } catch (error) {
        if (!(await this.storage().head(record.storageKey)).exists) throw error
        view.bytesReceived = true
        view.error = 'Envio recebido; confirme para verificar o arquivo'
      }
    }
    return view
  }
  async start(actor: Actor, raw: unknown) {
    const actorId = workspaceActor(actor),
      input = parseWorkspace(uploadStartSchema, raw),
      store = this.storage()
    let record = await this.repo.allocate(
      actorId,
      input,
      payloadHash({ action: 'assetStart', input }),
    )
    if (record.state === 'preparing') {
      const uploadId = await store.createMultipart(record.storageKey, record.manifest.mime)
      try {
        record = await this.repo.attach(
          actorId,
          record.manifest.projectId,
          record.manifest.id,
          uploadId,
        )
      } catch (error) {
        try {
          await store.abortMultipart(record.storageKey, uploadId)
        } catch (cleanup) {
          throw new AggregateError(
            [error, cleanup],
            'Não foi possível registrar ou encerrar o envio',
          )
        }
        throw error
      }
      if (record.uploadId !== uploadId) await store.abortMultipart(record.storageKey, uploadId)
    }
    return this.view(record)
  }
  async get(actor: Actor, projectId: string, id: string) {
    const record = await this.repo.get(
      workspaceActor(actor),
      parseWorkspace(idSchema, projectId),
      parseWorkspace(idSchema, id),
      false,
    )
    return this.view(record)
  }
  async part(actor: Actor, projectId: string, id: string, raw: unknown) {
    const input = parseWorkspace(uploadPartSchema, raw)
    const record = await this.repo.get(
      workspaceActor(actor),
      parseWorkspace(idSchema, projectId),
      parseWorkspace(idSchema, id),
      true,
    )
    if (record.state !== 'uploading' || !record.uploadId)
      throw new WorkspaceError('ASSET_UNCONFIRMED', 'Este envio não aceita novas partes')
    const offset = (input.number - 1) * UPLOAD_PART_BYTES,
      size = Math.min(UPLOAD_PART_BYTES, record.manifest.size - offset)
    if (size <= 0)
      throw new WorkspaceError('VALIDATION_ERROR', 'Parte fora do tamanho declarado do arquivo')
    return {
      url: await this.storage().signPart({
        key: record.storageKey,
        uploadId: record.uploadId,
        number: input.number,
        size,
        md5: input.md5,
      }),
      size,
      headers: { 'content-md5': input.md5, 'content-length': String(size) },
    }
  }
  async complete(actor: Actor, projectId: string, id: string) {
    const actorId = workspaceActor(actor),
      project = parseWorkspace(idSchema, projectId),
      asset = parseWorkspace(idSchema, id),
      store = this.storage()
    let record = await this.repo.get(actorId, project, asset, true)
    if (record.state === 'confirmed' || record.state === 'verifying' || record.state === 'failed')
      return this.view(record)
    if (record.state !== 'uploading' || !record.uploadId)
      throw new WorkspaceError('ASSET_UNCONFIRMED', 'O envio ainda não foi preparado')
    if (!(await store.head(record.storageKey)).exists) {
      const parts = await store.listParts(record.storageKey, record.uploadId),
        count = Math.ceil(record.manifest.size / UPLOAD_PART_BYTES)
      if (
        parts.length !== count ||
        parts.some(
          (part, index) =>
            part.number !== index + 1 ||
            part.size !==
              Math.min(UPLOAD_PART_BYTES, record.manifest.size - index * UPLOAD_PART_BYTES),
        )
      )
        throw new WorkspaceError(
          'ASSET_UNCONFIRMED',
          'Ainda faltam partes do arquivo; retome o envio',
        )
      try {
        await store.completeMultipart(record.storageKey, record.uploadId, parts)
      } catch (error) {
        if (!(await store.head(record.storageKey)).exists) throw error
      }
    }
    record = await this.repo.verify(actorId, project, asset)
    return this.view(record)
  }
  async retry(actor: Actor, projectId: string, id: string) {
    return this.view(
      await this.repo.retry(
        workspaceActor(actor),
        parseWorkspace(idSchema, projectId),
        parseWorkspace(idSchema, id),
      ),
    )
  }
  async download(actor: Actor, projectId: string, id: string, downloadName?: string | true) {
    const record = await this.repo.get(
      workspaceActor(actor),
      parseWorkspace(idSchema, projectId),
      parseWorkspace(idSchema, id),
      false,
    )
    if (record.state !== 'confirmed')
      throw new WorkspaceError('ASSET_UNCONFIRMED', 'O servidor ainda está conferindo este arquivo')
    return {
      manifest: record.manifest,
      url: await this.storage().presignGet({
        key: record.storageKey,
        expiresInSeconds: 300,
        downloadName:
          downloadName === true ||
          (!downloadName && !/^(image|video|audio|font)\//.test(record.manifest.mime))
            ? assetFilename(record.manifest.name)
            : downloadName || undefined,
      }),
    }
  }
}
