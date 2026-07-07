import {
  AssetNotFoundError,
  AssetNotReadyError,
  AssetTooLargeError,
  AssetTypeNotAllowedError,
  ConcurrencyConflictError,
  ContentNotFoundError,
} from '../../domain/marketing-errors'
import type { AssetKind, MediaAsset } from '../../domain/media/media-asset'
import type { ContentRepository } from '../../domain/ports/content-repository.port'
import type { MediaAssetRepository } from '../../domain/ports/media-asset-repository.port'
import type { MediaStore } from '../../domain/ports/media-store.port'
import type { Actor } from '../actor'
import { type AssetView, toAssetView } from '../mappers/views'

/** MIME permitidos no acervo de marketing (vídeo, imagem, áudio, pdf de apoio). */
export const ALLOWED_MIME_TYPES: ReadonlySet<string> = new Set([
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'audio/mpeg',
  'audio/mp4',
  'audio/wav',
  'application/pdf',
])

/** Extensão segura derivada do filename (fallback por MIME). */
function safeExtension(filename: string, contentType: string): string {
  const fromName = filename.toLowerCase().match(/\.([a-z0-9]{1,8})$/)?.[1]
  if (fromName) return fromName
  const byMime: Record<string, string> = {
    'video/mp4': 'mp4',
    'video/quicktime': 'mov',
    'video/webm': 'webm',
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'audio/mpeg': 'mp3',
    'audio/mp4': 'm4a',
    'audio/wav': 'wav',
    'application/pdf': 'pdf',
  }
  return byMime[contentType] ?? 'bin'
}

export interface PresignInput {
  filename: string
  contentType: string
  sizeBytes: number
  contentId?: string | null
  kind?: AssetKind
}

export class MediaService {
  constructor(
    private readonly assets: MediaAssetRepository,
    private readonly contents: Pick<ContentRepository, 'byId'>,
    private readonly store: MediaStore,
    private readonly config: {
      maxUploadBytes: number
      presignPutTtlSeconds: number
      presignGetTtlSeconds: number
    },
    private readonly now: () => Date,
    private readonly idGen: () => string,
  ) {}

  /** `contentId` referencia FK real — id lixo viraria 23503→500 no insert. */
  private async assertContentExists(contentId: string): Promise<void> {
    if (!(await this.contents.byId(contentId))) throw new ContentNotFoundError()
  }

  /**
   * Prepara o upload DIRETO browser→R2: valida MIME/teto, gera a key SERVER-SIDE
   * (o cliente não escolhe onde grava) e devolve a URL PUT pré-assinada
   * (content-type e content-length entram na assinatura — o R2 prende o teto).
   */
  async presign(
    actor: Actor,
    input: PresignInput,
  ): Promise<{ assetId: string; uploadUrl: string; contentType: string }> {
    if (!ALLOWED_MIME_TYPES.has(input.contentType)) throw new AssetTypeNotAllowedError()
    if (input.sizeBytes > this.config.maxUploadBytes) throw new AssetTooLargeError()
    if (input.contentId) await this.assertContentExists(input.contentId)
    const at = this.now()
    const id = this.idGen()
    const scope = input.contentId ?? 'inbox'
    const key = `marketing/${scope}/${id}.${safeExtension(input.filename, input.contentType)}`
    const uploadUrl = await this.store.presignPut({
      key,
      contentType: input.contentType,
      sizeBytes: input.sizeBytes,
      expiresInSeconds: this.config.presignPutTtlSeconds,
    })
    const asset: MediaAsset = {
      id,
      version: 0,
      contentId: input.contentId ?? null,
      kind: input.kind ?? 'other',
      r2Key: key,
      driveFileId: null,
      filename: input.filename,
      contentType: input.contentType,
      sizeBytes: input.sizeBytes,
      status: 'pending_upload',
      transferAttempts: 0,
      transferNextAt: null,
      transferError: null,
      archivedAt: null,
      r2DeletedAt: null,
      createdBy: actor.userId,
      createdAt: at,
      updatedAt: at,
    }
    await this.assets.create(asset)
    return { assetId: id, uploadUrl, contentType: input.contentType }
  }

  /** Confirma o upload (HEAD no R2) e promove o asset a `ready`. */
  async confirm(id: string): Promise<AssetView> {
    const asset = await this.assets.byId(id)
    if (!asset) throw new AssetNotFoundError()
    if (asset.status === 'ready') return toAssetView(asset)
    if (asset.status !== 'pending_upload' || !asset.r2Key) throw new AssetNotReadyError()
    const head = await this.store.head(asset.r2Key)
    if (!head.exists) throw new AssetNotReadyError('Upload não encontrado no armazenamento')
    // Defesa em profundidade: a assinatura já prende o tamanho, mas se o objeto
    // divergiu do declarado (cliente fora do fluxo normal), rejeita e limpa.
    if (head.sizeBytes !== null && head.sizeBytes !== asset.sizeBytes) {
      await this.store.delete(asset.r2Key)
      throw new AssetTooLargeError('Tamanho do arquivo difere do declarado')
    }
    // Concorrência otimista (confirm duplo em corrida: um vence, o outro 409 —
    // inofensivo, o cliente re-GETa e vê `ready`).
    const expectedVersion = asset.version
    asset.status = 'ready'
    asset.version = expectedVersion + 1
    asset.updatedAt = this.now()
    const ok = await this.assets.update(asset, expectedVersion)
    if (!ok) throw new ConcurrencyConflictError()
    return toAssetView(asset)
  }

  /** URL temporária de leitura (preview no app; a Meta baixa daqui na publicação). */
  async resolve(id: string): Promise<{ url: string; expiresInSeconds: number }> {
    const asset = await this.assets.byId(id)
    if (!asset) throw new AssetNotFoundError()
    if (!asset.r2Key || (asset.status !== 'ready' && asset.status !== 'archiving')) {
      throw new AssetNotReadyError()
    }
    const url = await this.store.presignGet({
      key: asset.r2Key,
      expiresInSeconds: this.config.presignGetTtlSeconds,
    })
    return { url, expiresInSeconds: this.config.presignGetTtlSeconds }
  }

  async list(filter: {
    contentId?: string
    limit: number
    offset: number
  }): Promise<{ items: AssetView[]; total: number }> {
    const { items, total } = await this.assets.list(filter)
    return { items: items.map(toAssetView), total }
  }

  /** Vincula/ajusta o asset a um conteúdo (anexar da biblioteca) ou muda o kind. */
  async attach(
    id: string,
    input: { contentId?: string | null; kind?: AssetKind },
  ): Promise<AssetView> {
    const asset = await this.assets.byId(id)
    if (!asset) throw new AssetNotFoundError()
    if (input.contentId !== undefined && input.contentId !== null) {
      await this.assertContentExists(input.contentId)
    }
    const expectedVersion = asset.version
    if (input.contentId !== undefined) asset.contentId = input.contentId
    if (input.kind !== undefined) asset.kind = input.kind
    asset.version = expectedVersion + 1
    asset.updatedAt = this.now()
    const ok = await this.assets.update(asset, expectedVersion)
    if (!ok) throw new ConcurrencyConflictError()
    return toAssetView(asset)
  }
}
