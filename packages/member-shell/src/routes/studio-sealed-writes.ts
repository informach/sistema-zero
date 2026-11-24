import 'server-only'
import { canonicalJson } from '@sistemazero/core/creations'
import {
  STUDIO_SEALED_STORAGE_PROTOCOL as protocol,
  studioSealedBlobKey,
} from '@sistemazero/core/creations/studio-sealed-storage'
import {
  StudioSealedBaseCommandSchema,
  StudioSealedCommitResultSchema,
  StudioSealedDeleteResultSchema,
  StudioSealedHeadResultSchema,
  StudioSealedHeadSchema,
  StudioSealedReserveSchema,
  type StudioSealedTicket,
  StudioSealedTicketRequestSchema,
  StudioSealedTicketResultSchema,
  StudioSealedTicketSchema,
} from '@sistemazero/core/creations/studio-sealed-writer'
import {
  InvalidJsonBodyError,
  RequestBodyTooLargeError,
  readJsonBodyWithLimit,
} from '@sistemazero/core/http'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { CREATION_BLOB_CONTENT_TYPE } from '../server/creation-download'
import type { GatewayModule, GatewayResponse } from '../server/gateway'
import {
  authorizePintaActor,
  type PintaActorAuthorization,
} from '../server/pinta-actor-authorization'
import { pintaAccountStorageReady } from '../server/pinta-causal-eligibility'
import type { PintaCausalActor } from '../server/pinta-causal-protocol'
import { r2CreateObjectUgc, r2GetObjectUgc, r2PresignPutUgc } from '../server/r2'
import {
  proveStudioSealedWrite,
  StudioSealedContentError,
  type StudioSealedStorage,
} from '../server/studio-sealed-proof'

type Storage = StudioSealedStorage & { presignPut: typeof r2PresignPutUgc }
type Gateway = Pick<GatewayModule, 'refreshSession'> & {
  gatewayFetchHmac(...args: Parameters<GatewayModule['gatewayFetchHmac']>): Promise<GatewayResponse>
}
const liveStorage: Storage = {
  open: r2GetObjectUgc,
  create: r2CreateObjectUgc,
  presignPut: r2PresignPutUgc,
}
const Operation = z.enum(['head', 'reserve', 'commit', 'delete'])
const ItemId = StudioSealedBaseCommandSchema.shape.itemId
const UpstreamConflict = z.object({
  error: z.object({ code: z.literal('STUDIO_SEALED_WRITE_CONFLICT') }),
  reason: z.string(),
  studioHead: StudioSealedHeadSchema.optional(),
})
const reply = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: { 'cache-control': 'private, no-store' } })
const failure = (status: number, code: string, details?: { currentRevision: number }) =>
  reply(
    {
      error: {
        code,
        message: 'Não consegui confirmar o projeto na conta. O original foi preservado.',
      },
      ...(details ? { details } : {}),
    },
    status,
  )
class Rejected extends Error {
  constructor(readonly response: NextResponse) {
    super('O envio do projeto foi recusado.')
  }
}

function owns(ticket: StudioSealedTicket, actor: PintaCausalActor, itemId: string): boolean {
  return (
    ticket.scope.userId === actor.userId &&
    ticket.scope.accountId === actor.accountId &&
    ticket.scope.audience === actor.audience &&
    ticket.scope.itemId === itemId
  )
}

/** The verified learner boundary is shared with Pinta. Studio authoring rights,
 * language and revision are independently checked by Members at reserve and commit.
 */
