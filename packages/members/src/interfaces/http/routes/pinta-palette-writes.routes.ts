import {
  PINTA_PALETTE_LIBRARY_ITEM_ID,
  PINTA_PALETTE_LIBRARY_KIND,
} from '@sistemazero/core/creations'
import { PintaCausalViewerSchema } from '@sistemazero/core/creations/pinta-causal'
import {
  PintaPaletteBaseCommandSchema,
  PintaPaletteCommitProofSchema,
  PintaPaletteReserveCommandSchema,
  PintaPaletteTicketRequestSchema,
} from '@sistemazero/core/creations/pinta-palette-writer'
import { Elysia } from 'elysia'
import { z } from 'zod'
import { PintaPaletteWriteError } from '../../../domain/creations/pinta-palette-write'
import { assertInternalCaller, assertMemberShellConsumer } from '../auth'
import type { CreationsRoutesDeps } from './creations.routes'

const envelope = PintaCausalViewerSchema.extend({
  privileged: z.boolean().optional(),
  payload: z.unknown(),
})

export function pintaPaletteWriteRoutes(deps: CreationsRoutesDeps) {
  function handle<S extends z.ZodType>(
    schema: S,
    run: (context: {
      actor: z.output<typeof PintaCausalViewerSchema>
      repository: NonNullable<CreationsRoutesDeps['palette']>['repository']['kids']
      services: Pick<CreationsRoutesDeps, 'reserveUpload' | 'commitUpload' | 'remove'>
      now: () => Date
      payload: z.output<S>
      privileged: boolean
    }) => Promise<unknown>,
  ) {
    return async ({
      body,
      headers,
    }: {
      body: unknown
      headers: Record<string, string | undefined>
    }) => {
      const palette = deps.palette
      if (!palette || !deps.internalToken) return new Response(null, { status: 404 })
      assertInternalCaller(headers['x-internal-token'], deps.internalToken)
      assertMemberShellConsumer(headers['x-consumer-id'])
      const parsed = envelope.safeParse(body)
      if (
        !parsed.success ||
        (parsed.data.audience === 'adult' && parsed.data.userId !== parsed.data.accountId)
      )
        return Response.json({ reason: 'invalid-actor' }, { status: 422 })
      const { userId, accountId, audience, privileged, payload } = parsed.data
      const actor = { userId, accountId, audience }
      const input = schema.safeParse(payload)
      if (!input.success) return Response.json({ reason: 'invalid-payload' }, { status: 422 })
      const services = audience === 'adult' ? deps.adult : deps
      if (!services) return new Response(null, { status: 403 })
      return run({
        actor,
        repository: palette.repository[audience],
        services,
        now: palette.clock,
        payload: input.data,
        privileged: privileged ?? false,
      })
    }
  }

  return new Elysia({ prefix: '/members/internal/creations/pinta/palette' })
    .post(
      '/head',
      handle(z.strictObject({}), ({ actor, repository }) => repository.getPaletteHead(actor)),
    )
    .post(
      '/reserve',
      handle(PintaPaletteReserveCommandSchema, async ({ actor, services, payload, privileged }) => {
        const result = await services.reserveUpload.execute({
          ...actor,
          privileged,
          tool: 'pinta',
          itemId: PINTA_PALETTE_LIBRARY_ITEM_ID,
          name: 'Paletas do Pinta',
          kind: PINTA_PALETTE_LIBRARY_KIND,
          bytes: payload.bytes,
          itemUpdatedAt: new Date(payload.itemUpdatedAt),
          baseRevision: payload.baseRevision,
          paletteWrite: { protocol: payload.protocol, baseGeneration: payload.baseGeneration },
        })
        if (!result.paletteTicket) throw new PintaPaletteWriteError('ticket-invalid')
        return { ticket: result.paletteTicket }
      }),
    )
    .post(
      '/ticket',
      handle(PintaPaletteTicketRequestSchema, ({ actor, repository, payload, now }) =>
        repository.getPaletteTicket(actor, payload.nonce, payload.revision, now()),
      ),
    )
    .post(
      '/commit',
      handle(PintaPaletteCommitProofSchema, async ({ actor, services, payload }) => {
        const result = await services.commitUpload.execute({
          userId: actor.userId,
          tool: 'pinta',
          itemId: PINTA_PALETTE_LIBRARY_ITEM_ID,
          revision: payload.ticket.revision,
          paletteProof: { ...payload, accountId: actor.accountId },
        })
        if (!result.paletteHead) throw new PintaPaletteWriteError('ticket-invalid')
        return { item: result.item, paletteHead: result.paletteHead }
      }),
    )
    .post(
      '/delete',
      handle(PintaPaletteBaseCommandSchema, async ({ actor, services, payload }) => {
        const result = await services.remove.execute(
          actor.userId,
          'pinta',
          PINTA_PALETTE_LIBRARY_ITEM_ID,
          payload.baseRevision,
          1,
          {
            protocol: payload.protocol,
            baseGeneration: payload.baseGeneration,
            accountId: actor.accountId,
          },
        )
        if (!result.paletteHead) throw new PintaPaletteWriteError('ticket-invalid')
        return {
          deleted: result.deleted,
          revision: result.revision,
          paletteHead: result.paletteHead,
        }
      }),
    )
}
