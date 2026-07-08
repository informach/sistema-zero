import { DomainError } from '@sistemazero/core/errors'
import type { Logger } from '@sistemazero/core/logging'
import type { AccountService } from '../../application/accounts/account.service'
import type { MediaAsset } from '../../domain/media/media-asset'
import { type DriveClient, DriveClientError } from '../../domain/ports/drive-client.port'
import type { MediaAssetRepository } from '../../domain/ports/media-asset-repository.port'
import type { MediaStore } from '../../domain/ports/media-store.port'
import { DRIVE_FILE_SCOPE } from '../gateways/google/google-oauth-provider'

export interface MediaArchiverWorkerConfig {
  intervalMs: number
  batchSize: number
  leaseMs: number
  maxAttempts: number
  /** Idade mínima do conteúdo PUBLICADO p/ arquivar (decisão da usuária: 30d). */
  afterDays: number
}

export interface MediaArchiverWorkerDeps {
  assets: MediaAssetRepository
  store: MediaStore
  drive: DriveClient
  accounts: AccountService
  now: () => Date
  logger: Logger
  config: MediaArchiverWorkerConfig
}

/** Nome da pasta do app no Drive (find-or-create; id cacheado por processo). */
const ARCHIVE_FOLDER_NAME = 'Sistema Zero Marketing — Arquivo'

/** Falhou de vez: volta pra fila só daqui a 7 dias (nada de loop quente). */
const RETRY_AFTER_GIVE_UP_MS = 7 * 86_400_000

/**
 * Arquivador R2→Drive (F4): conteúdo PUBLICADO há 30d+ tem a mídia movida do
 * R2 (pago) pro Drive (5TB) e APAGADA do R2 — decisões da usuária. Ordem dos
 * side-effects: upload → persiste `archived`+driveFileId (CHECKPOINT) → delete
 * no R2 → persiste r2DeletedAt. Crash entre upload e persist = órfão inofensivo
 * no Drive; o delete NUNCA roda antes do checkpoint. Falha permanente/teto →
 * volta a `ready` com transferError + retry em 7d (o arquivo está SÃO no R2 —
 * nunca `failed`). Conta Google sem o escopo `drive.file` (conectada antes da
 * F4) → o worker espera com warn até a reconexão.
 */
export class MediaArchiverWorker {
  private timer: ReturnType<typeof setInterval> | null = null
  private running = false
  private inFlight: Promise<void> | null = null
  private folderId: string | null = null

  constructor(private readonly deps: MediaArchiverWorkerDeps) {}

  start(): void {
    if (this.timer) return
    this.timer = setInterval(() => {
      this.inFlight = this.tick()
    }, this.deps.config.intervalMs)
    this.deps.logger.info('media_archiver.worker.started', {
      intervalMs: this.deps.config.intervalMs,
      afterDays: this.deps.config.afterDays,
    })
  }

  async stop(): Promise<void> {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
    if (this.inFlight) await this.inFlight
  }

  async tick(): Promise<void> {
    if (this.running) return
    this.running = true
    try {
      // Gate ANTES do claim: sem conta Google conectada não há o que fazer; sem
      // o escopo drive.file (conexão anterior à F4) o upload falharia — espera.
      let accessToken: string
      try {
        const account = await this.deps.accounts.getConnectedAccount('youtube')
        if (!account.scopes.includes(DRIVE_FILE_SCOPE)) {
          this.deps.logger.warn('media_archiver.scope_missing', {
            hint: 'Reconecte a conta Google em Conexões p/ liberar o arquivamento no Drive (escopo drive.file)',
          })
          return
        }
        accessToken = await this.deps.accounts.getFreshAccessToken(account)
      } catch {
        // Sem conta conectada/refresh falhou: nada a arquivar neste ciclo.
        return
      }

      const batch = await this.deps.assets.claimDueArchives({
        now: this.deps.now(),
        limit: this.deps.config.batchSize,
        leaseMs: this.deps.config.leaseMs,
        afterDays: this.deps.config.afterDays,
      })
      for (const asset of batch) {
        try {
          await this.handle(asset, accessToken)
        } catch (error) {
          this.deps.logger.error('media_archiver.item_failed', {
            assetId: asset.id,
            error: error instanceof Error ? error.message : String(error),
          })
        }
      }
    } catch (error) {
      this.deps.logger.error('media_archiver.tick_failed', {
        error: error instanceof Error ? error.message : String(error),
      })
    } finally {
      this.running = false
    }
  }