export function createStudioSealedWrites({
  gateway,
  session,
  storage = liveStorage,
  enabled = pintaAccountStorageReady,
}: {
  gateway: Gateway
  session: PintaActorAuthorization['session']
  storage?: Storage
  /** Infrastructure readiness only; the protocol is available to every eligible profile. */
  enabled?: () => boolean
}) {
  async function internal(
    actor: PintaCausalActor,
    action: string,
    payload: unknown,
    signal: AbortSignal,
  ) {
    const result = await gateway.gatewayFetchHmac(
      `/members/internal/creations/studio/seal/${action}`,
      { method: 'POST', body: { ...actor, payload }, signal },
    )
    if (result.status === 200) return result.body
    const conflict = UpstreamConflict.safeParse(result.body)
    if (result.status === 409 && conflict.success) {
      const { reason, studioHead } = conflict.data
      if (reason === 'head-changed' && studioHead) {
        throw new Rejected(
          studioHead.adopted && !studioHead.exists
            ? failure(409, 'CREATION_REOPEN_REQUIRED')
            : failure(409, 'CREATION_STALE_BASE', { currentRevision: studioHead.revision }),
        )
      }
      if (reason === 'ticket-invalid')
        throw new Rejected(failure(409, 'STUDIO_SEALED_TICKET_INVALID'))
    }
    throw new Rejected(
      result.body
        ? reply(result.body, result.status)
        : failure(result.status, 'STUDIO_SEALED_UNAVAILABLE'),
    )
  }

  async function reserve(req: Request, actor: PintaCausalActor, itemId: string, raw: unknown) {
    const command = StudioSealedReserveSchema.safeParse(raw)
    if (!command.success || command.data.itemId !== itemId) return failure(400, 'VALIDATION_ERROR')
    const input = command.data
    const result = z
      .object({ ticket: StudioSealedTicketSchema })
      .parse(await internal(actor, 'reserve', input, req.signal))
    const { ticket } = result
    if (
      !owns(ticket, actor, itemId) ||
      ticket.bytes !== input.bytes ||
      ticket.kind !== input.kind ||
      ticket.name !== input.name ||
      ticket.baseRevision !== input.baseRevision ||
      ticket.baseGeneration !== input.baseGeneration ||
      Date.parse(ticket.itemUpdatedAt) !== Date.parse(input.itemUpdatedAt) ||
      canonicalJson(ticket.requirements) !== canonicalJson(input.requirements) ||
      ticket.parts.length !== input.parts.length ||
      ticket.parts.some(
        (part, i) =>
          part.hash !== input.parts[i]?.hash ||
          (input.parts[i]?.upload === true && part.source !== 'upload') ||
          (part.source === 'upload' && part.bytes !== input.parts[i]?.bytes),
      )
    )
      throw new Error('A reserva recebida não corresponde ao envio.')
    const signingDate = new Date()
    const expiresInSeconds = Math.min(
      600,
      Math.floor((Date.parse(ticket.expiresAt) - signingDate.getTime()) / 1000),
    )
    if (expiresInSeconds < 1) return failure(409, 'STUDIO_SEALED_TICKET_INVALID')
    const sign = (bytes: number, hash?: string) =>
      storage.presignPut({
        key: studioSealedBlobKey(ticket.scope, ticket.nonce, 'upload', hash),
        contentType: CREATION_BLOB_CONTENT_TYPE,
        contentLength: bytes,
        signingDate,
        expiresInSeconds,
        criarUmaVez: true,
      })
    const uploadUrl = await sign(ticket.bytes)
    const parts = await Promise.all(
      ticket.parts
        .filter((part) => part.source === 'upload')
        .map(async (part) => ({
          hash: part.hash,
          bytes: part.bytes,
          uploadUrl: await sign(part.bytes, part.hash),
        })),
    )
    return reply({
      ticket,
      uploadUrl,
      parts,
      method: 'PUT',
      headers: { 'content-type': CREATION_BLOB_CONTENT_TYPE, 'if-none-match': '*' },
    })
  }

  function confirmed(raw: unknown, itemId: string, nonce: string, revision: number) {
    const result = StudioSealedCommitResultSchema.parse(raw)
    if (
      result.item.itemId !== itemId ||
      result.item.revision !== revision ||
      result.studioSealReceipt.nonce !== nonce
    )
      throw new Error('O recibo recebido não pertence à revisão enviada.')
    return reply(result)
  }

  async function commit(req: Request, actor: PintaCausalActor, itemId: string, raw: unknown) {
    const command = StudioSealedTicketRequestSchema.safeParse(raw)
    if (!command.success || command.data.itemId !== itemId) return failure(400, 'VALIDATION_ERROR')
    const { nonce, revision } = command.data
    const lookup = StudioSealedTicketResultSchema.parse(
      await internal(actor, 'ticket', command.data, req.signal),
    )
    if (lookup.committed) return confirmed(lookup, itemId, nonce, revision)
    const { ticket } = lookup
    if (!owns(ticket, actor, itemId) || ticket.nonce !== nonce || ticket.revision !== revision)
      throw new Error('O projeto não corresponde ao tíquete recebido.')
    const duration = Date.parse(ticket.expiresAt) - Date.now()
    if (duration <= 0) return failure(409, 'STUDIO_SEALED_TICKET_INVALID')
    const signal = AbortSignal.any([req.signal, AbortSignal.timeout(duration)])
    const proof = await proveStudioSealedWrite({ ticket, storage, signal })
    return confirmed(await internal(actor, 'commit', proof, signal), itemId, nonce, revision)
  }

  return {
    studioSealedWrite: {
      async POST(
        req: Request,
        context: { params: Promise<{ itemId: string; operation: string }> },
      ) {
        const params = await context.params
        const item = ItemId.safeParse(params.itemId),
          operation = Operation.safeParse(params.operation)
        if (!item.success || !operation.success) return failure(404, 'NOT_FOUND')
        if (!enabled()) return failure(404, 'STUDIO_SEALED_UNAVAILABLE')
        try {
          const auth = await authorizePintaActor(req, operation.data !== 'head', {
            gateway,
            session,
          })
          if ('status' in auth)
            return failure(auth.status, auth.reason.toUpperCase().replaceAll('-', '_'))
          const actor = auth.actor,
            itemId = item.data
          if (operation.data === 'head') {
            const result = StudioSealedHeadResultSchema.parse(
              await internal(actor, 'head', { protocol, itemId }, req.signal),
            )
            return reply(result)
          }
          const raw = await readJsonBodyWithLimit(req, 64 * 1024, req.signal)
          if (operation.data === 'reserve') return await reserve(req, actor, itemId, raw)
          if (operation.data === 'commit') return await commit(req, actor, itemId, raw)
          const command = StudioSealedBaseCommandSchema.safeParse(raw)
          if (!command.success || command.data.itemId !== itemId)
            return failure(400, 'VALIDATION_ERROR')
          const result = StudioSealedDeleteResultSchema.parse(
            await internal(actor, 'delete', command.data, req.signal),
          )
          if (
            result.studioHead.exists ||
            result.revision !== 0 ||
            (result.deleted &&
              (!result.studioHead.adopted ||
                result.studioHead.generation === command.data.baseGeneration))
          )
            throw new Error('O projeto ainda está disponível na conta.')
          return reply(result)
        } catch (cause) {
          if (cause instanceof Rejected) return cause.response
          if (cause instanceof RequestBodyTooLargeError) return failure(413, 'VALIDATION_ERROR')
          if (cause instanceof InvalidJsonBodyError) return failure(400, 'VALIDATION_ERROR')
          if (cause instanceof StudioSealedContentError)
            return failure(409, 'STUDIO_SEALED_CONTENT_INVALID')
          console.error('[studio-seal] confirmação indisponível', {
            error: cause instanceof Error ? cause.name : 'unknown',
          })
          return failure(503, 'STUDIO_SEALED_UNAVAILABLE')
        }
      },
    },
  }
}
