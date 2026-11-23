import 'server-only'
import {
  PintaCausalArchiveItemSchema,
  PintaCausalArchivePageSchema,
  PintaCausalAttestationSchema,
  PintaCausalBackfillAttestationSchema,
  PintaCausalReservePageSchema,
  PintaCausalSnapshotPageSchema,
  pintaCausalBlobKey,
} from '@sistemazero/core/creations/pinta-causal'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { CREATION_BLOB_CONTENT_TYPE, CREATION_GET_TTL_SECONDS } from '../server/creation-download'
import type { GatewayModule } from '../server/gateway'
import { authorizePintaActor } from '../server/pinta-actor-authorization'
import { PintaCausalUnverifiedContent } from '../server/pinta-causal-content'
import {
  pintaCausalCandidateReady,
  pintaCausalProfileAllowed,
} from '../server/pinta-causal-eligibility'
import {
  attestPintaBackfill,
  attestPintaMember,
  isPintaPointer,
  type PintaCausalStorage,
} from '../server/pinta-causal-proof'
import {
  belongsToPintaActor,
  causalEpoch,
  causalItem,
  causalReader,
  causalRevision,
  PinnedPintaEntry,
  PintaBackfillPlan,
  type PintaCausalActor,
  PintaCausalStatusReply,
  PintaMemberPlan,
} from '../server/pinta-causal-protocol'
import {
  bufferFromStream,
  r2CreateObjectUgc,
  r2GetObjectUgc,
  r2PresignGetUgc,
  r2PresignPutUgc,
} from '../server/r2'
import type { SessionModule } from '../server/session'

const JSON_LIMIT = 2 * 1024 * 1024
const UPLOAD_TTL_SECONDS = 600
const base = '/members/internal/creations/pinta/'

const GraphQuery = z
  .strictObject({
    reader: z.coerce.number().pipe(causalReader),
    epoch: causalEpoch.optional(),
    cursor: causalItem.optional(),
    verifyEpoch: causalEpoch.optional(),
  })
  .refine(
    ({ verifyEpoch, epoch, cursor }) =>
      (!verifyEpoch || (!epoch && !cursor)) && (!cursor || !!epoch),
  )

const EntryQuery = z.strictObject({
  reader: z.coerce.number().pipe(causalReader),
  epoch: causalEpoch,
  revision: z.coerce.number().pipe(causalRevision),
})
const ReserveBody = PintaCausalReservePageSchema.refine(
  ({ reader }) => causalReader.safeParse(reader).success,
)
const ArchiveQuery = z
  .strictObject({
    epoch: causalEpoch.optional(),
    cursor: causalItem.optional(),
  })
  .refine(({ epoch, cursor }) => !cursor || !!epoch)
const ArchiveItemQuery = EntryQuery.omit({ reader: true })

const StatusQuery = z.strictObject({ cursor: causalItem.optional() })
const VerifyBody = z.strictObject({ itemId: causalItem })
const BackfillBody = z.strictObject({
  reader: causalReader,
  epoch: causalEpoch,
  revision: causalRevision,
  itemId: causalItem,
})
const UpstreamErrorBody = z.object({
  reason: z.string().regex(/^[a-z-]{1,48}$/),
  itemId: causalItem.optional(),
})
const ActorItem = z.strictObject({ itemId: causalItem })
const ActorUnit = z.strictObject({ opId: z.uuid() })

type ItemContext = { params: Promise<{ itemId: string }> }
type UnitContext = { params: Promise<{ opId: string }> }

function reply(value: unknown, status = 200) {
  return NextResponse.json(value, { status, headers: { 'cache-control': 'private, no-store' } })
}

function error(status: number, reason: string, itemId?: string) {
  return reply({ reason, ...(itemId ? { itemId } : {}) }, status)
}

/** A Members refusal without a causal reason keeps its meaning, never its internal message. */
function upstreamReason(status: number): string {
  if (status === 404) return 'not-found'
  if (status === 403) return 'forbidden'
  return 'unavailable'
}

