import { DomainError } from '@sistemazero/core/errors'
import type { Logger } from '@sistemazero/core/logging'
import type { AccountService } from '../../application/accounts/account.service'
import { ALLOWED_MIME_TYPES } from '../../application/media/media.service'
import type { MediaAsset } from '../../domain/media/media-asset'
import { type DriveClient, DriveClientError } from '../../domain/ports/drive-client.port'
import type { MediaAssetRepository } from '../../domain/ports/media-asset-repository.port'
import type { MediaStore } from '../../domain/ports/media-store.port'

export interface MediaTransferWorkerConfig {
  intervalMs: number
  batchSize: number
  leaseMs: number
  maxAttempts: number
  maxUploadBytes: number
}

export interface MediaTransferWorkerDeps {
  assets: MediaAssetRepository
  store: MediaStore
  drive: DriveClient | null
  accounts: AccountService
  now: () => Date
  logger: Logger
  config: MediaTransferWorkerConfig
}

/**
 * Media-transfer-worker — ramo `importing` (F1): stream Drive→R2 dos assets
 * criados pelo import. O ramo `archiving` (R2→Drive pós-publicação) é a F4.
 * Claim com lease em `transfer_next_at`; falha transitória = backoff, 403/404
 * do Drive = failed permanente, teto de tentativas = failed.
 */
export class MediaTransferWorker {
  private timer: ReturnType<typeof setInterval> | null = null
  private running = false
  private inFlight: Promise<void> | null = null

  constructor(private readonly deps: MediaTransferWorkerDeps) {}

  start(): void {
    if (this.timer) return
    this.timer = setInterval(() => {
      this.inFlight = this.tick()
    }, this.deps.config.intervalMs)
    this.deps.logger.info('media_transfer.worker.started', {
      intervalMs: this.deps.config.intervalMs,
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
      const batch = await this.deps.assets.claimDueTransfers(
        this.deps.now(),
        this.deps.config.batchSize,
        this.deps.config.leaseMs,
      )
      for (const asset of batch) {
        try {
          await this.handle(asset)
        } catch (error) {
          this.deps.logger.error('media_transfer.item_failed', {
            assetId: asset.id,
            error: error instanceof Error ? error.message : String(error),
          })
        }
      }
    } catch (error) {
      this.deps.logger.error('media_transfer.tick_failed', {
        error: error instanceof Error ? error.message : String(error),
      })
    } finally {
      this.running = false
    }
  }

  private async handle(asset: MediaAsset): Promise<void> {
    if (!this.deps.drive) {
      await this.fail(asset, 'OAuth do Google desligado — importação impossível')
      return
    }
    if (!asset.driveFileId || !asset.r2Key) {
      await this.fail(asset, 'Asset de importação sem driveFileId/r2Key')
      return
    }
    try {
      const account = await this.deps.accounts.getConnectedAccount('youtube')
      const token = await this.deps.accounts.getFreshAccessToken(account)
      // Revalida o metadado NA TRANSFERÊNCIA (o arquivo pode ter mudado no Drive
      // entre o pedido de import e agora).
      const meta = await this.deps.drive.getFileMetadata(token, asset.driveFileId)
      if (!ALLOWED_MIME_TYPES.has(meta.mimeType)) {
        await this.fail(asset, `Tipo de arquivo não permitido (${meta.mimeType})`)
        return
      }
      if (meta.sizeBytes === null) {
        await this.fail(asset, 'Arquivo do Drive sem download direto')
        return
      }
      if (meta.sizeBytes > this.deps.config.maxUploadBytes) {
        await this.fail(asset, 'Arquivo acima do limite de tamanho')
        return
      }
      const stream = await this.deps.drive.downloadStream(token, asset.driveFileId)
      await this.deps.store.put({
        key: asset.r2Key,
        contentType: meta.mimeType,
        sizeBytes: meta.sizeBytes,
        body: stream,
      })
      // Confere o objeto gravado (defesa contra stream truncado).
      const head = await this.deps.store.head(asset.r2Key)
      if (!head.exists || (head.sizeBytes !== null && head.sizeBytes !== meta.sizeBytes)) {
        throw new Error('Objeto no R2 divergente do metadado do Drive (stream truncado?)')
      }
      await this.persist(asset, {
        status: 'ready',
        sizeBytes: meta.sizeBytes,
        contentType: meta.mimeType,
        transferNextAt: null,
        transferError: null,
      })
      this.deps.logger.info('media_transfer.imported', {
        assetId: asset.id,
        sizeBytes: meta.sizeBytes,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      // Permanentes: 403/404 do Drive, conta desconectada/precisando reauth e
      // OAuth desligado — retry não conserta, o caminho é reconectar/reimportar.
      const permanent =
        (error instanceof DriveClientError && error.permanent) ||
        (error instanceof DomainError &&
          (error.code === 'ACCOUNT_NOT_CONNECTED' || error.code === 'OAUTH_NOT_CONFIGURED'))
      if (permanent || asset.transferAttempts >= this.deps.config.maxAttempts) {
        await this.fail(asset, message)
        return
      }
      // Transitório: backoff exponencial simples sobre o intervalo do lease.
      const backoff = Math.min(
        this.deps.config.leaseMs,
        30_000 * 2 ** Math.max(0, asset.transferAttempts - 1),
      )
      await this.persist(asset, {
        transferNextAt: new Date(this.deps.now().getTime() + backoff),
        transferError: message,
      })
      this.deps.logger.warn('media_transfer.retry_scheduled', {
        assetId: asset.id,
        attempts: asset.transferAttempts,
        backoffMs: backoff,
      })
    }
  }

  private async fail(asset: MediaAsset, reason: string): Promise<void> {
    this.deps.logger.error('media_transfer.failed', { assetId: asset.id, reason })
    await this.persist(asset, {
      status: 'failed',
      transferNextAt: null,
      transferError: reason,
    })
  }

  private async persist(
    asset: MediaAsset,
    patch: Partial<
      Pick<MediaAsset, 'status' | 'sizeBytes' | 'contentType' | 'transferNextAt' | 'transferError'>
    >,
  ): Promise<void> {
    const expectedVersion = asset.version
    Object.assign(asset, patch)
    asset.version = expectedVersion + 1
    asset.updatedAt = this.deps.now()
    const ok = await this.deps.assets.update(asset, expectedVersion)
    if (!ok) {
      this.deps.logger.warn('media_transfer.version_conflict', { assetId: asset.id })
    }
  }
}
