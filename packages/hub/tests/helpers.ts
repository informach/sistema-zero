import { randomUUID } from 'node:crypto'
import { AccessResolutionService } from '../src/application/access/access-resolution.service'
import { AttachmentService } from '../src/application/attachments/attachment.service'
import {
  ChannelAdminService,
  SpaceAdminService,
} from '../src/application/community-admin/community-admin.service'
import { ModerationService } from '../src/application/moderation/moderation.service'
import { ReportService } from '../src/application/moderation/report.service'
import { ReactionService } from '../src/application/reactions/reaction.service'
import { ReadCommunityService } from '../src/application/read-community/read-community.service'
import { ReadStateService } from '../src/application/read-state/read-state.service'
import { ShowcaseService } from '../src/application/showcase/showcase.service'
import { ThreadService } from '../src/application/threads/thread.service'
import type { AttachmentLimits } from '../src/domain/attachment/attachment'
import { MicroCache } from '../src/infrastructure/cache/micro-cache'
import type { Env } from '../src/infrastructure/config/env'
import { createServer } from '../src/interfaces/http/server'
import {
  FakeMembersGateway,
  InMemoryAttachmentRepository,
  InMemoryCommunityAdminRepository,
  InMemoryModerationRepository,
  InMemoryProcessedWebhookRepository,
  InMemoryReactionRepository,
  InMemoryReadStateRepository,
  InMemoryThreadRepository,
  silentLogger,
} from './fakes/in-memory'

/** Segredo HMAC dos webhooks nos testes (o gateway re-assina como consumer `gateway`). */
export const TEST_WEBHOOK_SECRET = 'test-gateway-hmac-secret-0001'

/** Limites de anexo dos testes (pequenos p/ exercitar os erros de tamanho). */
const TEST_ATTACHMENT_LIMITS: AttachmentLimits = {
  maxBytesByKind: {
    image: 10 * 1024 * 1024,
    pdf: 25 * 1024 * 1024,
    document: 25 * 1024 * 1024,
    audio: 25 * 1024 * 1024,
    video: 200 * 1024 * 1024,
  },
  maxPerPost: 10,
}

export function buildApp(
  opts: {
    internalToken?: string
    requireAdmin?: boolean
    accessCacheTtlMs?: number
    /** Relógio injetável (testes de ordenação/cursor incrementam manualmente). */
    clock?: () => Date
    readiness?: () => Promise<{ ready: boolean; checks: Record<string, string> }>
  } = {},
) {
  const repo = new InMemoryCommunityAdminRepository()
  const threadRepo = new InMemoryThreadRepository()
  const reactionRepo = new InMemoryReactionRepository()
  const readStateRepo = new InMemoryReadStateRepository()
  const moderationRepo = new InMemoryModerationRepository(threadRepo, repo)
  const attachmentRepo = new InMemoryAttachmentRepository()
  // O create de tópico/comentário vincula anexos atomicamente (espelha o repo Drizzle).
  threadRepo.attachments = attachmentRepo
  const processedWebhookRepo = new InMemoryProcessedWebhookRepository()
  const members = new FakeMembersGateway()
  const cache = new MicroCache<{ granted: Set<string>; hasMaster: boolean }>(
    opts.accessCacheTtlMs ?? 0,
  )
  const access = new AccessResolutionService(members, cache)
  const clock = opts.clock ?? (() => new Date())
  const limits = TEST_ATTACHMENT_LIMITS
  const env = { NODE_ENV: 'test', MAX_REQUEST_BODY_BYTES: 64 * 1024 } as unknown as Env

  const app = createServer({
    env,
    logger: silentLogger,
    readiness: opts.readiness ?? (async () => ({ ready: true, checks: { db: 'ok' } })),
    spaces: {
      read: new ReadCommunityService(repo, access, readStateRepo, threadRepo),
      internalToken: opts.internalToken,
    },
    threads: {
      threads: new ThreadService(
        repo,
        access,
        threadRepo,
        reactionRepo,
        moderationRepo,
        attachmentRepo,
        limits,
        clock,
        () => randomUUID(),
      ),
      internalToken: opts.internalToken,
    },
    attachments: {
      attachments: new AttachmentService(
        attachmentRepo,
        repo,
        access,
        threadRepo,
        limits,
        clock,
        () => randomUUID(),
      ),
      internalToken: opts.internalToken,
    },
    reactions: {
      reactions: new ReactionService(repo, access, threadRepo, reactionRepo, moderationRepo, clock),
      readState: new ReadStateService(repo, access, readStateRepo, clock),
      internalToken: opts.internalToken,
    },
    report: {
      report: new ReportService(repo, access, threadRepo, moderationRepo, clock),
      internalToken: opts.internalToken,
    },
    showcase: {
      showcase: new ShowcaseService(repo, threadRepo, members, clock, () => randomUUID()),
      internalToken: opts.internalToken,
    },
    admin: {
      requireAdminEnabled: opts.requireAdmin ?? false,
      internalToken: opts.internalToken,
      spaces: new SpaceAdminService(repo),
      channels: new ChannelAdminService(repo),
    },
    moderation: {
      requireAdminEnabled: opts.requireAdmin ?? false,
      internalToken: opts.internalToken,
      moderation: new ModerationService(threadRepo, moderationRepo, clock),
    },
    webhooks: {
      access,
      processed: processedWebhookRepo,
      webhookSecret: TEST_WEBHOOK_SECRET,
      toleranceSeconds: 300,
    },
  })

  return {
    app,
    repo,
    threadRepo,
    reactionRepo,
    readStateRepo,
    moderationRepo,
    attachmentRepo,
    processedWebhookRepo,
    members,
    access,
  }
}

/** Headers de um ator admin (X-Auth-User-* injetados pelo gateway). */
export function adminHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return {
    'content-type': 'application/json',
    'x-auth-user-id': '11111111-1111-1111-1111-111111111111',
    'x-auth-user-role': 'admin',
    'x-auth-user-status': 'active',
    ...extra,
  }
}

/** Headers de um aluno comum (role customer). */
export function studentHeaders(
  userId: string,
  extra: Record<string, string> = {},
): Record<string, string> {
  return {
    'content-type': 'application/json',
    'x-auth-user-id': userId,
    'x-auth-user-role': 'customer',
    'x-auth-user-status': 'active',
    ...extra,
  }
}

/** Faz uma request JSON contra a app Elysia (via app.handle). */
export function jsonRequest(
  method: string,
  path: string,
  opts: { headers?: Record<string, string>; body?: unknown } = {},
): Request {
  return new Request(`http://local${path}`, {
    method,
    headers: opts.headers ?? { 'content-type': 'application/json' },
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  })
}