  private async handle(asset: MediaAsset, accessToken: string): Promise<void> {
    if (!asset.r2Key) {
      await this.giveUp(asset, 'Asset sem r2Key — nada a arquivar')
      return
    }
    try {
      const head = await this.deps.store.head(asset.r2Key)
      if (!head.exists) {
        await this.giveUp(asset, 'Objeto não encontrado no R2')
        return
      }
      if (this.folderId === null) {
        this.folderId = await this.deps.drive.ensureFolder(accessToken, ARCHIVE_FOLDER_NAME)
      }
      const stream = await this.deps.store.getStream(asset.r2Key)
      const driveFileId = await this.deps.drive.uploadStream(accessToken, {
        name: asset.filename,
        mimeType: asset.contentType,
        sizeBytes: head.sizeBytes ?? asset.sizeBytes,
        parentFolderId: this.folderId,
        body: stream,
      })
      // CHECKPOINT antes do delete: o arquivo NUNCA some do R2 sem o driveFileId
      // persistido (crash aqui = cópia dupla no Drive, nunca perda).
      await this.persist(asset, {
        status: 'archived',
        driveFileId,
        archivedAt: this.deps.now(),
        transferNextAt: null,
        transferError: null,
      })
      try {
        await this.deps.store.delete(asset.r2Key)
        await this.persist(asset, { r2DeletedAt: this.deps.now() })
      } catch (error) {
        // Arquivado com sucesso, só o delete falhou: fica o órfão no R2
        // (r2DeletedAt null documenta) — não volta pra fila por isso.
        this.deps.logger.warn('media_archiver.delete_failed', {
          assetId: asset.id,
          error: error instanceof Error ? error.message : String(error),
        })
      }
      this.deps.logger.info('media_archiver.archived', {
        assetId: asset.id,
        driveFileId,
        sizeBytes: head.sizeBytes ?? asset.sizeBytes,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      const permanent =
        (error instanceof DriveClientError && error.permanent) ||
        (error instanceof DomainError &&
          (error.code === 'ACCOUNT_NOT_CONNECTED' || error.code === 'OAUTH_NOT_CONFIGURED'))
      if (permanent || asset.transferAttempts >= this.deps.config.maxAttempts) {
        await this.giveUp(asset, message)
        return
      }
      const backoff = Math.min(
        this.deps.config.leaseMs,
        60_000 * 2 ** Math.max(0, asset.transferAttempts - 1),
      )
      await this.persist(asset, {
        transferNextAt: new Date(this.deps.now().getTime() + backoff),
        transferError: message,
      })
      this.deps.logger.warn('media_archiver.retry_scheduled', {
        assetId: asset.id,
        attempts: asset.transferAttempts,
        backoffMs: backoff,
      })
    }
  }

  /**
   * Desistiu DESTA rodada: volta a `ready` (o arquivo está são no R2 — nunca
   * `failed`) com o motivo e re-tenta só em 7 dias.
   */
  private async giveUp(asset: MediaAsset, reason: string): Promise<void> {
    this.deps.logger.error('media_archiver.gave_up', { assetId: asset.id, reason })
    await this.persist(asset, {
      status: 'ready',
      transferNextAt: new Date(this.deps.now().getTime() + RETRY_AFTER_GIVE_UP_MS),
      transferError: reason,
    })
  }

  private async persist(
    asset: MediaAsset,
    patch: Partial<
      Pick<
        MediaAsset,
        'status' | 'driveFileId' | 'archivedAt' | 'r2DeletedAt' | 'transferNextAt' | 'transferError'
      >
    >,
  ): Promise<void> {
    const expectedVersion = asset.version
    Object.assign(asset, patch)
    asset.version = expectedVersion + 1
    asset.updatedAt = this.deps.now()
    const ok = await this.deps.assets.update(asset, expectedVersion)
    if (!ok) {
      this.deps.logger.warn('media_archiver.version_conflict', { assetId: asset.id })
    }
  }
}
