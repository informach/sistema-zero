import 'server-only'
import {
  PintaCausalAttestationSchema,
  PintaCausalBackfillAttestationSchema,
  PintaCausalReservePageSchema,
  PintaCausalSnapshotPageSchema,
  pintaCausalBlobKey,
} from '@sistemazero/core/creations/pinta-causal'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { isReadonlyImpersonation } from '../lib/act'
import { getEnv } from '../lib/env'
import { CREATION_BLOB_CONTENT_TYPE, CREATION_GET_TTL_SECONDS } from '../server/creation-download'
import type { GatewayModule } from '../server/gateway'
import { PintaCausalUnverifiedContent } from '../server/pinta-causal-content'
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
  PintaCausalActorSchema,
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

function candidateReady(): boolean {
  const env = getEnv()
  return (
    env.PINTA_CAUSAL_CANDIDATE === '1' &&
    Boolean(
      env.MEMBER_SHELL_HMAC_SECRET &&
        env.R2_ACCOUNT_ID &&
        env.R2_ACCESS_KEY_ID &&
        env.R2_SECRET_ACCESS_KEY &&
        env.R2_UGC_BUCKET,
    )
  )
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
  enabled = candidateReady,
}: {
  gateway: Pick<GatewayModule, 'gatewayFetchHmac'>
  session: Pick<SessionModule, 'getSession' | 'audience'>
  storage?: Storage
  enabled?: () => boolean
}) {
  async function authorized(
    req: Request,
    write: boolean,
    operation: (actor: PintaCausalActor, readOnly: boolean) => Promise<NextResponse>,
  ): Promise<NextResponse> {
    if (!enabled()) return error(404, 'not-found')
    const user = await session.getSession().catch(() => undefined)
    if (!user) return error(401, 'unauthenticated')
    if (user.status !== 'active' || user.kids?.kind === 'parent') return error(403, 'forbidden')
    const claimed = req.headers.get('x-sz-viewer')
    const claimedAudience = req.headers.get('x-sz-viewer-audience')
    if (
      (claimed && claimed !== user.id) ||
      (claimedAudience && claimedAudience !== session.audience)
    )
      return error(409, 'viewer-mismatch')
    const readOnly = isReadonlyImpersonation(user)
    if (write && readOnly) return error(403, 'impersonation-readonly')
    const actor = PintaCausalActorSchema.safeParse({
      userId: user.id,
      accountId: user.activeProfile?.accountId ?? user.id,
      audience: session.audience,
    })
    if (!actor.success) return error(401, 'unauthenticated')
    try {
      return await operation(actor.data, readOnly)
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
          : error(response.status, response.status === 404 ? 'not-found' : 'unavailable'),
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
          const plan = checked(
            PintaMemberPlan,
            await internal(actor, 'units/member', { opId, itemId: params.itemId }),
          )
          if (plan.binding.opId !== opId || plan.binding.itemId !== params.itemId)
            return wrongReply()
          const receipt = await attestPintaMember(storage, actor, plan, req.signal)
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
