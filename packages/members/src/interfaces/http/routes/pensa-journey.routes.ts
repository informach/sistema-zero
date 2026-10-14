import { creativeToolAvailability } from '@sistemazero/core/journey'
import { Elysia, t } from 'elysia'
import type { PensaJourneyService } from '../../../application/pensa/journey.service'
import { AccessDeniedError } from '../../../domain/entitlement/entitlement.errors'
import type { PensaJourneyActor } from '../../../domain/ports/pensa-journey-repository.port'
import {
  assertInternalCaller,
  assertMemberShellConsumer,
  isPrivilegedActor,
  resolveAccountId,
  resolveUserId,
} from '../auth'
import {
  PensaGenerationStartDto,
  PensaJourneyCommandDto,
  PensaJourneyParams,
  PensaOperationParams,
  PensaStepResultDto,
} from '../pensa-journey-dtos'
import type { PensaRoutesDeps } from './pensa.routes'

export interface PensaJourneyRoutesDeps {
  service: PensaJourneyService
  accessCheck: PensaRoutesDeps['accessCheck']
  getGamification: PensaRoutesDeps['getGamification']
  internalToken?: string
}

export function pensaJourneyRoutes(deps: PensaJourneyRoutesDeps) {
  const actor = (headers: Record<string, string | undefined>): PensaJourneyActor => ({
    profileId: resolveUserId(headers),
    accountId: resolveAccountId(headers),
    privileged: isPrivilegedActor(headers),
  })
  async function canGenerate(who: PensaJourneyActor) {
    if (who.privileged) return
    const [access, gamification] = await Promise.all([
      deps.accessCheck.execute(who.accountId, ['pensa']),
      deps.getGamification.execute(who.profileId, who.accountId, { audience: 'kids' }),
    ])
    if (
      creativeToolAvailability({
        tool: 'pensa',
        owned: access.grants.includes('pensa') || access.communities.includes('pensa'),
        level: gamification.level.slug,
      }) !== 'available'
    )
      throw new AccessDeniedError('O Pensa ainda não está liberado para este perfil.')
  }
  const uuid = t.String({ format: 'uuid' })
  const publicRoutes = new Elysia({ prefix: '/members/pensa/v2' })
    .onTransform(({ headers }) => {
      assertInternalCaller(headers['x-internal-token'], deps.internalToken)
    })
    .get(
      '/projects',
      ({ headers, query }) => deps.service.list(actor(headers), query.status ?? 'active'),
      {
        query: t.Object({
          status: t.Optional(t.Union([t.Literal('active'), t.Literal('archived')])),
        }),
      },
    )
    .post(
      '/projects',
      async ({ headers, body }) => {
        const who = actor(headers)
        await canGenerate(who)
        return deps.service.create(who, body.id)
      },
      {
        body: t.Object({ id: uuid }),
      },
    )
    .get(
      '/projects/:projectId',
      ({ headers, params }) => deps.service.get(actor(headers), params.projectId),
      { params: PensaJourneyParams },
    )
    .patch(
      '/projects/:projectId',
      ({ headers, params, body }) =>
        deps.service.archive(actor(headers), params.projectId, body.status),
      {
        params: PensaJourneyParams,
        body: t.Object({ status: t.Union([t.Literal('active'), t.Literal('archived')]) }),
      },
    )
    .delete(
      '/projects/:projectId',
      async ({ headers, params }) => {
        await deps.service.delete(actor(headers), params.projectId)
        return { deleted: true }
      },
      { params: PensaJourneyParams },
    )
    .post(
      '/projects/:projectId/command',
      async ({ headers, params, body }) => {
        const who = actor(headers)
        if (body.command.type === 'accept') await canGenerate(who)
        return deps.service.command(who, params.projectId, body.expectedRevision, body.command)
      },
      {
        params: PensaJourneyParams,
        body: t.Object({
          expectedRevision: t.Integer({ minimum: 0 }),
          command: PensaJourneyCommandDto,
        }),
      },
    )
    .post(
      '/projects/:projectId/cancel',
      ({ headers, params }) => deps.service.cancel(actor(headers), params.projectId),
      { params: PensaJourneyParams },
    )

  const signedActor = t.Object({ profileId: uuid, accountId: uuid, privileged: t.Boolean() })
  const protection = t.Union([
    t.Object({ type: t.Literal('prepare'), expectedRevision: t.Integer({ minimum: 0 }), id: uuid }),
    t.Object({ type: t.Literal('commit'), id: uuid }),
    t.Object({
      type: t.Literal('restore_prepare'),
      expectedRevision: t.Integer({ minimum: 0 }),
      id: uuid,
      checkpointId: uuid,
    }),
    t.Object({ type: t.Literal('restore_commit'), id: uuid }),
    t.Object({ type: t.Literal('increment'), expectedRevision: t.Integer({ minimum: 0 }) }),
  ])
  const internalRoutes = new Elysia({ prefix: '/members/internal/pensa/v2' })
    .onTransform(({ headers }) => {
      assertInternalCaller(headers['x-internal-token'], deps.internalToken)
      // O gateway reinjeta o consumer HMAC AUTENTICADO como `x-consumer-id` (nunca o valor do
      // cliente), como em `gallery-delivery` e `members.routes`. Não existe `x-auth-consumer-id`.
      assertMemberShellConsumer(headers['x-consumer-id'])
    })
    .post(
      '/projects/:projectId/protect',
      ({ params, body }) => deps.service.protect(body.actor, params.projectId, body.action),
      { params: PensaJourneyParams, body: t.Object({ actor: signedActor, action: protection }) },
    )
    .post('/narrations', ({ body }) => deps.service.voice(body.actor, body.input), {
      body: t.Object({
        actor: signedActor,
        input: t.Object({
          type: t.Union([t.Literal('claim'), t.Literal('commit'), t.Literal('fail')]),
          id: t.String({ pattern: '^[a-f0-9]{64}$' }),
          chars: t.Integer({ minimum: 1, maximum: 4000 }),
          leaseId: uuid,
          projectId: t.Optional(uuid),
        }),
      }),
    })
    .post(
      '/projects/:projectId/start',
      async ({ params, body }) => {
        await canGenerate(body.actor)
        return deps.service.start(body.actor, params.projectId, body.input)
      },
      {
        params: PensaJourneyParams,
        body: t.Object({ actor: signedActor, input: PensaGenerationStartDto }),
      },
    )
    .post(
      '/projects/:projectId/operations/:operationId/claim',
      async ({ params, body }) => {
        const who = body.actor
        await canGenerate(who)
        return {
          work: await deps.service.claim(who, params.projectId, params.operationId, body.leaseId),
        }
      },
      { params: PensaOperationParams, body: t.Object({ actor: signedActor, leaseId: uuid }) },
    )
    .post(
      '/projects/:projectId/operations/:operationId/publish',
      async ({ params, body }) => {
        const who = body.actor
        await canGenerate(who)
        await deps.service.publish(
          who,
          params.projectId,
          params.operationId,
          body.leaseId,
          body.result,
        )
        return { ok: true }
      },
      {
        params: PensaOperationParams,
        body: t.Object({ actor: signedActor, leaseId: uuid, result: PensaStepResultDto }),
      },
    )
    .post(
      '/projects/:projectId/operations/:operationId/fail',
      async ({ params, body }) => {
        await deps.service.fail(
          body.actor,
          params.projectId,
          params.operationId,
          body.leaseId,
          body.message,
        )
        return { ok: true }
      },
      {
        params: PensaOperationParams,
        body: t.Object({
          actor: signedActor,
          leaseId: uuid,
          message: t.String({ maxLength: 500 }),
        }),
      },
    )
  return new Elysia().use(publicRoutes).use(internalRoutes)
}
