import {
  AssetTooLargeError,
  AssetTypeNotAllowedError,
  ContentNotFoundError,
  DriveFileInvalidError,
  OAuthNotConfiguredError,
} from '../../domain/marketing-errors'
import type { AssetKind, MediaAsset } from '../../domain/media/media-asset'
import type { ContentRepository } from '../../domain/ports/content-repository.port'
import type { DriveClient } from '../../domain/ports/drive-client.port'
import { DriveClientError } from '../../domain/ports/drive-client.port'
import type { MediaAssetRepository } from '../../domain/ports/media-asset-repository.port'
import type { AccountService } from '../accounts/account.service'
import type { Actor } from '../actor'
import { type AssetView, type DriveFileView, toAssetView, toDriveFileView } from '../mappers/views'
import { ALLOWED_MIME_TYPES, safeExtension } from './media.service'

/** Extrai o fileId de um link do Drive (`/d/<id>` ou `?id=<id>`) ou valida um id cru. */
export function parseDriveFileId(input: { driveFileId?: string; driveUrl?: string }): string {
  if (input.driveFileId) {
    if (/^[A-Za-z0-9_-]{10,}$/.test(input.driveFileId)) return input.driveFileId
    throw new DriveFileInvalidError()
  }
  if (input.driveUrl) {
    // A URL NUNCA é fetchada (anti-SSRF) — só o id é extraído por regex.
    const match =
      input.driveUrl.match(/\/d\/([A-Za-z0-9_-]{10,})/) ??
      input.driveUrl.match(/[?&]id=([A-Za-z0-9_-]{10,})/)
    if (match?.[1]) return match[1]
  }
  throw new DriveFileInvalidError()
}

export interface DriveImportInput {
  driveFileId?: string
  driveUrl?: string
  contentId?: string | null
  kind?: AssetKind
}

/** Listagem/importação do Google Drive (entrada do media-transfer-worker). */
export class DriveImportService {
  constructor(
    private readonly drive: DriveClient | null,
    private readonly accountService: AccountService,
    private readonly assets: MediaAssetRepository,
    private readonly contents: Pick<ContentRepository, 'byId'>,
    private readonly config: { maxUploadBytes: number },
    private readonly now: () => Date,
    private readonly idGen: () => string,
  ) {}

  private async accessToken(): Promise<{ drive: DriveClient; token: string }> {
    if (!this.drive) throw new OAuthNotConfiguredError()
    const account = await this.accountService.getConnectedAccount('youtube')
    const token = await this.accountService.getFreshAccessToken(account)
    return { drive: this.drive, token }
  }

  async listFiles(input: {
    q?: string
    pageToken?: string
  }): Promise<{ files: DriveFileView[]; nextPageToken: string | null }> {
    const { drive, token } = await this.accessToken()
    const result = await drive.listFiles(token, { q: input.q, pageToken: input.pageToken })
    return { files: result.files.map(toDriveFileView), nextPageToken: result.nextPageToken }
  }

  /**
   * Cria o asset `importing` (o media-transfer-worker faz o stream Drive→R2).
   * Valida MIME/teto AGORA pelo metadado — o worker revalida na transferência.
   */
  async import(actor: Actor, input: DriveImportInput): Promise<AssetView> {
    const fileId = parseDriveFileId(input)
    const { drive, token } = await this.accessToken()
    let meta: Awaited<ReturnType<DriveClient['getFileMetadata']>>
    try {
      meta = await drive.getFileMetadata(token, fileId)
    } catch (error) {
      if (error instanceof DriveClientError && error.permanent) {
        throw new DriveFileInvalidError('Arquivo não encontrado no Drive (ou sem acesso)')
      }
      throw error
    }
    if (!ALLOWED_MIME_TYPES.has(meta.mimeType)) throw new AssetTypeNotAllowedError()
    if (meta.sizeBytes === null) {
      // Google Docs nativos não têm bytes (exigiriam export) — fora do escopo.
      throw new DriveFileInvalidError('Este arquivo do Drive não tem download direto')
    }
    if (meta.sizeBytes > this.config.maxUploadBytes) throw new AssetTooLargeError()
    if (input.contentId && !(await this.contents.byId(input.contentId))) {
      throw new ContentNotFoundError()
    }
    const at = this.now()
    const id = this.idGen()
    const scope = input.contentId ?? 'inbox'
    const asset: MediaAsset = {
      id,
      version: 0,
      contentId: input.contentId ?? null,
      kind: input.kind ?? 'other',
      // Key SERVER-SIDE definida já na criação — o worker só transfere.
      r2Key: `marketing/${scope}/${id}.${safeExtension(meta.name, meta.mimeType)}`,
      driveFileId: fileId,
      filename: meta.name,
      contentType: meta.mimeType,
      sizeBytes: meta.sizeBytes,
      status: 'importing',
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
    return toAssetView(asset)
  }
}
