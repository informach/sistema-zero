import 'server-only'
import {
  canonicalJson,
  creationStorageKey,
  PINTA_PALETTE_LIBRARY_ITEM_ID as itemId,
  PINTA_PALETTE_LIBRARY_KIND as kind,
} from '@sistemazero/core/creations'
import { PINTA_CAUSAL_LIMITS } from '@sistemazero/core/creations/pinta-causal'
import {
  PintaPaletteBaseCommandSchema,
  PintaPaletteHeadSchema,
  PintaPaletteReserveCommandSchema,
  PintaPaletteTicketRequestSchema,
  PintaPaletteTicketSchema,
  pintaPaletteBlobKey,
  PINTA_PALETTE_WRITE_PROTOCOL as protocol,
} from '@sistemazero/core/creations/pinta-palette-writer'
import { sanitizePaletteLibrary } from '@sistemazero/pinta/assets'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { CREATION_BLOB_CONTENT_TYPE, signCreationDownload } from '../server/creation-download'
import type { GatewayModule } from '../server/gateway'
import {
  authorizePintaActor,
  type PintaActorAuthorization,
} from '../server/pinta-actor-authorization'
import { PintaCausalUnverifiedContent, readVerifiedPintaGzip } from '../server/pinta-causal-content'
import {
  pintaCausalProfileAllowed,
  pintaPaletteWriteCandidateReady,
} from '../server/pinta-causal-eligibility'
import type { PintaCausalActor } from '../server/pinta-causal-protocol'
import { r2CreateObjectUgc, r2GetObjectUgc, r2PresignGetUgc, r2PresignPutUgc } from '../server/r2'

const positive = z.number().int().positive()
const bytes = positive.max(PINTA_CAUSAL_LIMITS.itemBytes)
const summary = z.object({
  tool: z.literal('pinta'),
  itemId: z.literal(itemId),
  kind: z.literal(kind),
  name: z.string(),
  itemUpdatedAt: z.iso.datetime({ offset: true }),
  syncedAt: z.iso.datetime({ offset: true }),
  revision: positive,
  bytes,
  thumb: z.string().nullable(),
  formatVersion: z.number().int().positive().optional(),
  deletedAt: z.null().optional(),
  contentFingerprint: z.string().optional(),
})
const Download = z.object({
  storageKey: z.string(),
  revision: positive,
  bytes,
  summary,
  parts: z.tuple([]),
})
const HeadReply = z.object({ paletteHead: PintaPaletteHeadSchema, download: Download.nullable() })
const CommitReceipt = z.object({ item: summary, paletteHead: PintaPaletteHeadSchema })
const TicketReply = z.discriminatedUnion('committed', [
  CommitReceipt.extend({ committed: z.literal(true) }),
  z.strictObject({ committed: z.literal(false), ticket: PintaPaletteTicketSchema }),
])
const DeleteReply = z.object({
  deleted: z.boolean(),
  revision: z.literal(0),
  paletteHead: PintaPaletteHeadSchema,
})

type Storage = {
  presignPut: typeof r2PresignPutUgc
  presignGet: typeof r2PresignGetUgc
  open: typeof r2GetObjectUgc
  create: typeof r2CreateObjectUgc
}
const liveStorage: Storage = {
  presignPut: r2PresignPutUgc,
  presignGet: r2PresignGetUgc,
  open: r2GetObjectUgc,
  create: r2CreateObjectUgc,
}

const reply = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: { 'cache-control': 'private, no-store' } })

const failure = (status: number, code: string) =>
  reply({ error: { code, message: 'A biblioteca de paletas não pôde ser conferida.' } }, status)

class Rejected extends Error {
  constructor(readonly response: NextResponse) {
    super('A confirmação da biblioteca foi recusada.')
  }
}

export function isPaletteDownloadKey(
  storageKey: string,
  actor: { userId: string; audience: 'kids' | 'adult' },
  revision: number,
  adopted?: boolean,
): boolean {
  const legacy = creationStorageKey(actor.userId, 'pinta', itemId, revision, actor.audience)
  if (storageKey === legacy) return adopted !== true
  if (adopted === false) return false
  const prefix = `${legacy.slice(0, legacy.lastIndexOf('/') + 1)}units/`
  if (!storageKey.startsWith(prefix)) return false
  const nonce = storageKey.split('/').at(-2)
  return (
    z.uuid().safeParse(nonce).success &&
    storageKey === pintaPaletteBlobKey(actor, { nonce: nonce!, revision }, 'sealed')
  )
}

