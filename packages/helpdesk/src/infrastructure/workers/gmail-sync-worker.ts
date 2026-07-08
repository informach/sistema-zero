import type { Logger } from '@sistemazero/core/logging'
import type { GmailAccountService } from '../../application/connection/gmail-account.service'
import type { IngestService } from '../../application/tickets/ingest.service'
import type { GmailConnection } from '../../domain/connection/gmail-connection'
import { ConnectionNotConnectedError } from '../../domain/helpdesk-errors'
import type { ConnectionRepository } from '../../domain/ports/connection-repository.port'
import type { GmailClient } from '../../domain/ports/gmail-client.port'

/** Labels de sistema que NÃO viram ticket. */
const SKIP_LABELS = new Set(['SPAM', 'TRASH', 'DRAFT', 'CHAT'])
/** Teto do backoff exponencial de falha transitória. */
const MAX_BACKOFF_MS = 30 * 60_000

export interface GmailSyncWorkerConfig {
  /** Cadência do tick (checa conexões vencidas). */
  intervalMs: number
  /** Delay do re-agendamento após um sync com sucesso (syncNextAt = now + este). */
  pollIntervalMs: number
  /** Lease do claim (crash → volta a ficar elegível ao vencer). */
  leaseMs: number
  /** Teto do expoente do backoff. */
  maxAttempts: number
  /** Query do backfill inicial (ex.: `newer_than:7d`). */
  backfillQuery: string
  /** maxResults por página (list/history). */
  fetchBatchSize: number
  /** Refresh PROATIVO do access token com esta folga. */
  tokenRefreshMarginMs: number
}

export interface GmailSyncWorkerDeps {
  connections: ConnectionRepository
  gmailAccount: GmailAccountService
  gmail: GmailClient
  ingest: IngestService
  now: () => Date
  logger: Logger
  config: GmailSyncWorkerConfig
}

/**
 * Poller do Gmail: a cada tick CLAIMA uma conexão vencida (SKIP LOCKED + lease),
 * pega um token fresco e sincroniza — backfill (lastHistoryId null) ou
 * incremental (history.list). 404 do history → zera o lastHistoryId e o próximo
 * tick faz o full-resync (idempotente por gmail_message_id). Uma réplica
 * sincroniza a conexão por vez; N réplicas são seguras.
 */
export class GmailSyncWorker {
  private timer: ReturnType<typeof setInterval> | null = null
  private running = false
  private inFlight: Promise<void> | null = null

  constructor(private readonly deps: GmailSyncWorkerDeps) {}

