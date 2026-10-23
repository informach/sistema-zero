import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { AccessResolutionService } from '../src/application/access/access-resolution.service'
import { AttachmentService } from '../src/application/attachments/attachment.service'
import {
  ChannelAdminService,
  SpaceAdminService,
} from '../src/application/community-admin/community-admin.service'
import { ModerationService } from '../src/application/moderation/moderation.service'
import { ReportService } from '../src/application/moderation/report.service'
import { PurgeUserDataService } from '../src/application/purge-user-data/purge-user-data.service'
import { ReactionService } from '../src/application/reactions/reaction.service'
import { ReadCommunityService } from '../src/application/read-community/read-community.service'
import { ReadStateService } from '../src/application/read-state/read-state.service'
import { DeliverStudioCleanupsService } from '../src/application/showcase/deliver-studio-cleanups.service'
import { DeliverStudioReservationCleanupsService } from '../src/application/showcase/deliver-studio-reservation-cleanups.service'
import { GetShowcaseDeliveryService } from '../src/application/showcase/get-showcase-delivery.service'
import { ShowcaseService } from '../src/application/showcase/showcase.service'
import { ThreadService } from '../src/application/threads/thread.service'
import type { AttachmentLimits } from '../src/domain/attachment/attachment'
import type { StudioArtifactGateway } from '../src/domain/ports/studio-artifact-gateway.port'
import { noopStudioArtifactGateway } from '../src/domain/ports/studio-artifact-gateway.port'
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
export const TEST_INTERNAL_API_TOKEN = 'test-hub-internal-token-0001'

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
    /** Allowlist de paredes de vitrine; vazio = sem restrição (default dos testes). */
    showcaseWallSlugs?: string[]
    /** Slug do canal da parede dentro do servidor de vitrine. */
    showcaseWallChannelSlug?: string
    /** Gateway de limpeza de R2 (moderação) — injetável p/ espiar a chamada no delete. */
    studioArtifacts?: StudioArtifactGateway
    /** Contas já cercadas por exclusão (simula a barreira durável do Postgres). */
    deletedAccountIds?: string[]
  } = {},
) {
  const repo = new InMemoryCommunityAdminRepository()
  const threadRepo = new InMemoryThreadRepository()
  threadRepo.audienceForChannel = (id) =>
    repo.spaces.find(
      (space) => space.id === repo.channels.find((channel) => channel.id === id)?.spaceId,
    )?.audience
  const reactionRepo = new InMemoryReactionRepository()
  const readStateRepo = new InMemoryReadStateRepository()
  const moderationRepo = new InMemoryModerationRepository(threadRepo, repo)
  const attachmentRepo = new InMemoryAttachmentRepository()
  // O create de tópico/comentário vincula anexos atomicamente (espelha o repo Drizzle).
  threadRepo.attachments = attachmentRepo
  const processedWebhookRepo = new InMemoryProcessedWebhookRepository()
  const members = new FakeMembersGateway()
  const internalToken = opts.internalToken ?? TEST_INTERNAL_API_TOKEN
  const cache = new MicroCache<{
    granted: Set<string>
    hasMaster: boolean
    hasMasterKids: boolean
    communities: Set<string>
  }>(opts.accessCacheTtlMs ?? 0)
  const access = new AccessResolutionService(members, cache)
  const clock = opts.clock ?? (() => new Date())
  const limits = TEST_ATTACHMENT_LIMITS
  const env = { NODE_ENV: 'test', MAX_REQUEST_BODY_BYTES: 64 * 1024 } as unknown as Env

  const app = createServer({
    env,
    logger: silentLogger,
    accountDeletionFence: {
      isFenced: async (accountId: string) => opts.deletedAccountIds?.includes(accountId) ?? false,
    },
    readiness: opts.readiness ?? (async () => ({ ready: true, checks: { db: 'ok' } })),
    spaces: {
      read: new ReadCommunityService(repo, access, readStateRepo, threadRepo),
      internalToken,
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
      internalToken,
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
      requireAdminEnabled: opts.requireAdmin ?? false,
      internalToken,
    },
    reactions: {
      reactions: new ReactionService(repo, access, threadRepo, reactionRepo, moderationRepo, clock),
      readState: new ReadStateService(repo, access, readStateRepo, clock),
      internalToken,
    },
    report: {
      report: new ReportService(repo, access, threadRepo, moderationRepo, clock),
      internalToken,
    },
    showcase: {
      reservationCleanups: new DeliverStudioReservationCleanupsService(
        { claim: async () => null, acknowledge: async () => {} },
        { cleanupReservation: async () => false },
        clock,
      ),
      cleanups: new DeliverStudioCleanupsService(
        { claim: async () => null, acknowledge: async () => {} },
        opts.studioArtifacts ?? noopStudioArtifactGateway,
        clock,
      ),
      delivery: new GetShowcaseDeliveryService({ findStatus: async () => 'none' }),
      showcase: new ShowcaseService(
        repo,
        threadRepo,
        members,
        clock,
        () => randomUUID(),
        new Set(opts.showcaseWallSlugs ?? []),
        opts.showcaseWallChannelSlug ?? 'parede',
        { walls: new Set(['mural-dos-criadores-adulto']), access },
      ),
      internalToken,
    },
    admin: {
      requireAdminEnabled: opts.requireAdmin ?? false,
      internalToken,
      spaces: new SpaceAdminService(repo),
      channels: new ChannelAdminService(repo),
      purgeUserData: new PurgeUserDataService({
        purgeForUser: async () => {},
        isFenced: async () => false,
      }),
    },
    moderation: {
      requireAdminEnabled: opts.requireAdmin ?? false,
      internalToken,
      moderation: new ModerationService(
        threadRepo,
        moderationRepo,
        attachmentRepo,
        clock,
        opts.studioArtifacts,
        repo,
        members,
      ),
    },
    webhooks: {
      access,
      processed: processedWebhookRepo,
      webhookSecret: TEST_WEBHOOK_SECRET,
      toleranceSeconds: 300,
    },
    internal: {
      showcase: new ShowcaseService(
        repo,
        threadRepo,
        members,
        clock,
        () => randomUUID(),
        new Set(opts.showcaseWallSlugs ?? []),
        opts.showcaseWallChannelSlug ?? 'parede',
        { walls: new Set(['mural-dos-criadores-adulto']), access },
      ),
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
    'x-internal-token': TEST_INTERNAL_API_TOKEN,
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
    'x-internal-token': TEST_INTERNAL_API_TOKEN,
    ...extra,
  }
}

/** Faz uma request JSON contra a app Elysia (via app.handle). */
export function jsonRequest(
  method: string,
  path: string,
  opts: { headers?: Record<string, string>; body?: unknown } = {},
): Request {
  const studioBody =
    method === 'POST' &&
    path.startsWith('/hub/internal/showcase-thread-studio') &&
    opts.body &&
    typeof opts.body === 'object' &&
    !Array.isArray(opts.body) &&
    !('publisher' in opts.body) &&
    opts.headers?.['x-auth-user-id']
      ? {
          ...opts.body,
          publisher: {
            authorId: opts.headers['x-auth-user-id'],
            accountId: opts.headers['x-auth-account-id'] ?? opts.headers['x-auth-user-id'],
            audience:
              'spaceSlug' in opts.body &&
              typeof opts.body.spaceSlug === 'string' &&
              opts.body.spaceSlug.endsWith('-adulto')
                ? 'adult'
                : 'kids',
          },
        }
      : opts.body
  return new Request(`http://local${path}`, {
    method,
    headers: opts.headers ?? { 'content-type': 'application/json' },
    body: studioBody === undefined ? undefined : JSON.stringify(studioBody),
  })
}

/** Exercise the two real HTTP phases explicitly in legacy publication scenarios. */
export async function publishStudioRequest(
  app: { handle(request: Request): Promise<Response> },
  request: Request,
) {
  const body = z.record(z.string(), z.unknown()).parse(await request.clone().json())
  const prepareBody: Record<string, unknown> = {
    ...body,
    snapshotHash: body.snapshotHash ?? 'a'.repeat(64),
  }
  delete prepareBody.playId
  delete prepareBody.coverImageUrl
  delete prepareBody.reservationId
  if (prepareBody.liveWorkspace)
    prepareBody.liveWorkspace = {
      ...z.record(z.string(), z.unknown()).parse(prepareBody.liveWorkspace),
      playId: body.playId,
    }
  const prepared = await app.handle(
    new Request(`${request.url}/prepare`, {
      method: 'POST',
      headers: request.headers,
      body: JSON.stringify(prepareBody),
    }),
  )
  if (prepared.status !== 200) return prepared
  const result = await readStudioPreparation(prepared)
  if (result.state !== 'reserved') return Response.json({ thread: result.thread, deduped: true })
  return app.handle(
    new Request(request.url, {
      method: 'POST',
      headers: request.headers,
      body: JSON.stringify({
        ...body,
        liveWorkspace: prepareBody.liveWorkspace,
        snapshotHash: prepareBody.snapshotHash,
        reservationId: result.reservationId,
        playId: result.playId,
      }),
    }),
  )
}

const studioThreadSchema = z
  .object({ id: z.string(), playId: z.string(), status: z.string(), createdAt: z.string() })
  .passthrough()
const studioPreparationSchema = z.discriminatedUnion('state', [
  z.object({
    state: z.literal('reserved'),
    reservationId: z.string(),
    playId: z.string(),
    snapshotHash: z.string(),
  }),
  z.object({ state: z.literal('finalized'), thread: studioThreadSchema, deduped: z.literal(true) }),
  z.object({
    state: z.literal('retired'),
    thread: studioThreadSchema.nullable(),
    playId: z.string(),
  }),
])
export async function readStudioPreparation(response: Pick<Response, 'json'>) {
  return studioPreparationSchema.parse(await response.json())
}
export async function readStudioReserved(response: Pick<Response, 'json'>) {
  const value = await readStudioPreparation(response)
  if (value.state !== 'reserved') throw new Error('Expected private Studio reservation')
  return value
}
export async function readStudioPublication(response: Pick<Response, 'json'>) {
  return z.object({ thread: studioThreadSchema, deduped: z.boolean() }).parse(await response.json())
}