function parsePalette(text: string, updatedAt: string): void {
  try {
    const raw = JSON.parse(text) as Record<string, unknown>
    const palette = sanitizePaletteLibrary(raw)
    if (!palette || !Array.isArray(raw.palettes) || !Array.isArray(raw.removed))
      throw new Error('Paleta inválida')
    const sortById = (entries: unknown[]) =>
      entries.toSorted((left, right) =>
        String((left as { id?: unknown } | null)?.id).localeCompare(
          String((right as { id?: unknown } | null)?.id),
        ),
      )
    const normalized = (value: Record<string, unknown>, palettes: unknown[], removed: unknown[]) =>
      canonicalJson({ ...value, palettes: sortById(palettes), removed: sortById(removed) })
    if (
      new Date(palette.updatedAt).toISOString() !== updatedAt ||
      normalized(raw, raw.palettes, raw.removed) !==
        normalized({ ...palette }, palette.palettes, palette.removed)
    )
      throw new Error('Dados de autoria mudariam')
  } catch (cause) {
    throw new PintaCausalUnverifiedContent('A biblioteca enviada não é um documento válido.', {
      cause,
    })
  }
}

function provedReceipt(raw: unknown, revision: number, nonce: string) {
  const receipt = CommitReceipt.parse(raw)
  if (
    !receipt.paletteHead.adopted ||
    !receipt.paletteHead.exists ||
    receipt.paletteHead.revision !== revision ||
    receipt.item.revision !== revision
  )
    throw new Error('ACK sem o cabeçote confirmado')
  return reply({ ...receipt, paletteWrite: { protocol, nonce } })
}

