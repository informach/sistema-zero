import { DomainError } from '@sistemazero/core/errors'
import type { Logger } from '@sistemazero/core/logging'
import type { AccountService } from '../../application/accounts/account.service'
import type { PublicationService } from '../../application/publications/publication.service'
import type { MediaAsset } from '../../domain/media/media-asset'
import type { ContentRepository } from '../../domain/ports/content-repository.port'
import type { MediaAssetRepository } from '../../domain/ports/media-asset-repository.port'
import type { MediaStore } from '../../domain/ports/media-store.port'
import type { PublicationAssetRepository } from '../../domain/ports/publication-asset-repository.port'
import type { PublicationRepository } from '../../domain/ports/publication-repository.port'
import { type ReminderNotifier, ReminderSendError } from '../../domain/ports/reminder-notifier.port'
import type { SocialAccountRepository } from '../../domain/ports/social-account-repository.port'
import type { SocialPublisher } from '../../domain/ports/social-publisher.port'
import { FORMAT_LABELS, type Network } from '../../domain/publication/publication'
import type { Publication } from '../../domain/publication/publication-record'

export interface PublisherWorkerConfig {
  intervalMs: number
  batchSize: number
  /** Lease do claim (crash entre claim e envio devolve a linha à fila). */
  claimLeaseMs: number
  /** Teto de tentativas do LEMBRETE (a publicação segue awaiting_manual). */
  maxAttempts: number
  retryBaseMs: number
  retryMaxMs: number
  /**
   * Lead de antecipação do ramo auto POR REDE: YouTube sobe o vídeo horas
   * antes (publishAt nativo); Meta claima minutos antes (container processa
   * na espera e o publish sai na hora). Rede fora do mapa → lead 0.
   */
  leadMsByNetwork: ReadonlyMap<Network, number>
}

/** Deps do ramo AUTOMÁTICO (F2) — null = ramo desligado (só lembrete manual). */
export interface AutoPublishDeps {
  publishers: ReadonlyMap<Network, SocialPublisher>
  accounts: SocialAccountRepository
  accountService: AccountService
  assets: MediaAssetRepository
  /** Ordem dos assets do carrossel (publication_assets). */
  publicationAssets: PublicationAssetRepository
  store: MediaStore
  publicationService: PublicationService
}

export interface PublisherWorkerDeps {
  publications: PublicationRepository
  contents: Pick<ContentRepository, 'byId'>
  notifier: ReminderNotifier | null
  reminder: { phones: string[]; recipientName: string; appUrl: string } | null
  auto: AutoPublishDeps | null
  now: () => Date
  logger: Logger
  config: PublisherWorkerConfig
}

const SP_FORMATTER = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
})

/**
 * Publisher-worker — ramo MANUAL (F1): move publicações `scheduled`(manual)
 * vencidas para `awaiting_manual` e dispara o lembrete WhatsApp da equipe via
 * messaging (idempotente por publicação+fone). O ramo AUTO (YouTube) é a F2 —
 * o claim daqui filtra `publish_mode='manual'` e nunca toca publicações auto.
 * Molde: send-worker do messaging (interval + claim lease + try/catch por item).
 */
export class PublisherWorker {
  private timer: ReturnType<typeof setInterval> | null = null
  private running = false
  private inFlight: Promise<void> | null = null

  constructor(private readonly deps: PublisherWorkerDeps) {}

