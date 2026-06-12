import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { ApplyDeliveryStatusService } from './application/apply-delivery-status/apply-delivery-status.service'
import { GetMessageService } from './application/get-message/get-message.service'
import {
  CreateInstanceService,
  ListInstancesService,
  SetInstanceConnectionService,
  UpdateInstanceService,
} from './application/instances/instance-admin.service'
import { ListMessagesService } from './application/list-messages/list-messages.service'
import { SendMessageService } from './application/send-message/send-message.service'
import {
  CreateSenderService,
  ListSendersService,
  UpdateSenderService,
} from './application/senders/sender-admin.service'
import {
  CreateTemplateService,
  GetTemplateService,
  ListTemplatesService,
  UpdateTemplateService,
} from './application/templates/template-admin.service'
import { systemClock } from './domain/ports/clock.port'
import { systemRng } from './domain/ports/rng.port'
import type { Env } from './infrastructure/config/env'
import { InProcessEventPublisher } from './infrastructure/events/in-process-event-publisher'
import { EvolutionWhatsAppGateway } from './infrastructure/gateways/evolution/evolution.gateway'
import { HttpAttachmentFetcher } from './infrastructure/gateways/http-attachment-fetcher'
import {
  type InlineImage,
  SendGridEmailGateway,
} from './infrastructure/gateways/sendgrid/sendgrid.gateway'
import { createLogger, type Logger } from './infrastructure/logging/logger'
import { withSentryMirror } from './infrastructure/observability/sentry'
import { OutboxPoller } from './infrastructure/outbox/outbox-poller'
import { PG_CHANNELS } from './infrastructure/persistence/drizzle/channels'
import { createDbConnection, type DbConnection } from './infrastructure/persistence/drizzle/db'
import { DrizzleMessageRepository } from './infrastructure/persistence/drizzle/message.repository'
import { DrizzleMetricsRepository } from './infrastructure/persistence/drizzle/metrics.repository'
import { DrizzleOutboxRepository } from './infrastructure/persistence/drizzle/outbox.repository'
import { PgNotificationListener } from './infrastructure/persistence/drizzle/pg-notification-listener'
import { DrizzleSenderRepository } from './infrastructure/persistence/drizzle/sender.repository'
import { DrizzleSuppressionRepository } from './infrastructure/persistence/drizzle/suppression.repository'
import { DrizzleTemplateRepository } from './infrastructure/persistence/drizzle/template.repository'
import { DrizzleWebhookInboxRepository } from './infrastructure/persistence/drizzle/webhook-inbox.repository'
import { DrizzleWhatsAppInstanceRepository } from './infrastructure/persistence/drizzle/whatsapp-instance.repository'
import { SendWorker } from './infrastructure/workers/send-worker'
import { createServer } from './interfaces/http/server'

/**
 * Chave do advisory lock do ciclo de limpeza/retenção ('msging' em ASCII int8;
 * string + cast ::bigint — o driver não tipa BigInt como parâmetro). O espaço de
 * advisory locks é GLOBAL ao banco compartilhado do monorepo — a constante
 * precisa ser única entre os serviços (o payments usa outra).
 */
const RETENTION_ADVISORY_LOCK_KEY = '120342423629415'

export interface Application {
  logger: Logger
  start(): Promise<void>
  stop(): Promise<void>
}

/**
 * Raiz de composição (injeção de dependências). ÚNICO lugar que instancia
 * adapters concretos e os pluga nos ports: repositórios, provedores (SendGrid/
 * Evolution), outbox poller e o worker de envio (ritmo anti-ban + rotação).
 */
