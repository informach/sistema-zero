import {
  PintaCausalAttestationSchema,
  PintaCausalBackfillAttestationSchema,
  PintaCausalReservePageSchema,
  type PintaCausalViewer,
  PintaCausalViewerSchema,
  pintaCausalQaAllows,
} from '@sistemazero/core/creations/pinta-causal'
import { Elysia } from 'elysia'
import { z } from 'zod'
import type { ReserveCreationUploadService } from '../../../application/creations/creations.service'
import type { DrizzlePintaCausalRepository } from '../../../infrastructure/persistence/drizzle/pinta-causal-units.repository'
import { assertInternalCaller, assertMemberShellConsumer } from '../auth'

const actor = PintaCausalViewerSchema.extend({
  privileged: z.boolean().optional(),
  payload: z.unknown(),
})
type Actor = Pick<z.infer<typeof actor>, 'userId' | 'accountId' | 'audience'>
const id = z.string().regex(/^[a-zA-Z0-9_-]{1,64}$/)
const epoch = z.string().regex(/^(0|[1-9][0-9]{0,18})$/)
const reader = z.number().int().positive().max(65535)
const pinned = z.strictObject({
  itemId: id,
  epoch,
  reader,
  revision: z.number().int().positive().max(2147483647),
})
const operation = z.strictObject({ opId: z.uuid() })

interface CausalRouteDeps {
  causalQaProfiles?: readonly PintaCausalViewer[]
  causal?: DrizzlePintaCausalRepository
  internalToken?: string
  reserveUpload: Pick<ReserveCreationUploadService, 'assertPersonalWrite'>
  adult?: { reserveUpload: Pick<ReserveCreationUploadService, 'assertPersonalWrite'> }
}
export function pintaCausalRoutes(deps: CausalRouteDeps) {
  function handle<S extends z.ZodType>(
    schema: S,
    run: (
      db: DrizzlePintaCausalRepository,
      a: Actor,
      p: z.output<S>,
      privileged: boolean,
    ) => Promise<unknown>,
  ) {
    return async ({
      body,
      headers,
    }: {
      body: unknown
      headers: Record<string, string | undefined>
    }) => {
      if (!deps.causal || !deps.internalToken) return new Response(null, { status: 404 })
      assertInternalCaller(headers['x-internal-token'], deps.internalToken)
      assertMemberShellConsumer(headers['x-consumer-id'])
      const a = actor.safeParse(body)
      if (!a.success || (a.data.audience === 'adult' && a.data.userId !== a.data.accountId))
        return Response.json({ reason: 'invalid-actor' }, { status: 422 })
      if (!pintaCausalQaAllows(deps.causalQaProfiles ?? [], a.data))
        return Response.json({ reason: 'not-found' }, { status: 404 })
      const p = schema.safeParse(a.data.payload)
      if (!p.success) return Response.json({ reason: 'invalid-payload' }, { status: 422 })
      // Strip payload/privileged before passing the storage actor into inserts.
      return run(
        deps.causal,
        { userId: a.data.userId, accountId: a.data.accountId, audience: a.data.audience },
        p.data,
        a.data.privileged ?? false,
      )
    }
  }
  return new Elysia({ prefix: '/members/internal/creations/pinta' })
    .post(
      '/graph/page',
      handle(
        z.union([
          z.strictObject({ epoch: epoch.optional(), cursor: id.optional(), reader }),
          z.strictObject({
            // `gallery`: o seletor da galeria da aula (o mesmo inventário, com a miniatura).
            mode: z.enum(['archive', 'gallery']),
            epoch: epoch.optional(),
            cursor: id.optional(),
          }),
        ]),
        (db, a, p) =>
          !('mode' in p)
            ? db.page(a, p)
            : p.mode === 'gallery'
              ? db.galleryPage(a, p)
              : db.archivePage(a, p),
      ),
    )
    .post(
      '/graph/item',
      handle(
        z.union([pinned, pinned.omit({ reader: true }).extend({ mode: z.literal('archive') })]),
        (db, a, p) => ('mode' in p ? db.archiveItem(a, p) : db.item(a, p)),
      ),
    )
    .post(
      '/units/reserve',
      handle(PintaCausalReservePageSchema, async (db, a, p, privileged) => {
        if (p.members.some((m) => m.action === 'put')) {
          const service = a.audience === 'adult' ? deps.adult : deps
          if (!service) return new Response(null, { status: 403 })
          await service.reserveUpload.assertPersonalWrite(
            'pinta',
            a.userId,
            a.accountId,
            privileged,
          )
        }
        return db.reserve(a, p)
      }),
    )
    .post(
      '/units/status',
      handle(operation.extend({ cursor: id.optional() }), (db, a, p) => db.status(a, p)),
    )
    .post(
      '/units/member',
      handle(operation.extend({ itemId: id }), (db, a, p) => db.member(a, p)),
    )
    .post(
      '/units/attest',
      handle(PintaCausalAttestationSchema, (db, a, p) => db.attest(a, p)),
    )
    .post(
      '/units/commit',
      handle(operation, (db, a, p) => db.commit(a, p)),
    )
    .post(
      '/units/abort',
      handle(operation, (db, a, p) => db.abort(a, p)),
    )
    .post(
      '/backfill/ticket',
      handle(pinned, (db, a, p) => db.backfillTicket(a, p)),
    )
    .post(
      '/backfill/attest',
      handle(PintaCausalBackfillAttestationSchema, (db, a, p) => db.backfillAttest(a, p)),
    )
}