  start(): void {
    if (this.timer) return
    this.timer = setInterval(() => {
      this.inFlight = this.tick()
    }, this.deps.config.intervalMs)
    this.deps.logger.info('publisher.worker.started', {
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
      await this.processManualReminders()
      await this.processAutoPublish()
    } catch (error) {
      this.deps.logger.error('publisher.worker.tick_failed', {
        error: error instanceof Error ? error.message : String(error),
      })
    } finally {
      this.running = false
    }
  }

  private async processManualReminders(): Promise<void> {
    const batch = await this.deps.publications.claimDueManualReminders(
      this.deps.now(),
      this.deps.config.batchSize,
      this.deps.config.claimLeaseMs,
      this.deps.config.maxAttempts,
    )
    for (const publication of batch) {
      try {
        await this.handle(publication)
      } catch (error) {
        // Falha inesperada num item NUNCA derruba o lote — o lease devolve a
        // linha à fila e a idempotência do messaging absorve o re-envio.
        this.deps.logger.error('publisher.reminder.item_failed', {
          publicationId: publication.id,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }
  }

  // ── Ramo AUTOMÁTICO (F2: YouTube com publishAt nativo + upload antecipado) ──

  private async processAutoPublish(): Promise<void> {
    const auto = this.deps.auto
    if (!auto || auto.publishers.size === 0) return
    const batch = await this.deps.publications.claimDueAutoPublish({
      now: this.deps.now(),
      limit: this.deps.config.batchSize,
      leaseMs: this.deps.config.claimLeaseMs,
      maxAttempts: this.deps.config.maxAttempts,
      networks: [...auto.publishers.keys()].map((network) => ({
        network,
        leadMs: this.deps.config.leadMsByNetwork.get(network) ?? 0,
      })),
    })
    for (const publication of batch) {
      try {
        await this.handleAuto(auto, publication)
      } catch (error) {
        // Item que estourou fica em `publishing` até o lease vencer (reaper);
        // o checkpoint em provider_session garante que nada duplica no retry.
        this.deps.logger.error('publisher.auto.item_failed', {
          publicationId: publication.id,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }
  }

  private async handleAuto(auto: AutoPublishDeps, publication: Publication): Promise<void> {
    const publisher = auto.publishers.get(publication.network)
    if (!publisher?.supports(publication.format)) {
      await this.finishAuto(auto, publication, {
        status: 'failed',
        lastError: 'Formato sem publisher automático — mude para o modo lembrete',
      })
      return
    }
    // Conta + token frescos. Sem conta apta = falha PERMANENTE com CTA claro.
    const account = publication.socialAccountId
      ? await auto.accounts.byId(publication.socialAccountId)
      : ((await auto.accounts.listByNetwork(publication.network)).find(
          (a) => a.status === 'connected',
        ) ?? null)
    if (account?.status !== 'connected') {
      await this.finishAuto(auto, publication, {
        status: 'failed',
        lastError: 'A conta da rede não está conectada. Reconecte em Conexões e reagende',
      })
      return
    }
    let accessToken: string
    try {
      accessToken = await auto.accountService.getFreshAccessToken(account)
    } catch (error) {
      if (error instanceof DomainError) {
        await this.finishAuto(auto, publication, {
          status: 'failed',
          lastError: 'A conta precisa ser reconectada em Conexões. Depois reagende a publicação',
        })
        return
      }
      // Erro transitório de rede no refresh: backoff normal.
      await this.applyRetry(auto, publication, 'Falha temporária ao renovar o token da conta')
      return
    }

    const { items } = await auto.assets.list({
      contentId: publication.contentId,
      limit: 100,
      offset: 0,
    })
    const orderedAssetIds =
      publication.format === 'ig_carousel'
        ? await auto.publicationAssets.listByPublication(publication.id)
        : []
    const outcome = await publisher.publish({
      publication,
      account,
      accessToken,
      assets: items,
      orderedAssetIds,
      assetBytes: (asset: MediaAsset, start: number, endInclusive: number) => {
        if (!asset.r2Key) return Promise.reject(new Error('asset sem r2Key'))
        return auto.store.getRange({ key: asset.r2Key, start, endInclusive })
      },
      assetUrl: (asset: MediaAsset, ttlSeconds: number) => {
        if (!asset.r2Key) return Promise.reject(new Error('asset sem r2Key'))
        return auto.store.presignGet({ key: asset.r2Key, expiresInSeconds: ttlSeconds })
      },
      session: publication.providerSession,
      saveSession: async (patch) => {
        // Checkpoint IMEDIATO (antes/depois de cada side-effect do publisher).
        publication.providerSession = { ...publication.providerSession, ...patch }
        await this.persistAuto(auto, publication, {})
      },
    })

    switch (outcome.kind) {
      case 'published':
        await this.finishAuto(auto, publication, {
          status: 'published',
          publishedAt: this.deps.now(),
          externalPostId: outcome.externalPostId,
          externalUrl: outcome.externalUrl,
          lastError: null,
          nextAttemptAt: null,
          // Post no ar → coleta de métricas entra no radar imediatamente.
          metricsNextCollectAt: this.deps.now(),
        })
        this.deps.logger.info('publisher.auto.published', {
          publicationId: publication.id,
          externalPostId: outcome.externalPostId,
        })
        break
      case 'pending':
        // Side-effect em andamento no provedor: repoll SEM gastar tentativa.
        await this.persistAuto(auto, publication, {
          status: 'scheduled',
          nextAttemptAt: outcome.repollAt,
          lastError: null,
        })
        break
      case 'deferred':
        // Quota: adia p/ a virada SEM gastar tentativa; o aviso fica visível.
        await this.persistAuto(auto, publication, {
          status: 'scheduled',
          nextAttemptAt: outcome.nextAttemptAt,
          lastError: outcome.reason,
        })
        this.deps.logger.warn('publisher.auto.deferred', {
          publicationId: publication.id,
          reason: outcome.reason,
          nextAttemptAt: outcome.nextAttemptAt.toISOString(),
        })
        break
      case 'retryable':
        await this.applyRetry(auto, publication, outcome.reason)
        break
      case 'permanent':
        await this.finishAuto(auto, publication, {
          status: 'failed',
          lastError: outcome.reason,
          nextAttemptAt: null,
        })
        this.deps.logger.error('publisher.auto.failed', {
          publicationId: publication.id,
          reason: outcome.reason,
        })
        break
    }
  }

  private async applyRetry(
    auto: AutoPublishDeps,
    publication: Publication,
    reason: string,
  ): Promise<void> {
    const attempts = publication.attempts + 1
    if (attempts >= this.deps.config.maxAttempts) {
      await this.finishAuto(auto, publication, {
        status: 'failed',
        attempts,
        lastError: reason,
        nextAttemptAt: null,
      })
      this.deps.logger.error('publisher.auto.gave_up', {
        publicationId: publication.id,
        attempts,
        reason,
      })
      return
    }
    const backoff = Math.min(
      this.deps.config.retryMaxMs,
      this.deps.config.retryBaseMs * 2 ** Math.max(0, attempts - 1),
    )
    await this.persistAuto(auto, publication, {
      status: 'scheduled',
      attempts,
      nextAttemptAt: new Date(this.deps.now().getTime() + backoff),
      lastError: reason,
    })
    this.deps.logger.warn('publisher.auto.retry_scheduled', {
      publicationId: publication.id,
      attempts,
      backoffMs: backoff,
    })
  }

  /** Persiste + sincroniza a etapa derivada do conteúdo (published/failed). */
  private async finishAuto(
    auto: AutoPublishDeps,
    publication: Publication,
    patch: Partial<Publication>,
  ): Promise<void> {
    await this.persistAuto(auto, publication, patch)
    await auto.publicationService.syncStageFromWorker(publication.contentId)
  }

  private async persistAuto(
    _auto: AutoPublishDeps,
    publication: Publication,
    patch: Partial<Publication>,
  ): Promise<void> {
    const expectedVersion = publication.version
    Object.assign(publication, patch)
    publication.version = expectedVersion + 1
    publication.updatedAt = this.deps.now()
    const ok = await this.deps.publications.update(publication, expectedVersion)
    if (!ok) {
      // `publishing` não é editável pelo usuário — conflito aqui é anômalo; o
      // checkpoint salvo protege contra duplicação e o lease re-claima.
      this.deps.logger.warn('publisher.auto.version_conflict', {
        publicationId: publication.id,
      })
      throw new Error('Conflito de versão ao persistir publicação automática')
    }
  }

  private async handle(publication: Publication): Promise<void> {
    // Lembrete desligado/sem fones: a publicação JÁ virou awaiting_manual no
    // claim (o Painel mostra); zera o lease p/ não re-claimar em loop.
    if (!this.deps.notifier || !this.deps.reminder || this.deps.reminder.phones.length === 0) {
      this.deps.logger.warn('publisher.reminder.skipped_no_phones', {
        publicationId: publication.id,
      })
      await this.persist(publication, { nextAttemptAt: null })
      return
    }
    const content = await this.deps.contents.byId(publication.contentId)
    const variables = {
      titulo: content?.title ?? 'Conteúdo',
      formato: FORMAT_LABELS[publication.format] ?? publication.format,
      horario: publication.scheduledAt ? SP_FORMATTER.format(publication.scheduledAt) : 'agora',
      link: `${this.deps.reminder.appUrl}/conteudos/${publication.contentId}/publicacoes/${publication.id}`,
    }
    let lastError: string | null = null
    let permanent = false
    for (const phone of this.deps.reminder.phones) {
      try {
        // Idempotency-Key por publicação+fone: retry re-envia os dois, mas o
        // messaging deduplica o que já saiu.
        await this.deps.notifier.send({
          publicationId: publication.id,
          phone,
          recipientName: this.deps.reminder.recipientName,
          variables,
        })
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error)
        if (error instanceof ReminderSendError && error.permanent) permanent = true
      }
    }
    if (lastError === null) {
      await this.persist(publication, {
        reminderSentAt: this.deps.now(),
        nextAttemptAt: null,
        lastError: null,
      })
      this.deps.logger.info('publisher.reminder.sent', { publicationId: publication.id })
      return
    }
    const exhausted = publication.attempts >= this.deps.config.maxAttempts || permanent
    if (exhausted) {
      // Desiste do AVISO (erro → Sentry via espelho), mas a publicação segue
      // awaiting_manual — mark-published fecha o ciclo pelo Painel.
      this.deps.logger.error('publisher.reminder.gave_up', {
        publicationId: publication.id,
        attempts: publication.attempts,
        error: lastError,
      })
      await this.persist(publication, { nextAttemptAt: null, lastError })
      return
    }
    const backoff = Math.min(
      this.deps.config.retryMaxMs,
      this.deps.config.retryBaseMs * 2 ** Math.max(0, publication.attempts - 1),
    )
    await this.persist(publication, {
      nextAttemptAt: new Date(this.deps.now().getTime() + backoff),
      lastError,
    })
    this.deps.logger.warn('publisher.reminder.retry_scheduled', {
      publicationId: publication.id,
      attempts: publication.attempts,
      backoffMs: backoff,
    })
  }

  private async persist(
    publication: Publication,
    patch: Partial<Pick<Publication, 'reminderSentAt' | 'nextAttemptAt' | 'lastError'>>,
  ): Promise<void> {
    const expectedVersion = publication.version
    Object.assign(publication, patch)
    publication.version = expectedVersion + 1
    publication.updatedAt = this.deps.now()
    const ok = await this.deps.publications.update(publication, expectedVersion)
    if (!ok) {
      // Corrida com PATCH do usuário: inócuo — o lease re-claima e o messaging
      // deduplica o lembrete já enviado.
      this.deps.logger.warn('publisher.reminder.version_conflict', {
        publicationId: publication.id,
      })
    }
  }
}