export function createApplication(env: Env): Application {
  // Espelho do Sentry: todo log ERROR vira evento alertável (no-op sem DSN).
  const logger = withSentryMirror(
    createLogger({
      level: env.NODE_ENV === 'production' ? 'info' : 'debug',
      pretty: env.NODE_ENV !== 'production',
    }),
  )

  const connection: DbConnection = createDbConnection(env.DATABASE_URL, {
    max: env.DATABASE_POOL_MAX,
  })
  const db = connection.db
  const clock = systemClock
  const idGen = () => crypto.randomUUID()

  // Repositórios
  const templates = new DrizzleTemplateRepository(db)
  const messages = new DrizzleMessageRepository(db)
  const senders = new DrizzleSenderRepository(db)
  const instances = new DrizzleWhatsAppInstanceRepository(db)
  const suppressions = new DrizzleSuppressionRepository(db)
  const outboxRepo = new DrizzleOutboxRepository(db)
  const webhookInbox = new DrizzleWebhookInboxRepository(db)

  // Eventos + outbox poller
  const publisher = new InProcessEventPublisher(logger)
  const outboxPoller = new OutboxPoller(outboxRepo, publisher, logger, {
    intervalMs: env.OUTBOX_POLL_INTERVAL_MS,
    batchSize: env.OUTBOX_BATCH_SIZE,
    maxAttempts: env.OUTBOX_MAX_ATTEMPTS,
  })
  const notifications = new PgNotificationListener(connection.sql, logger)

  // Logos embutidas nos e-mails (attachment inline + `cid:` — viajam DENTRO da
  // mensagem; sem hospedagem externa/proxy de imagem). Arquivos versionados no
  // próprio package (`assets/`); ausência não derruba o boot (e-mail sai sem logo).
  const loadInlineImage = (contentId: string, filename: string): InlineImage | null => {
    try {
      return {
        contentId,
        filename,
        mimeType: 'image/png',
        contentBase64: readFileSync(join(import.meta.dir, '..', 'assets', filename)).toString(
          'base64',
        ),
      }
    } catch (error) {
      logger.warn('email.inline_image_missing', {
        filename,
        error: error instanceof Error ? error.message : String(error),
      })
      return null
    }
  }
  const inlineImages = [
    loadInlineImage('logo-sz-light', 'logo-sistema-zero-light.png'),
    loadInlineImage('logo-sz-dark', 'logo-sistema-zero-dark.png'),
  ].filter((i): i is InlineImage => i !== null)

  // Adapters de provedor + worker de envio (ritmo anti-ban + rotação de números)
  const emailGateway = new SendGridEmailGateway({ apiKey: env.SENDGRID_API_KEY, inlineImages })
  // Anexos por URL (e-mail): o worker busca os bytes no envio — teto de tamanho
  // + allowlist de hosts (anti-SSRF; vazia = dev liberado).
  const attachmentFetcher = new HttpAttachmentFetcher({
    maxBytes: env.ATTACHMENT_MAX_BYTES,
    allowedHosts: env.ATTACHMENT_FETCH_ALLOWED_HOSTS,
  })
  const whatsappGateway = new EvolutionWhatsAppGateway({
    baseUrl: env.EVOLUTION_URL,
    apiKey: env.EVOLUTION_API_KEY,
  })
  const sendWorker = new SendWorker({
    messages,
    instances,
    senders,
    suppressions,
    emailGateway,
    attachmentFetcher,
    whatsappGateway,
    clock,
    rng: systemRng,
    logger,
    config: {
      intervalMs: env.SEND_POLL_INTERVAL_MS,
      emailRatePerSec: env.EMAIL_RATE_PER_SEC,
      // Capacidade do bucket (rajada máxima) ≈ taxa sustentada × intervalo de poll.
      emailBatchSize: Math.max(
        1,
        Math.ceil((env.EMAIL_RATE_PER_SEC * env.SEND_POLL_INTERVAL_MS) / 1000),
      ),
      whatsappBatchSize: env.SEND_BATCH_SIZE,
      laneLeaseMs: env.WA_LANE_LEASE_MS,
      claimLeaseMs: env.SEND_CLAIM_LEASE_MS,
      pacing: {
        minDelayMs: env.WA_MIN_DELAY_MS,
        maxDelayMs: env.WA_MAX_DELAY_MS,
        restAfterN: env.WA_REST_AFTER_N,
        restDurationMs: env.WA_REST_DURATION_MS,
        warmupDays: env.WA_WARMUP_DAYS,
        warmupStartCap: env.WA_WARMUP_START_CAP,
      },
      retry: { baseMs: env.SEND_RETRY_BASE_MS, maxMs: env.SEND_RETRY_MAX_MS },
      typingMinMs: 800,
      typingMaxMs: 2500,
    },
  })

  // Casos de uso
  const sendMessage = new SendMessageService(
    templates,
    messages,
    senders,
    suppressions,
    clock,
    idGen,
  )
  const getMessage = new GetMessageService(messages)
  const listMessages = new ListMessagesService(messages)
  const createTemplate = new CreateTemplateService(templates, clock, idGen)
  const updateTemplate = new UpdateTemplateService(templates, clock)
  const getTemplate = new GetTemplateService(templates)
  const listTemplates = new ListTemplatesService(templates)
  const createSender = new CreateSenderService(senders, clock, idGen)
  const updateSender = new UpdateSenderService(senders, clock)
  const listSenders = new ListSendersService(senders)
  const createInstance = new CreateInstanceService(instances, clock, idGen)
  const updateInstance = new UpdateInstanceService(instances, clock)
  const listInstances = new ListInstancesService(instances)
  const applyStatus = new ApplyDeliveryStatusService(messages, suppressions, webhookInbox, logger)
  const setConnection = new SetInstanceConnectionService(instances, clock)

  // Readiness: pronto = banco respondendo (healthcheck do deploy aponta p/ /readyz).
  const readiness = async () => {
    try {
      await connection.sql`select 1`
      return { ready: true, checks: { db: 'ok' } }
    } catch (error) {
      logger.warn('readyz.db_unreachable', {
        error: error instanceof Error ? error.message : String(error),
      })
      return { ready: false, checks: { db: 'unreachable' } }
    }
  }

  const metricsRepo = new DrizzleMetricsRepository(db)

  const server = createServer({
    env,
    logger,
    clock,
    readiness,
    metrics: () => metricsRepo.getMetrics(),
    sendMessage,
    getMessage,
    listMessages,
    createTemplate,
    updateTemplate,
    getTemplate,
    listTemplates,
    createSender,
    updateSender,
    listSenders,
    createInstance,
    updateInstance,
    listInstances,
    applyStatus,
    setConnection,
  })

  let cleanupTimer: ReturnType<typeof setInterval> | null = null

  return {
    logger,
    async start() {
      outboxPoller.start()
      sendWorker.start()
      if (env.PG_LISTEN_ENABLED) {
        await notifications.listen(PG_CHANNELS.outbox, () => outboxPoller.wake())
        await notifications.listen(PG_CHANNELS.sends, () => sendWorker.wake())
      }
      // Retenção periódica (fora do hot path). O advisory lock garante que SÓ UMA
      // réplica executa o ciclo (N réplicas com os mesmos DELETEs = carga ×N);
      // xact-lock → solta sozinho no commit/crash (espelha o payments).
      const runCleanupCycle = async () => {
        await connection.sql.begin(async (gate) => {
          const [row] = await gate`
            select pg_try_advisory_xact_lock(${RETENTION_ADVISORY_LOCK_KEY}::bigint) as locked
          `
          if (!row?.locked) return // outra réplica está limpando neste ciclo
          const cutoff = new Date(Date.now() - env.RETENTION_DAYS * 24 * 60 * 60 * 1000)
          const messagesCutoff = new Date(
            Date.now() - env.MESSAGES_RETENTION_DAYS * 24 * 60 * 60 * 1000,
          )
          const [outboxRows, webhookRows, messageRows] = await Promise.all([
            outboxRepo.cleanup(cutoff),
            webhookInbox.cleanup(cutoff),
            // Mensagens TERMINAIS: o rendered_body (~6KB/linha) cresceria p/ sempre.
            messages.cleanup(messagesCutoff),
          ])
          if (outboxRows + webhookRows + messageRows > 0) {
            logger.info('retention.cleaned', {
              outbox: outboxRows,
              webhookEvents: webhookRows,
              messages: messageRows,
            })
          }
        })
      }
      cleanupTimer = setInterval(() => {
        void runCleanupCycle().catch((error) =>
          logger.error('retention.cleanup.failed', {
            error: error instanceof Error ? error.message : String(error),
          }),
        )
      }, env.CLEANUP_INTERVAL_MS)
      // `::` = dual-stack (IPv4+IPv6) — necessário p/ o private networking do Railway.
      server.listen({ port: env.PORT, hostname: env.HOST })
      logger.info('http.listening', { port: env.PORT, host: env.HOST })
    },
    async stop() {
      if (cleanupTimer) clearInterval(cleanupTimer)
      try {
        await server.stop()
      } catch {
        // server pode nunca ter feito listen (ex.: caminho de testes via app.handle)
      }
      await notifications.stop()
      await Promise.all([sendWorker.stop(), outboxPoller.stop()])
      await connection.close()
      logger.info('app.stopped')
    },
  }
}
