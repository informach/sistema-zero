import { PintaCausalViewerSchema } from '@sistemazero/core/creations/pinta-causal'
import {
  StudioSealedBaseCommandSchema,
  StudioSealedCommitProofSchema,
  StudioSealedReserveSchema,
  StudioSealedTicketRequestSchema,
} from '@sistemazero/core/creations/studio-sealed-writer'
import { STUDIO_PROJECT_SUPPORTED_FORMAT_VERSION } from '@sistemazero/core/studio/project-format'
import { Elysia } from 'elysia'
import { z } from 'zod'
import { StudioSealedWriteError } from '../../../domain/creations/studio-sealed-write'
import { AccessDeniedError } from '../../../domain/entitlement/entitlement.errors'
import { assertInternalCaller, assertMemberShellConsumer } from '../auth'
import type { CreationsRoutesDeps } from './creations.routes'

const actorEnvelope = PintaCausalViewerSchema.extend({
  privileged: z.boolean().optional(),
  payload: z.unknown(),
})
const head = StudioSealedBaseCommandSchema.pick({ itemId: true, protocol: true })

export function studioSealedWriteRoutes(deps: CreationsRoutesDeps) {
  function handle<S extends z.ZodType>(
    schema: S,
    run: (context: {
      actor: z.output<typeof PintaCausalViewerSchema>
      repository: NonNullable<CreationsRoutesDeps['studioSeal']>['repository']['kids']
      services: Pick<CreationsRoutesDeps, 'reserveUpload' | 'commitUpload' | 'remove'>
      payload: z.output<S>
      privileged: boolean
      now: () => Date
      authorize: (kind: 'classic' | 'pro', language: 'javascript' | 'python') => Promise<void>
    }) => Promise<unknown>,
  ) {
    return async ({
      body,
      headers,
    }: {
      body: unknown
      headers: Record<string, string | undefined>
    }) => {
      const config = deps.studioSeal
      if (!config || !deps.internalToken) return new Response(null, { status: 404 })
      assertInternalCaller(headers['x-internal-token'], deps.internalToken)
      assertMemberShellConsumer(headers['x-consumer-id'])
      const parsed = actorEnvelope.safeParse(body)
      if (
        !parsed.success ||
        (parsed.data.audience === 'adult' && parsed.data.userId !== parsed.data.accountId)
      ) {
        return Response.json({ reason: 'invalid-actor' }, { status: 422 })
      }
      const { userId, accountId, audience, privileged = false, payload } = parsed.data
      const actor = { userId, accountId, audience }
      const input = schema.safeParse(payload)
      if (!input.success) return Response.json({ reason: 'invalid-payload' }, { status: 422 })
      const services = audience === 'adult' ? deps.adult : deps
      if (!services) return new Response(null, { status: 403 })
      return run({
        actor,
        services,
        payload: input.data,
        privileged,
        repository: config.repository[audience],
        now: config.clock,
        authorize: async (kind, language) => {
          const access = await config.authoring.execute(
            { ...actor, privileged, readOnly: false },
            kind === 'pro' ? 'existing-pro' : 'creation',
            language,
          )
          if (kind === 'pro' && !access.pro)
            throw new AccessDeniedError('Seu nível ainda não libera projetos Pro.')
        },
      })
    }
  }

  return new Elysia({ prefix: '/members/internal/creations/studio/seal' })
    .post(
      '/head',
      handle(head, ({ actor, payload, repository }) =>
        repository.getStudioSealHead({ ...actor, itemId: payload.itemId }),
      ),
    )
    .post(
      '/reserve',
      handle(
        StudioSealedReserveSchema,
        async ({ actor, payload, privileged, services, authorize }) => {
          await authorize(payload.kind, payload.requirements.programmingLanguage ?? 'javascript')
          const { baseGeneration, protocol, requirements, itemUpdatedAt, ...reservation } = payload
          const result = await services.reserveUpload.execute({
            ...reservation,
            ...actor,
            tool: 'studio',
            privileged,
            itemUpdatedAt: new Date(itemUpdatedAt),
            formatVersion: requirements.projectFormat,
            studioSeal: { baseGeneration, protocol, requirements },
          })
          if (!result.studioSealTicket) throw new StudioSealedWriteError('ticket-invalid')
          return { ticket: result.studioSealTicket }
        },
      ),
    )
    .post(
      '/ticket',
      handle(StudioSealedTicketRequestSchema, ({ actor, payload, repository, now }) =>
        repository.getStudioSealTicket(
          { ...actor, itemId: payload.itemId },
          payload.nonce,
          payload.revision,
          now(),
        ),
      ),
    )
    .post(
      '/commit',
      handle(StudioSealedCommitProofSchema, async ({ actor, payload, services, authorize }) => {
        const { scope, kind, revision } = payload.ticket
        if (
          scope.userId !== actor.userId ||
          scope.accountId !== actor.accountId ||
          scope.audience !== actor.audience
        )
          throw new StudioSealedWriteError('ticket-invalid')
        await authorize(kind, payload.ticket.requirements.programmingLanguage ?? 'javascript')
        const result = await services.commitUpload.execute({
          userId: actor.userId,
          tool: 'studio',
          itemId: scope.itemId,
          revision,
          studioProof: payload,
        })
        if (!result.studioSeal) throw new StudioSealedWriteError('ticket-invalid')
        return result.studioSeal
      }),
    )
    .post(
      '/delete',
      handle(StudioSealedBaseCommandSchema, async ({ actor, payload, services }) => {
        const result = await services.remove.execute(
          actor.userId,
          'studio',
          payload.itemId,
          payload.baseRevision,
          STUDIO_PROJECT_SUPPORTED_FORMAT_VERSION,
          undefined,
          {
            protocol: payload.protocol,
            baseGeneration: payload.baseGeneration,
            accountId: actor.accountId,
          },
        )
        if (!result.studioHead) throw new StudioSealedWriteError('ticket-invalid')
        return { deleted: result.deleted, revision: result.revision, studioHead: result.studioHead }
      }),
    )
}
