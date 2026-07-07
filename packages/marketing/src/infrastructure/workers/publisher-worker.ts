import type { Logger } from '@sistemazero/core/logging'
import type { ContentRepository } from '../../domain/ports/content-repository.port'
import type { PublicationRepository } from '../../domain/ports/publication-repository.port'
import { type ReminderNotifier, ReminderSendError } from '../../domain/ports/reminder-notifier.port'
import { FORMAT_LABELS } from '../../domain/publication/publication'
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
}

export interface PublisherWorkerDeps {
  publications: PublicationRepository
  contents: Pick<ContentRepository, 'byId'>
  notifier: ReminderNotifier | null
  reminder: { phones: string[]; recipientName: string; appUrl: string } | null
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
    } catch (error) {
      this.deps.logger.error('publisher.worker.tick_failed', {
        error: error instanceof Error ? error.message : String(error),
      })
    } finally {
      this.running = false
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