class UpstreamFailure extends Error {
  constructor(readonly response: NextResponse) {
    super('O serviço de criações não aceitou o pedido.')
  }
}

function wrongReply(): never {
  throw new UpstreamFailure(error(502, 'unavailable'))
}

const invalid = () => error(400, 'invalid-request')

function query<T>(req: Request, schema: z.ZodType<T>): T | null {
  const params = new URL(req.url).searchParams
  const input = Object.fromEntries(params)
  if (Object.keys(input).length !== params.size) return null
  const result = schema.safeParse(input)
  return result.success ? result.data : null
}

async function body<T>(req: Request, schema: z.ZodType<T>): Promise<T | null> {
  if (!req.body) return null
  try {
    const bytes = await bufferFromStream(req.body, JSON_LIMIT)
    const input: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes))
    const result = schema.safeParse(input)
    return result.success ? result.data : null
  } catch {
    return null
  }
}

type Storage = PintaCausalStorage & {
  presignPut: typeof r2PresignPutUgc
  presignGet: typeof r2PresignGetUgc
}

const liveStorage: Storage = {
  open: r2GetObjectUgc,
  create: r2CreateObjectUgc,
  presignPut: r2PresignPutUgc,
  presignGet: r2PresignGetUgc,
}

export function createPintaCausalRoutes({
  gateway,
  session,
  storage = liveStorage,
  enabled = pintaCausalCandidateReady,
  profileAllowed = pintaCausalProfileAllowed,
}: {
  gateway: Pick<GatewayModule, 'gatewayFetchHmac' | 'refreshSession'>
  session: Pick<
    SessionModule,
    'getAccessToken' | 'getRefreshToken' | 'verifyAccessToken' | 'audience'
  >
  storage?: Storage
  enabled?: () => boolean
  profileAllowed?: (actor: PintaCausalActor) => boolean
}) {
  async function authorized(
    req: Request,
    write: boolean,
    operation: (actor: PintaCausalActor, readOnly: boolean) => Promise<NextResponse>,
  ): Promise<NextResponse> {
    if (!enabled()) return error(404, 'not-found')
    try {
      const auth = await authorizePintaActor(req, write, { gateway, session, profileAllowed })
      if ('status' in auth) return error(auth.status, auth.reason)
      return await operation(auth.actor, auth.readOnly)
    } catch (failure) {
      if (failure instanceof UpstreamFailure) return failure.response
      if (failure instanceof PintaCausalUnverifiedContent) return error(409, 'unverified-content')
      return error(503, 'unavailable')
    }
  }

  async function internal(
    actor: PintaCausalActor,
    path: string,
    payload: unknown,
  ): Promise<unknown> {
    const response = await gateway.gatewayFetchHmac(base + path, {
      method: 'POST',
      body: { ...actor, payload },
    })
    if (response.status < 200 || response.status >= 300) {
      const body = UpstreamErrorBody.safeParse(response.body)
      throw new UpstreamFailure(
        body.success
          ? error(response.status, body.data.reason, body.data.itemId)
          : error(response.status, upstreamReason(response.status)),
      )
    }
    return response.body
  }

  function checked<T>(type: z.ZodType<T>, value: unknown): T {
    const result = type.safeParse(value)
    return result.success ? result.data : wrongReply()
  }

  async function statusReply(actor: PintaCausalActor, opId: string, received: unknown) {
    const { status, uploadBytes } = checked(PintaCausalStatusReply, received)
    if ((status.state === 'committed' ? status.result.opId : status.opId) !== opId)
      return wrongReply()
    if (status.state !== 'reserved') return reply(status)
    if (new Set(status.tickets.map(({ itemId }) => itemId)).size !== status.tickets.length)
      return wrongReply()
    const now = Date.now()
    for (const binding of status.tickets) {
      if (
        !belongsToPintaActor(binding.namespace, actor) ||
        binding.opId !== opId ||
        binding.intentHash !== status.intentHash ||
        (binding.candidateSha256 !== null) !== Object.hasOwn(uploadBytes, binding.itemId)
      )
        return wrongReply()
      if (Date.parse(binding.expiresAt) - now < 1_000) return error(409, 'operation-expired')
    }
    const tickets = await Promise.all(
      status.tickets.map(async (binding) => {
        const { itemId, revision } = binding
        if (binding.candidateSha256 === null) return { itemId, revision }
        const bytes = uploadBytes[itemId]!
        const expiresInSeconds = Math.min(
          UPLOAD_TTL_SECONDS,
          Math.floor((Date.parse(binding.expiresAt) - now) / 1000),
        )
        const uploadUrl = await storage.presignPut({
          key: pintaCausalBlobKey(binding, 'upload'),
          contentType: CREATION_BLOB_CONTENT_TYPE,
          contentLength: bytes,
          expiresInSeconds,
          signingDate: new Date(now),
          criarUmaVez: true,
        })
        return {
          itemId,
          revision,
          bytes,
          uploadUrl,
          method: 'PUT',
          headers: { 'content-type': CREATION_BLOB_CONTENT_TYPE, 'if-none-match': '*' },
        }
      }),
    )
    return reply({ ...status, tickets })
  }

  return {
    pintaCausalGraph: {
      GET: (req: Request) =>
        authorized(req, false, async (actor) => {
          const params = query(req, GraphQuery)
          if (!params) return invalid()
          const { reader, epoch, cursor, verifyEpoch } = params
          const observedEpoch = epoch ?? verifyEpoch
          const page = checked(
            PintaCausalSnapshotPageSchema,
            await internal(actor, 'graph/page', {
              reader,
              ...(observedEpoch !== undefined ? { epoch: observedEpoch } : {}),
              ...(cursor !== undefined ? { cursor } : {}),
            }),
          )
          if (observedEpoch !== undefined && page.epoch !== observedEpoch) return wrongReply()
          if (page.requiredFormat > reader) return error(409, 'client-outdated')
          return reply(page)
        }),
    },
    pintaCausalGraphItem: {
      GET: (req: Request, ctx: ItemContext) =>
        authorized(req, false, async (actor) => {
          const params = query(req, EntryQuery)
          const item = ActorItem.safeParse(await ctx.params)
          if (!params || !item.success) return invalid()
          const { entry, storageRef } = checked(
            PinnedPintaEntry,
            await internal(actor, 'graph/item', {
              ...params,
              itemId: item.data.itemId,
            }),
          )
          if (entry.itemId !== item.data.itemId || entry.revision !== params.revision)
            return wrongReply()
          if (entry.coverage !== 'certified' || !entry.sha256)
            return error(409, 'unverified-content', entry.itemId)
          if (!isPintaPointer(storageRef, actor, entry, false)) return wrongReply()
          const downloadUrl = await storage.presignGet(storageRef, {
            expiresInSeconds: CREATION_GET_TTL_SECONDS,
            responseContentType: CREATION_BLOB_CONTENT_TYPE,
          })
          return reply({ entry, downloadUrl })
        }),
    },
    pintaCausalArchive: {
      GET: (req: Request) =>
        authorized(req, false, async (actor) => {
          const scope = query(req, ArchiveQuery)
          if (!scope) return invalid()
          const page = checked(
            PintaCausalArchivePageSchema,
            await internal(actor, 'graph/page', { ...scope, mode: 'archive' }),
          )
          if (scope.epoch !== undefined && page.archive.epoch !== scope.epoch) return wrongReply()
          return reply(page)
        }),
    },
    pintaCausalArchiveItem: {
      GET: (req: Request, ctx: ItemContext) =>
        authorized(req, false, async (actor) => {
          const scope = query(req, ArchiveItemQuery)
          const item = ActorItem.safeParse(await ctx.params)
          if (!scope || !item.success) return invalid()
          const { itemId } = item.data
          const {
            archive: { entry, storageRef },
          } = checked(
            PintaCausalArchiveItemSchema,
            await internal(actor, 'graph/item', { ...scope, itemId, mode: 'archive' }),
          )
          if (
            entry.itemId !== itemId ||
            entry.revision !== scope.revision ||
            !isPintaPointer(storageRef, actor, entry, true)
          )
            return wrongReply()
          const download = await storage.presignGet(storageRef, {
            expiresInSeconds: CREATION_GET_TTL_SECONDS,
            responseContentType: CREATION_BLOB_CONTENT_TYPE,
            responseContentDisposition: `attachment; filename="${itemId}-r${entry.revision}.pinta.json.gz"`,
          })
          return NextResponse.redirect(download, {
            status: 303,
            headers: { 'cache-control': 'private, no-store' },
          })
        }),
    },
    pintaCausalReserve: {
      POST: (req: Request) =>
        authorized(req, true, async (actor) => {
          const params = await body(req, ReserveBody)
          if (!params) return invalid()
          return statusReply(actor, params.opId, await internal(actor, 'units/reserve', params))
        }),
    },
    pintaCausalStatus: {
      GET: (req: Request, ctx: UnitContext) =>
        authorized(req, false, async (actor, readOnly) => {
          const params = query(req, StatusQuery)
          const unit = ActorUnit.safeParse(await ctx.params)
          if (!params || !unit.success) return invalid()
          const { opId } = unit.data
          const reply = await internal(actor, 'units/status', { opId, ...params })
          if (readOnly) {
            const { status } = checked(PintaCausalStatusReply, reply)
            if (status.state === 'reserved') return error(403, 'impersonation-readonly')
          }
          return statusReply(actor, opId, reply)
        }),
    },
    pintaCausalVerify: {
      POST: (req: Request, ctx: UnitContext) =>
        authorized(req, true, async (actor) => {
          const params = await body(req, VerifyBody)
          const unit = ActorUnit.safeParse(await ctx.params)
          if (!params || !unit.success) return invalid()
          const { opId } = unit.data
          const load = async (itemId: string) => {
            const plan = checked(
              PintaMemberPlan,
              await internal(actor, 'units/member', { opId, itemId }),
            )
            if (plan.binding.opId !== opId || plan.binding.itemId !== itemId) return wrongReply()
            return plan
          }
          const receipt = await attestPintaMember(
            storage,
            actor,
            await load(params.itemId),
            load,
            req.signal,
          )
          await internal(actor, 'units/attest', checked(PintaCausalAttestationSchema, receipt))
          return reply({ verified: true })
        }),
    },
    pintaCausalCommit: {
      POST: (req: Request, ctx: UnitContext) =>
        authorized(req, true, async (actor) => {
          const unit = ActorUnit.safeParse(await ctx.params)
          if (!unit.success || req.body) return invalid()
          return statusReply(
            actor,
            unit.data.opId,
            await internal(actor, 'units/commit', unit.data),
          )
        }),
    },
    pintaCausalAbort: {
      POST: (req: Request, ctx: UnitContext) =>
        authorized(req, true, async (actor) => {
          const unit = ActorUnit.safeParse(await ctx.params)
          if (!unit.success || req.body) return invalid()
          return statusReply(actor, unit.data.opId, await internal(actor, 'units/abort', unit.data))
        }),
    },
    pintaCausalBackfill: {
      POST: (req: Request) =>
        authorized(req, true, async (actor) => {
          const params = await body(req, BackfillBody)
          if (!params) return invalid()
          const plan = checked(PintaBackfillPlan, await internal(actor, 'backfill/ticket', params))
          if (
            plan.binding.itemId !== params.itemId ||
            plan.binding.revision !== params.revision ||
            plan.binding.baseEpoch !== params.epoch
          )
            return wrongReply()
          const receipt = await attestPintaBackfill(storage, actor, plan, req.signal)
          await internal(
            actor,
            'backfill/attest',
            checked(PintaCausalBackfillAttestationSchema, receipt),
          )
          return reply({ verified: true })
        }),
    },
  }
}
