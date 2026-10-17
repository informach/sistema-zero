import { creativeToolAvailability } from '@sistemazero/core/journey'
import * as P from '@sistemazero/core/pensa'
import { and, desc, eq, lt, or } from 'drizzle-orm'
import { Elysia } from 'elysia'
import { z } from 'zod'
import type { AccessCheckService } from '../../../application/access-check/access-check.service'
import type { GetAiCreditsService } from '../../../application/ai-usage/get-ai-credits.service'
import type { GetGamificationService } from '../../../application/gamification/get-gamification.service'
import type { PensaProjectService } from '../../../application/pensa/project.service'
import type { PensaTeamService } from '../../../application/pensa/team.service'
import { pensaError } from '../../../domain/pensa/project.errors'
import {
  type DrizzlePensaCheckpointsRepository,
  PensaProtectionActionSchema,
} from '../../../infrastructure/persistence/drizzle/pensa-checkpoints.repository'
import {
  type DrizzlePensaNarrationsRepository,
  PensaVoiceRequestSchema,
} from '../../../infrastructure/persistence/drizzle/pensa-narrations.repository'
import type { DrizzlePensaOperationsRepository } from '../../../infrastructure/persistence/drizzle/pensa-operations.repository'
import {
  type DrizzlePensaProjectRepository,
  operationView,
} from '../../../infrastructure/persistence/drizzle/pensa-project.repository'
import type { DrizzlePensaRewardsRepository } from '../../../infrastructure/persistence/drizzle/pensa-rewards.repository'
import {
  pensaMissionProgress,
  pensaOperations,
  pensaProjectMessages,
  pensaProjectRevisions,
} from '../../../infrastructure/persistence/drizzle/schema'
import {
  assertInternalCaller,
  assertMemberShellConsumer,
  isPrivilegedActor,
  resolveAccountId,
  resolveUserId,
} from '../auth'

export interface PensaRoutesDeps {
  projects: PensaProjectService
  store: DrizzlePensaProjectRepository
  team: PensaTeamService
  operations: DrizzlePensaOperationsRepository
  checkpoints: DrizzlePensaCheckpointsRepository
  narrations: DrizzlePensaNarrationsRepository
  rewards: DrizzlePensaRewardsRepository
  accessCheck: AccessCheckService
  getGamification: GetGamificationService
  credits: GetAiCreditsService
  internalToken?: string
}

const id = z.uuid()
const projectParams = z.strictObject({ projectId: id })
const missionParams = z.strictObject({ missionId: id })
const operationParams = z.strictObject({ projectId: id, operationId: id })
const request = z.strictObject({ requestId: id })
const capsEnvelope = { actor: P.PensaActorSchema, capabilities: P.PensaCapabilitiesSchema }
const inspection = z.strictObject({
  creation: P.PensaCreationRefSchema,
  installedExtensionIds: z.array(z.string().min(1)).max(80),
})