  start(): void {
    if (this.timer) return
    this.timer = setInterval(() => {
      this.inFlight = this.tick()
    }, this.deps.config.intervalMs)
    this.deps.logger.info('gmail_sync.worker.started', { intervalMs: this.deps.config.intervalMs })
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
      const connection = await this.deps.connections.claimDue(
        this.deps.config.leaseMs,
        this.deps.now(),
      )
      if (!connection) return
      await this.sync(connection)
    } catch (error) {
      this.deps.logger.error('gmail_sync.tick_failed', {
        error: error instanceof Error ? error.message : String(error),
      })
    } finally {
      this.running = false
    }
  }

  private async sync(connection: GmailConnection): Promise<void> {
    let accessToken: string
    try {
      accessToken = await this.deps.gmailAccount.getFreshAccessToken(
        connection,
        this.deps.config.tokenRefreshMarginMs,
      )
    } catch (error) {
      // needs_reauth já foi marcado/logado (status ≠ connected → claimDue não
      // pega de novo até reconectar). Transitório fica p/ o próximo claim.
      if (!(error instanceof ConnectionNotConnectedError)) {
        await this.scheduleRetry(connection, error)
      }
      return
    }

    try {
      const newHistoryId =
        connection.lastHistoryId === null
          ? await this.backfill(connection, accessToken)
          : await this.incremental(connection, accessToken, connection.lastHistoryId)
      const at = this.deps.now()
      connection.lastHistoryId = newHistoryId
      connection.lastSyncAt = at
      connection.lastSyncError = null
      connection.syncAttempts = 0
      connection.syncNextAt = new Date(at.getTime() + this.deps.config.pollIntervalMs)
      connection.updatedAt = at
      await this.deps.connections.update(connection)
    } catch (error) {
      await this.scheduleRetry(connection, error)
    }
  }

  /** Backfill inicial: importa a janela recente e semeia o lastHistoryId. */
  private async backfill(connection: GmailConnection, accessToken: string): Promise<string> {
    // historyId ANTES de importar: mensagens que chegarem durante o backfill
    // caem no próximo incremental (dedupe torna a sobreposição inofensiva).
    const profile = await this.deps.gmail.getProfile(accessToken)
    let pageToken: string | undefined
    let processed = 0
    do {
      const page = await this.deps.gmail.listMessages(accessToken, {
        q: this.deps.config.backfillQuery,
        pageToken,
        maxResults: this.deps.config.fetchBatchSize,
      })
      for (const id of page.ids) {
        await this.ingestId(connection, accessToken, id)
        processed += 1
      }
      pageToken = page.nextPageToken ?? undefined
    } while (pageToken)
    this.deps.logger.info('gmail_sync.backfill_done', {
      email: connection.emailAddress,
      processed,
    })
    return profile.historyId
  }

  /** Sync incremental via history.list. `null` = 404 (histórico expirado → reset). */
  private async incremental(
    connection: GmailConnection,
    accessToken: string,
    startHistoryId: string,
  ): Promise<string | null> {
    let pageToken: string | undefined
    let latestHistoryId = startHistoryId
    let processed = 0
    do {
      const page = await this.deps.gmail.listHistory(accessToken, {
        startHistoryId,
        pageToken,
        maxResults: this.deps.config.fetchBatchSize,
      })
      if (page.expired) {
        this.deps.logger.warn('gmail_sync.history_expired', { email: connection.emailAddress })
        return null // próximo tick faz o full-resync
      }
      for (const id of new Set(page.messageIds)) {
        await this.ingestId(connection, accessToken, id)
        processed += 1
      }
      if (page.historyId) latestHistoryId = page.historyId
      pageToken = page.nextPageToken ?? undefined
    } while (pageToken)
    if (processed > 0) {
      this.deps.logger.info('gmail_sync.incremental_done', {
        email: connection.emailAddress,
        processed,
      })
    }
    return latestHistoryId
  }

  private async ingestId(
    connection: GmailConnection,
    accessToken: string,
    messageId: string,
  ): Promise<void> {
    const parsed = await this.deps.gmail.getMessage(accessToken, messageId)
    if (!parsed) return // 404: apagada entre o history e o get
    if (parsed.labelIds.some((label) => SKIP_LABELS.has(label))) return
    const result = await this.deps.ingest.ingest(parsed, connection.emailAddress)
    if (result.status === 'created') {
      this.deps.logger.info('gmail_sync.ticket_created', {
        ticketId: result.ticketId,
        direction: result.direction,
      })
    }
  }

  private async scheduleRetry(connection: GmailConnection, error: unknown): Promise<void> {
    const at = this.deps.now()
    const exp = Math.min(connection.syncAttempts, this.deps.config.maxAttempts)
    const backoff = Math.min(this.deps.config.pollIntervalMs * 2 ** exp, MAX_BACKOFF_MS)
    connection.lastSyncError = error instanceof Error ? error.message : String(error)
    connection.syncNextAt = new Date(at.getTime() + backoff)
    connection.updatedAt = at
    await this.deps.connections.update(connection)
    this.deps.logger.warn('gmail_sync.failed', {
      email: connection.emailAddress,
      attempts: connection.syncAttempts,
      error: connection.lastSyncError,
    })
  }
}
