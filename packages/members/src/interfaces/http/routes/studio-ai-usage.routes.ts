import { Elysia, t } from 'elysia'
import type { AccessCheckService } from '../../../application/access-check/access-check.service'
import { assertAdultCreativeAccess } from '../../../application/adult-journey/adult-creative-access'
import type { AdultJourneyService } from '../../../application/adult-journey/adult-journey.service'
import type { StudioAiUsageService } from '../../../application/ai-usage/studio-ai-usage.service'
import { StudioAiUnavailableError } from '../../../domain/ai-usage/studio-ai.errors'
import { AccessDeniedError } from '../../../domain/entitlement/entitlement.errors'
import { assertInternalCaller, assertMemberShellConsumer } from '../auth'

const Id = t.String({ format: 'uuid' })
const Attempt = t.Integer({ minimum: 1, maximum: 6 })
const Tokens = t.Optional(t.Integer({ minimum: 0, maximum: 10_000_000 }))
export function studioAiUsageRoutes(deps: {
  service?: StudioAiUsageService
  internalToken?: string
  accessCheck: AccessCheckService
  adultJourney?: AdultJourneyService
}) {
  return new Elysia({ prefix: '/members/internal/studio-ai' })
    .onTransform(({ headers }) => {
      assertInternalCaller(headers['x-internal-token'], deps.internalToken)
      assertMemberShellConsumer(headers['x-consumer-id'])
    })
    .post(
      '/usage',
      async ({ body, set }) => {
        set.headers['Cache-Control'] = 'no-store'
        if (!deps.service) throw new StudioAiUnavailableError()
        const { actor, action } = body
        if (
          actor.audience === 'adult' &&
          (action.operation === 'reserve' || action.operation === 'dispatch')
        )
          await assertAdultCreativeAccess(
            deps,
            actor,
            'studio',
            true,
            action.operation === 'reserve' && action.request.purpose === 'builder',
          )
        // Settlement/release must remain available after entitlement expiry; no new calls can start.
        if (
          (action.operation === 'reserve' || action.operation === 'dispatch') &&
          !actor.privileged &&
          actor.audience !== 'adult'
        ) {
          const access = await deps.accessCheck.execute(actor.accountId, ['estudio-completo'])
          if (
            !access.grants.includes('estudio-completo') &&
            !access.communities.includes('estudio-completo')
          )
            throw new AccessDeniedError('Você não tem acesso ao Estúdio Completo')
        }
        const context = actor.audience === 'adult' ? { audience: 'adult' as const } : {}
        switch (action.operation) {
          case 'reserve':
            return { ...context, reservation: await deps.service.reserve(actor, action.request) }
          case 'dispatch':
            return {
              ...context,
              dispatch: await deps.service.dispatch(actor, action.runId, action.attempt),
            }
          case 'settle':
            await deps.service.settle(actor, action.runId, action.settlement)
            return { ok: true }
          case 'finish':
            await deps.service.finish(actor, action.runId)
            return { ok: true }
          case 'costs':
            return { ...context, costs: await deps.service.costs(actor.accountId) }
        }
      },
      {
        body: t.Object({
          actor: t.Object({
            accountId: Id,
            userId: Id,
            privileged: t.Boolean(),
            audience: t.Optional(t.Union([t.Literal('adult'), t.Literal('kids')])),
          }),
          action: t.Union([
            t.Object({
              operation: t.Literal('reserve'),
              request: t.Object({
                runId: Id,
                projectId: t.String({ pattern: '^[A-Za-z0-9_-]{1,128}$' }),
                purpose: t.Union([t.Literal('tutor'), t.Literal('builder')]),
                model: t.String({ pattern: '^[a-zA-Z0-9_.:/-]{1,160}$' }),
                inputBytes: t.Integer({ minimum: 1, maximum: 256_000 }),
                maxOutputTokens: t.Integer({ minimum: 1, maximum: 8_000 }),
                maxAttempts: Attempt,
              }),
            }),
            t.Object({ operation: t.Literal('dispatch'), runId: Id, attempt: Attempt }),
            t.Object({
              operation: t.Literal('settle'),
              runId: Id,
              settlement: t.Object({
                attempt: Attempt,
                status: t.Union([
                  t.Literal('confirmed'),
                  t.Literal('uncertain'),
                  t.Literal('rejected'),
                ]),
                actualMicroUsd: t.Optional(t.Integer({ minimum: 0, maximum: 1_000_000_000 })),
                generationId: t.Optional(
                  t.String({ pattern: '^gen-[0-9A-Za-z-]{1,124}$', maxLength: 128 }),
                ),
                promptTokens: Tokens,
                completionTokens: Tokens,
              }),
            }),
            t.Object({ operation: t.Literal('finish'), runId: Id }),
            t.Object({ operation: t.Literal('costs') }),
          ]),
        }),
      },
    )
    .post(
      '/reconcile',
      async ({ body, set }) => {
        set.headers['Cache-Control'] = 'no-store'
        if (!deps.service) throw new StudioAiUnavailableError()
        if (body.operation === 'claim') return { jobs: await deps.service.claimReconciliation() }
        await deps.service.releaseReconciliation(body.runId, body.attempt, body.claimId)
        return { ok: true }
      },
      {
        body: t.Union([
          t.Object({ operation: t.Literal('claim') }),
          t.Object({ operation: t.Literal('release'), runId: Id, attempt: Attempt, claimId: Id }),
        ]),
      },
    )
}