export function pensaRoutes(deps: PensaRoutesDeps) {
  const store = deps.store
  const actor = (headers: Record<string, string | undefined>): P.PensaActor => ({
    profileId: resolveUserId(headers),
    accountId: resolveAccountId(headers),
    privileged: isPrivilegedActor(headers),
  })
  async function canGenerate(who: P.PensaActor) {
    if (who.privileged) return
    const [access, progress] = await Promise.all([
      deps.accessCheck.execute(who.accountId, ['pensa']),
      deps.getGamification.execute(who.profileId, who.accountId, { audience: 'kids' }),
    ])
    if (
      creativeToolAvailability({
        tool: 'pensa',
        owned: access.grants.includes('pensa') || access.communities.includes('pensa'),
        level: progress.level.slug,
      }) !== 'available'
    )
      pensaError('RESOURCES_UNAVAILABLE', 'O Pensa ainda não está liberado para este perfil.')
  }
  const publicRoutes = new Elysia({ prefix: '/members/pensa' })
    .onTransform(({ headers, request }) => {
      assertInternalCaller(headers['x-internal-token'], deps.internalToken)
      if (request.method !== 'GET' && headers['x-auth-impersonator-id'])
        pensaError('NOT_YOUR_MISSION', 'A sessão de suporte permite somente consultar.')
    })
    .get(
      '/projects',
      ({ headers, query }) => deps.projects.list(actor(headers), query.status ?? 'active'),
      { query: z.strictObject({ status: z.enum(['active', 'archived']).optional() }) },
    )
    .post(
      '/projects',
      async ({ headers, body }) => {
        const who = actor(headers)
        await canGenerate(who)
        return deps.projects.create(who, body)
      },
      { body: P.PensaCreateProjectRequestSchema },
    )
    .patch(
      '/projects/:projectId',
      ({ headers, params, body }) => deps.projects.metadata(actor(headers), params.projectId, body),
      { params: projectParams, body: P.PensaMetadataRequestSchema },
    )
    .delete(
      '/projects/:projectId',
      async ({ headers, params, body }) => {
        await store.delete(actor(headers), params.projectId, body.requestId)
        return { deleted: true }
      },
      { params: projectParams, body: request },
    )
    .get(
      '/projects/:projectId/messages',
      async ({ headers, params, query }) => {
        await store.get(actor(headers), params.projectId)
        const cursor = query.cursor
          ? (
              await store.db
                .select()
                .from(pensaProjectMessages)
                .where(
                  and(
                    eq(pensaProjectMessages.id, query.cursor),
                    eq(pensaProjectMessages.projectId, params.projectId),
                  ),
                )
            )[0]
          : null
        if (query.cursor && !cursor)
          pensaError('REVISION_CONFLICT', 'Esta página de mensagens mudou. Abra a conversa atual.')
        const limit = query.limit ?? 30
        const rows = await store.db
          .select()
          .from(pensaProjectMessages)
          .where(
            and(
              eq(pensaProjectMessages.projectId, params.projectId),
              cursor
                ? or(
                    lt(pensaProjectMessages.createdAt, cursor.createdAt),
                    and(
                      eq(pensaProjectMessages.createdAt, cursor.createdAt),
                      lt(pensaProjectMessages.id, cursor.id),
                    ),
                  )
                : undefined,
            ),
          )
          .orderBy(desc(pensaProjectMessages.createdAt), desc(pensaProjectMessages.id))
          .limit(limit + 1)
        const page = rows.slice(0, limit)
        return {
          items: page.map((row) => P.PensaMessageSchema.parse(row.data)).reverse(),
          nextCursor: rows.length > limit ? (page.at(-1)?.id ?? null) : null,
        }
      },
      {
        params: projectParams,
        query: z.strictObject({
          limit: z.coerce.number().int().min(1).max(100).optional(),
          cursor: id.optional(),
        }),
      },
    )
    .post(
      '/projects/:projectId/messages',
      async ({ headers, params, body }) => {
        const who = actor(headers)
        await canGenerate(who)
        return deps.projects.message(who, params.projectId, body)
      },
      { params: projectParams, body: P.PensaMessageRequestSchema },
    )
    .get(
      '/projects/:projectId/operations/:operationId',
      async ({ headers, params }) => {
        await store.get(actor(headers), params.projectId)
        const [row] = await store.db
          .select()
          .from(pensaOperations)
          .where(
            and(
              eq(pensaOperations.id, params.operationId),
              eq(pensaOperations.projectId, params.projectId),
            ),
          )
        if (!row) pensaError('PROJECT_GONE', 'Este pedido não está disponível.')
        return operationView(row)
      },
      { params: operationParams },
    )
    .post(
      '/projects/:projectId/operations/:operationId/cancel',
      async ({ headers, params, body }) => {
        await deps.operations.cancel(
          actor(headers),
          params.projectId,
          params.operationId,
          body.requestId,
        )
        return { cancelled: true }
      },
      { params: operationParams, body: request },
    )
    .get(
      '/projects/:projectId/draft',
      async ({ headers, params }) => (await store.get(actor(headers), params.projectId)).draft,
      { params: projectParams },
    )
    .delete(
      '/projects/:projectId/draft',
      async ({ headers, params, body }) => {
        await deps.projects.discardDraft(actor(headers), params.projectId, body.requestId)
        return { discarded: true }
      },
      { params: projectParams, body: request },
    )
    .get(
      '/projects/:projectId/revisions',
      async ({ headers, params, query }) => {
        await store.get(actor(headers), params.projectId)
        const limit = query.limit ?? 20
        const rows = await store.db
          .select()
          .from(pensaProjectRevisions)
          .where(
            and(
              eq(pensaProjectRevisions.projectId, params.projectId),
              query.cursor === undefined
                ? undefined
                : lt(pensaProjectRevisions.number, query.cursor),
            ),
          )
          .orderBy(desc(pensaProjectRevisions.number))
          .limit(limit + 1)
        const items = rows
          .slice(0, limit)
          .map((r) => P.PensaProjectRevisionSchema.parse(r.snapshot))
        return { items, nextCursor: rows.length > limit ? (items.at(-1)?.number ?? null) : null }
      },
      {
        params: projectParams,
        query: z.strictObject({
          limit: z.coerce.number().int().min(1).max(100).optional(),
          cursor: z.coerce.number().int().positive().optional(),
        }),
      },
    )
    .get(
      '/projects/:projectId/checkpoints',
      ({ headers, params }) => deps.checkpoints.list(actor(headers), params.projectId),
      { params: projectParams },
    )
    .get(
      '/projects/:projectId/members',
      ({ headers, params }) => deps.team.team(actor(headers), params.projectId),
      { params: projectParams },
    )
    .get(
      '/projects/:projectId/roles',
      ({ headers, params }) => deps.team.team(actor(headers), params.projectId),
      { params: projectParams },
    )
    .put(
      '/projects/:projectId/roles',
      ({ headers, params, body }) => deps.team.setRoles(actor(headers), params.projectId, body),
      { params: projectParams, body: P.PensaRolesRequestSchema },
    )
    .post(
      '/projects/:projectId/share',
      ({ headers, params, body }) =>
        deps.team.share(actor(headers), params.projectId, body.requestId, true),
      { params: projectParams, body: request },
    )
    .delete(
      '/projects/:projectId/share',
      ({ headers, params, body }) =>
        deps.team.share(actor(headers), params.projectId, body.requestId, false),
      { params: projectParams, body: request },
    )
    .post(
      '/projects/join',
      async ({ headers, body }) => {
        const who = actor(headers)
        await canGenerate(who)
        return deps.team.join(who, body.requestId, body.code)
      },
      { body: z.strictObject({ requestId: id, code: z.string().min(1).max(20) }) },
    )
    .delete(
      '/projects/:projectId/members/:profileId',
      async ({ headers, params, body }) => {
        await deps.team.remove(actor(headers), params.projectId, params.profileId, body.requestId)
        return { removed: true }
      },
      {
        params: z.strictObject({ projectId: id, profileId: z.union([id, z.literal('me')]) }),
        body: request,
      },
    )
    .get(
      '/projects/:projectId/team-art',
      ({ headers, params }) => deps.team.art(actor(headers), params.projectId),
      { params: projectParams },
    )
    .get(
      '/projects/:projectId/team-art/:missionId/:slotId/download',
      ({ headers, params }) =>
        deps.team.artDownload(actor(headers), params.projectId, params.missionId, params.slotId),
      { params: z.strictObject({ projectId: id, missionId: id, slotId: id }) },
    )
    .get('/credits', ({ headers }) =>
      deps.credits.execute(resolveAccountId(headers), isPrivilegedActor(headers)),
    )

  const internal = new Elysia({ prefix: '/members/internal/pensa' })
    .onTransform(({ headers }) => {
      assertInternalCaller(headers['x-internal-token'], deps.internalToken)
      assertMemberShellConsumer(headers['x-consumer-id'])
    })
    .post('/rewards/work', () => deps.rewards.work(), { body: z.strictObject({}) })
    .post(
      '/projects/:projectId/context',
      ({ params, body }) => deps.team.context(body.actor, params.projectId),
      { params: projectParams, body: z.strictObject({ actor: P.PensaActorSchema }) },
    )
    .post(
      '/projects/:projectId/view',
      async ({ params, body }) => ({
        ...(await deps.projects.get(body.actor, params.projectId, body.capabilities)),
        team: await deps.team.team(body.actor, params.projectId),
      }),
      { params: projectParams, body: z.strictObject(capsEnvelope) },
    )
    .post(
      '/missions/:missionId/context',
      async ({ params, body }) => {
        const [row] = await store.db
          .select({ projectId: pensaMissionProgress.projectId })
          .from(pensaMissionProgress)
          .where(eq(pensaMissionProgress.missionId, params.missionId))
        if (!row) pensaError('PROJECT_GONE', 'Esta missão não está mais no plano.')
        const state = await store.get(body.actor, row.projectId)
        if (!state.revision?.plan.missions.some((m) => m.id === params.missionId))
          pensaError('PROJECT_GONE', 'Esta missão não está mais no plano.')
        return { projectId: row.projectId }
      },
      { params: missionParams, body: z.strictObject({ actor: P.PensaActorSchema }) },
    )
    .post(
      '/missions/:missionId/handoff',
      ({ params, body }) => deps.projects.handoff(body.actor, params.missionId, body.capabilities),
      { params: missionParams, body: z.strictObject(capsEnvelope) },
    )
    .post(
      '/projects/:projectId/draft/edit',
      ({ params, body }) =>
        deps.projects.editDraft(body.actor, params.projectId, body.input, body.capabilities),
      {
        params: projectParams,
        body: z.strictObject({ ...capsEnvelope, input: P.PensaDraftEditRequestSchema }),
      },
    )
    .post(
      '/projects/:projectId/draft/accept',
      async ({ params, body }) => {
        await canGenerate(body.actor)
        return deps.projects.acceptDraft(
          body.actor,
          params.projectId,
          body.input,
          body.capabilities,
        )
      },
      {
        params: projectParams,
        body: z.strictObject({ ...capsEnvelope, input: P.PensaDraftAcceptRequestSchema }),
      },
    )
    .post(
      '/projects/:projectId/operations/:operationId/retry',
      async ({ params, body }) => {
        await canGenerate(body.actor)
        await deps.operations.retry(
          body.actor,
          params.projectId,
          params.operationId,
          body.requestId,
          body.capabilities,
        )
        return { ok: true }
      },
      { params: operationParams, body: z.strictObject({ ...capsEnvelope, requestId: id }) },
    )
    .post(
      '/projects/:projectId/operations/:operationId/claim',
      async ({ params, body }) => {
        await canGenerate(body.actor)
        return {
          work: await deps.operations.claim(
            body.actor,
            params.projectId,
            params.operationId,
            body.leaseId,
            body.capabilities,
          ),
        }
      },
      { params: operationParams, body: z.strictObject({ ...capsEnvelope, leaseId: id }) },
    )
    .post(
      '/projects/:projectId/operations/:operationId/publish',
      async ({ params, body }) => {
        await canGenerate(body.actor)
        await deps.operations.publish(
          body.actor,
          params.projectId,
          params.operationId,
          body.leaseId,
          body.result,
          body.capabilities,
        )
        return { ok: true }
      },
      {
        params: operationParams,
        body: z.strictObject({
          ...capsEnvelope,
          leaseId: id,
          result: P.PensaOperationStepResultSchema,
        }),
      },
    )
    .post(
      '/projects/:projectId/operations/:operationId/fail',
      async ({ params, body }) => {
        await deps.operations.fail(
          body.actor,
          params.projectId,
          params.operationId,
          body.leaseId,
          body.message,
        )
        return { ok: true }
      },
      {
        params: operationParams,
        body: z.strictObject({
          actor: P.PensaActorSchema,
          leaseId: id,
          message: z.string().max(1_000).optional(),
        }),
      },
    )
    .post(
      '/projects/:projectId/protect',
      async ({ params, body }) => {
        const ticket = await deps.checkpoints.protect(
          body.actor,
          params.projectId,
          body.action,
          body.capabilities,
        )
        return body.action.type === 'commit' ||
          body.action.type === 'restore_commit' ||
          body.action.type === 'abort'
          ? deps.projects.readBase(body.actor, params.projectId)
          : ticket
      },
      {
        params: projectParams,
        body: z.strictObject({ ...capsEnvelope, action: PensaProtectionActionSchema }),
      },
    )
    .post('/narrations', ({ body }) => deps.narrations.voice(body.actor, body.input), {
      body: z.strictObject({ actor: P.PensaActorSchema, input: PensaVoiceRequestSchema }),
    })

  const commands = {
    start: P.PensaMissionStartRequestSchema,
    complete: P.PensaMissionCompleteRequestSchema,
    reconfirm: P.PensaMissionCompleteRequestSchema,
    reopen: P.PensaMissionReopenRequestSchema,
    note: P.PensaMissionNoteRequestSchema,
    deliveries: P.PensaMissionDeliveriesRequestSchema,
  }
  for (const command of [
    'start',
    'complete',
    'reconfirm',
    'reopen',
    'note',
    'deliveries',
  ] as const) {
    const bodySchema = z.strictObject({
      ...capsEnvelope,
      input: commands[command],
      inspection: inspection.optional(),
    })
    internal.post(
      `/missions/:missionId/${command}`,
      async ({ params, body }) => {
        let verified = false
        if (command === 'complete' || command === 'reconfirm') {
          const handoff = await deps.projects.handoff(
            body.actor,
            params.missionId,
            body.capabilities,
          )
          if (handoff.mission.kind === 'setup' && body.inspection && 'deliveries' in body.input) {
            const needed = [
              handoff.mission.setup.runtimeExtensionId,
              ...handoff.mission.setup.requiredAuxiliaryExtensionIds,
            ]
            const inspected = body.inspection.creation
            verified =
              needed.every((id) => body.inspection?.installedExtensionIds.includes(id)) &&
              body.input.deliveries.some(
                ({ creation }) =>
                  creation.tool === inspected.tool &&
                  creation.profileId === inspected.profileId &&
                  creation.creationId === inspected.creationId &&
                  creation.saveRevision === inspected.saveRevision,
              )
          }
        }
        return deps.projects.mission(
          body.actor,
          params.missionId,
          command,
          body.input,
          body.capabilities,
          verified,
        )
      },
      { params: missionParams, body: bodySchema },
    )
  }
  return new Elysia().use(publicRoutes).use(internal)
}