export function createPintaPaletteWrites({
  gateway,
  session,
  storage = liveStorage,
  enabled = pintaPaletteWriteCandidateReady,
  profileAllowed = pintaCausalProfileAllowed,
}: {
  gateway: Pick<GatewayModule, 'gatewayFetchHmac' | 'refreshSession'>
  session: PintaActorAuthorization['session']
  storage?: Storage
  enabled?: () => boolean
  profileAllowed?: PintaActorAuthorization['profileAllowed']
}) {
  async function internal(
    actor: PintaCausalActor,
    action: string,
    payload: unknown,
    signal?: AbortSignal,
  ) {
    const result = await gateway.gatewayFetchHmac(
      `/members/internal/creations/pinta/palette/${action}`,
      { method: 'POST', body: { ...actor, payload }, ...(signal ? { signal } : {}) },
    )
    if (result.status !== 200)
      throw new Rejected(
        result.body
          ? reply(result.body, result.status)
          : failure(result.status, 'PINTA_PALETTE_UNAVAILABLE'),
      )
    return result.body
  }

  async function run(
    req: Request,
    write: boolean,
    handler: (actor: PintaCausalActor) => Promise<NextResponse>,
  ) {
    if (!enabled()) return failure(404, 'PINTA_PALETTE_UNAVAILABLE')
    try {
      const verified = await authorizePintaActor(req, write, { gateway, session, profileAllowed })
      if ('status' in verified)
        return failure(verified.status, verified.reason.toUpperCase().replaceAll('-', '_'))
      return await handler(verified.actor)
    } catch (cause) {
      if (cause instanceof Rejected) return cause.response
      if (cause instanceof PintaCausalUnverifiedContent)
        return failure(409, 'PINTA_PALETTE_CONTENT_INVALID')
      return failure(503, 'PINTA_PALETTE_UNAVAILABLE')
    }
  }

  return {
    head: (req: Request) =>
      run(req, false, async (actor) => {
        const { paletteHead, download } = HeadReply.parse(await internal(actor, 'head', {}))
        if (!paletteHead.exists && !download) return reply({ paletteHead }, 404)
        if (
          !paletteHead.exists ||
          !download ||
          download.revision !== paletteHead.revision ||
          download.summary.revision !== paletteHead.revision ||
          download.bytes !== download.summary.bytes ||
          !isPaletteDownloadKey(download.storageKey, actor, download.revision, paletteHead.adopted)
        )
          throw new Error('Cabeçote e revisão incompatíveis')
        return reply({ ...(await signCreationDownload(storage.presignGet, download)), paletteHead })
      }),

    reserve: (req: Request, raw: unknown) =>
      run(req, true, async (actor) => {
        const command = PintaPaletteReserveCommandSchema.safeParse(raw)
        if (!command.success) return failure(400, 'VALIDATION_ERROR')
        const { ticket } = z
          .object({ ticket: PintaPaletteTicketSchema })
          .parse(await internal(actor, 'reserve', command.data))
        if (
          command.data.bytes !== ticket.bytes ||
          command.data.baseRevision !== ticket.baseRevision ||
          command.data.baseGeneration !== ticket.baseGeneration ||
          Date.parse(command.data.itemUpdatedAt) !== Date.parse(ticket.itemUpdatedAt)
        )
          throw new Error('Reserva de paleta incompatível')
        const signingDate = new Date()
        const expires = Math.floor((Date.parse(ticket.expiresAt) - signingDate.getTime()) / 1000)
        if (expires < 1) return failure(409, 'CREATION_REVISION_MISMATCH')
        const uploadUrl = await storage.presignPut({
          key: pintaPaletteBlobKey(actor, ticket, 'upload'),
          contentType: CREATION_BLOB_CONTENT_TYPE,
          contentLength: ticket.bytes,
          expiresInSeconds: Math.min(expires, 600),
          signingDate,
          criarUmaVez: true,
        })
        return reply({
          revision: ticket.revision,
          formatVersion: 1,
          bytes: ticket.bytes,
          uploadUrl,
          method: 'PUT',
          headers: { 'content-type': CREATION_BLOB_CONTENT_TYPE, 'if-none-match': '*' },
          parts: [],
          paletteWrite: {
            protocol,
            nonce: ticket.nonce,
            baseGeneration: ticket.baseGeneration,
            expiresAt: ticket.expiresAt,
          },
        })
      }),

    commit: (req: Request, raw: unknown) =>
      run(req, true, async (actor) => {
        const learned = PintaPaletteTicketRequestSchema.safeParse(raw)
        if (!learned.success) return failure(400, 'VALIDATION_ERROR')
        const { revision, nonce } = learned.data
        const lookup = TicketReply.parse(await internal(actor, 'ticket', learned.data))
        if (lookup.committed) {
          const { committed: _already, ...receipt } = lookup
          return provedReceipt(receipt, revision, nonce)
        }
        const { ticket } = lookup
        if (revision !== ticket.revision || nonce !== ticket.nonce)
          throw new Error('O envio não corresponde à reserva.')
        const expires = Date.parse(ticket.expiresAt) - Date.now()
        if (expires <= 0) return failure(409, 'CREATION_REVISION_MISMATCH')
        const signal = AbortSignal.any([req.signal, AbortSignal.timeout(expires)])
        const sealedKey = pintaPaletteBlobKey(actor, ticket, 'sealed')
        const sealed = await storage.open(sealedKey, signal)
        const staged =
          sealed ?? (await storage.open(pintaPaletteBlobKey(actor, ticket, 'upload'), signal))
        if (!staged) return failure(409, 'PINTA_PALETTE_UPLOAD_MISSING')
        const { gzip, text, sha256 } = await readVerifiedPintaGzip(staged, ticket, signal)
        parsePalette(text, ticket.itemUpdatedAt)
        if (!sealed) {
          const created = await storage.create(
            { key: sealedKey, body: gzip, contentType: CREATION_BLOB_CONTENT_TYPE },
            signal,
          )
          if (!created) {
            const existing = await storage.open(sealedKey, signal)
            if (!existing) throw new Error('O selo não está disponível.')
            await readVerifiedPintaGzip(existing, { bytes: ticket.bytes, sha256 }, signal)
          }
        }
        signal.throwIfAborted()
        return provedReceipt(
          await internal(actor, 'commit', { ticket, sha256 }, signal),
          revision,
          nonce,
        )
      }),

    remove: (req: Request, raw: unknown) =>
      run(req, true, async (actor) => {
        const command = PintaPaletteBaseCommandSchema.safeParse(raw)
        if (!command.success) return failure(400, 'VALIDATION_ERROR')
        const result = DeleteReply.parse(await internal(actor, 'delete', command.data))
        if (result.paletteHead.exists) throw new Error('A revisão continua disponível.')
        return reply(result)
      }),
  }
}
