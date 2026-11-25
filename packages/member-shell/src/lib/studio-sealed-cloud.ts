import { canonicalJson, sha256Hex } from '@sistemazero/core/creations'
import {
  STUDIO_SEALED_STORAGE_PROTOCOL as protocol,
  StudioSealedManifestSchema,
} from '@sistemazero/core/creations/studio-sealed-storage'
import {
  StudioSealedCommitResultSchema,
  StudioSealedDeleteResultSchema,
  type StudioSealedHead,
  StudioSealedHeadResultSchema,
  StudioSealedTicketSchema,
} from '@sistemazero/core/creations/studio-sealed-writer'
import { studioProjectIndexName } from '@sistemazero/core/studio/project-index-name'
import { z } from 'zod'
import type { CloudPart, CreationMeta } from './creations-cloud'

const Reservation = z.object({
  ticket: StudioSealedTicketSchema,
  uploadUrl: z.url(),
  method: z.literal('PUT'),
  headers: z.record(z.string(), z.string()),
  parts: z.array(z.object({ hash: z.string(), bytes: z.number(), uploadUrl: z.url() })),
})
const ErrorDetails = z.object({
  status: z.number().optional(),
  code: z.string().optional(),
  details: z.object({ hashes: z.string().array() }).optional(),
})
class SealedCloudError extends Error {
  readonly status = 409
  constructor(
    readonly code: string,
    readonly details?: { currentRevision: number },
  ) {
    super('Não consegui confirmar esta revisão. O projeto deste aparelho foi preservado.')
  }
}
type Prepared = {
  meta: CreationMeta
  json: string
  jsonHash: string
  manifest: z.infer<typeof StudioSealedManifestSchema>
  parts: Map<string, CloudPart>
}
type Pending = {
  prepared: Pick<Prepared, 'meta' | 'jsonHash'>
  reservation: z.infer<typeof Reservation>
  bytes: Uint8Array
  partBytes: Map<string, Uint8Array>
  uploaded: boolean
  adopted: boolean
}
async function hashBytes(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', Uint8Array.from(bytes))
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}

/** One writer inside the existing queue. A lost ACK retains the exact nonce and
 * captured bytes; a new edit must finish that acknowledgment before reserving again.
 */
export function createStudioSealedCloud(options: {
  viewerId: string
  api(path: string, init: RequestInit): Promise<unknown>
  put(
    url: string,
    method: string,
    headers: Record<string, string>,
    bytes: Uint8Array,
  ): Promise<void>
  gzip(text: string): Promise<Uint8Array>
}) {
  const pending = new Map<string, Pending>()
  const chains = new Map<string, Promise<unknown>>()
  function serial<T>(id: string, action: () => Promise<T>): Promise<T> {
    const previous = chains.get(id) ?? Promise.resolve()
    const run = previous.then(action, action)
    chains.set(id, run)
    const cleanup = () => {
      if (chains.get(id) === run) chains.delete(id)
    }
    void run.then(cleanup, cleanup)
    return run
  }
  const call = (itemId: string, operation: string, body?: unknown) =>
    options.api(`/${encodeURIComponent(itemId)}/seal/${operation}`, {
      method: 'POST',
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    })
  async function head(itemId: string): Promise<StudioSealedHead> {
    return StudioSealedHeadResultSchema.parse(await call(itemId, 'head')).studioHead
  }
  function base(current: StudioSealedHead, revision: number, writing: boolean) {
    if (writing && current.adopted && !current.exists)
      throw new SealedCloudError('CREATION_REOPEN_REQUIRED')
    if (current.revision !== revision)
      throw new SealedCloudError('CREATION_STALE_BASE', { currentRevision: current.revision })
    return { protocol, baseGeneration: current.generation, baseRevision: revision }
  }
  async function prepare(meta: CreationMeta, json: string, parts: CloudPart[]): Promise<Prepared> {
    const raw: unknown = JSON.parse(json)
    const wrapped = z
      .object({
        format: z.literal('sz-studio-parts'),
        version: z.literal(1),
        program: z.record(z.string(), z.unknown()),
        assets: z.string().array(),
      })
      .safeParse(raw)
    const project = z
      .record(z.string(), z.unknown())
      .parse(wrapped.success ? wrapped.data.program : raw)
    const manifest = StudioSealedManifestSchema.parse(
      project.format === 'sz-studio-parts'
        ? project
        : {
            format: 'sz-studio-parts',
            version: 2,
            requirements: {
              envelopeVersion: 2,
              projectFormat: project.formatVersion,
              materials: 'legacy',
              ...(project.programmingLanguage === 'python'
                ? { programmingLanguage: 'python' }
                : {}),
            },
            program: { ...project, assets: [] },
            assets: wrapped.success ? wrapped.data.assets : [],
          },
    )
    if (
      manifest.program.id !== meta.itemId ||
      manifest.program.updatedAt !== meta.updatedAt ||
      manifest.requirements.projectFormat !== meta.formatVersion ||
      (manifest.program.kind ?? 'classic') !== meta.kind ||
      typeof manifest.program.name !== 'string' ||
      studioProjectIndexName(manifest.program.name) !== meta.name
    )
      throw new SealedCloudError('STUDIO_SEALED_CONTENT_INVALID')
    // A whole legacy document with assets must never lose them while being wrapped.
    if (
      !wrapped.success &&
      project.format !== 'sz-studio-parts' &&
      Array.isArray(project.assets) &&
      project.assets.length
    )
      throw new SealedCloudError('STUDIO_SEALED_CONTENT_INVALID')
    const byHash = new Map(parts.map((part) => [part.hash, part]))
    const hashes = new Set(manifest.assets)
    if (hashes.size !== byHash.size || [...hashes].some((hash) => !byHash.has(hash)))
      throw new SealedCloudError('CREATION_PART_MISSING')
    const text = canonicalJson(manifest)
    return {
      meta: { ...meta },
      manifest,
      json: text,
      jsonHash: await sha256Hex(text),
      parts: byHash,
    }
  }
  async function reserve(prepared: Prepared, revision: number): Promise<Pending> {
    const { meta, manifest } = prepared
    const current = await head(meta.itemId)
    const command = base(current, revision, true)
    const bytes = await options.gzip(prepared.json)
    const partBytes = new Map<string, Uint8Array>()
    for (let round = 0; round < 4; round++) {
      let raw: unknown
      try {
        raw = await call(meta.itemId, 'reserve', {
          ...command,
          itemId: meta.itemId,
          name: meta.name,
          kind: meta.kind,
          bytes: bytes.byteLength,
          itemUpdatedAt: new Date(meta.updatedAt).toISOString(),
          thumb: meta.thumb ?? null,
          requirements: manifest.requirements,
          parts: [...prepared.parts.keys()].map((hash) => ({
            hash,
            ...(partBytes.has(hash) ? { bytes: partBytes.get(hash)?.byteLength } : {}),
          })),
        })
      } catch (error) {
        const parsed = ErrorDetails.safeParse(error)
        const needed = parsed.success ? parsed.data.details?.hashes : undefined
        if (
          !parsed.success ||
          parsed.data.code !== 'CREATION_PARTS_NEED_BYTES' ||
          !needed?.length ||
          round === 3
        )
          throw error
        for (const hash of needed) {
          const part = prepared.parts.get(hash)
          if (!part || partBytes.has(hash)) throw error
          const text = await part.text()
          if ((await sha256Hex(text)) !== hash)
            throw new SealedCloudError('STUDIO_SEALED_CONTENT_INVALID')
          partBytes.set(hash, await options.gzip(text))
        }
        continue
      }
      const reservation = Reservation.parse(raw),
        ticket = reservation.ticket
      const planned = ticket.parts.filter((part) => part.source === 'upload')
      if (
        ticket.scope.userId !== options.viewerId ||
        ticket.scope.itemId !== meta.itemId ||
        ticket.baseRevision !== revision ||
        ticket.baseGeneration !== current.generation ||
        ticket.bytes !== bytes.byteLength ||
        ticket.kind !== meta.kind ||
        ticket.name !== meta.name ||
        Date.parse(ticket.itemUpdatedAt) !== meta.updatedAt ||
        canonicalJson(ticket.requirements) !== canonicalJson(manifest.requirements) ||
        canonicalJson(ticket.parts.map((part) => part.hash)) !==
          canonicalJson([...prepared.parts.keys()]) ||
        new Headers(reservation.headers).get('if-none-match') !== '*' ||
        reservation.parts.length !== planned.length ||
        planned.some(
          (part, i) =>
            part.hash !== reservation.parts[i]?.hash ||
            part.bytes !== reservation.parts[i]?.bytes ||
            partBytes.get(part.hash)?.byteLength !== part.bytes,
        )
      )
        throw new SealedCloudError('STUDIO_SEALED_CONTENT_INVALID')
      return {
        prepared: { meta: prepared.meta, jsonHash: prepared.jsonHash },
        reservation,
        bytes,
        partBytes,
        uploaded: false,
        adopted: current.adopted,
      }
    }
    throw new SealedCloudError('CREATION_PART_MISSING')
  }
  async function finish(state: Pending) {
    const { reservation, prepared, bytes, partBytes } = state
    const { ticket } = reservation
    if (!state.uploaded && Date.parse(ticket.expiresAt) <= Date.now())
      throw new SealedCloudError('STUDIO_SEALED_TICKET_INVALID')
    async function put(url: string, body: Uint8Array) {
      try {
        await options.put(url, reservation.method, reservation.headers, body)
      } catch (error) {
        const parsed = ErrorDetails.safeParse(error)
        // A replayed staging PUT is not an ACK. The BFF still verifies the bytes.
        if (
          !parsed.success ||
          parsed.data.code !== 'STORAGE_PUT_FAILED' ||
          parsed.data.status !== 412
        )
          throw error
      }
    }
    for (const part of state.uploaded ? [] : reservation.parts) {
      const body = partBytes.get(part.hash)
      if (!body) throw new SealedCloudError('CREATION_PART_MISSING')
      await put(part.uploadUrl, body)
    }
    if (!state.uploaded) await put(reservation.uploadUrl, bytes)
    state.uploaded = true
    // ACK recovery needs the ticket and manifest digest, never another retained copy of every PNG.
    partBytes.clear()
    const result = StudioSealedCommitResultSchema.parse(
      await call(ticket.scope.itemId, 'commit', {
        protocol,
        itemId: ticket.scope.itemId,
        nonce: ticket.nonce,
        revision: ticket.revision,
      }),
    )
    const receipt = result.studioSealReceipt
    if (
      result.item.itemId !== ticket.scope.itemId ||
      result.item.revision !== ticket.revision ||
      result.item.kind !== ticket.kind ||
      Date.parse(result.item.itemUpdatedAt) !== prepared.meta.updatedAt ||
      receipt.nonce !== ticket.nonce ||
      receipt.jsonSha256 !== prepared.jsonHash ||
      receipt.manifestBytes !== bytes.byteLength ||
      receipt.gzipSha256 !== (await hashBytes(bytes)) ||
      canonicalJson(receipt.requirements) !== canonicalJson(ticket.requirements) ||
      (state.adopted && result.studioHead.generation !== ticket.baseGeneration)
    )
      throw new SealedCloudError('STUDIO_SEALED_CONTENT_INVALID')
    pending.delete(ticket.scope.itemId)
    return { revision: result.item.revision }
  }
  async function finishOrExpire(state: Pending) {
    try {
      return await finish(state)
    } catch (error) {
      const parsed = ErrorDetails.safeParse(error)
      if (parsed.success && parsed.data.code === 'STUDIO_SEALED_TICKET_INVALID') {
        const ticket = state.reservation.ticket
        const current = await head(ticket.scope.itemId)
        pending.delete(ticket.scope.itemId)
        base(current, ticket.baseRevision, true)
        if (current.generation !== ticket.baseGeneration)
          throw new SealedCloudError('CREATION_REOPEN_REQUIRED')
        return null
      }
      if (
        parsed.success &&
        [
          'CREATION_STALE_BASE',
          'CREATION_REOPEN_REQUIRED',
          'STUDIO_SEALED_CONTENT_INVALID',
        ].includes(parsed.data.code ?? '')
      )
        pending.delete(state.prepared.meta.itemId)
      throw error
    }
  }
  return {
    upload(meta: CreationMeta, json: string, parts: CloudPart[]) {
      // Capture the metadata before yielding; the producer owns the immutable part text.
      const captured = { ...meta }
      return serial(captured.itemId, async () => {
        const prepared = await prepare(captured, json, parts)
        let revision = captured.baseRevision ?? 0
        const previous = pending.get(captured.itemId)
        if (previous) {
          const result = await finishOrExpire(previous)
          if (result) {
            if (previous.prepared.jsonHash === prepared.jsonHash) return result
            if (revision === previous.reservation.ticket.baseRevision) revision = result.revision
          }
        }
        for (let attempt = 0; attempt < 2; attempt++) {
          const state = await reserve(prepared, revision)
          pending.set(captured.itemId, state)
          const result = await finishOrExpire(state)
          if (result) return result
        }
        throw new SealedCloudError('STUDIO_SEALED_TICKET_INVALID')
      })
    },
    remove(itemId: string, revision: number) {
      return serial(itemId, async () => {
        const previous = pending.get(itemId)
        if (previous) {
          try {
            const result = await finishOrExpire(previous)
            if (result && revision === previous.reservation.ticket.baseRevision)
              revision = result.revision
          } catch (error) {
            const details = ErrorDetails.safeParse(error)
            if (details.success && details.data.code === 'CREATION_REOPEN_REQUIRED') {
              const current = await head(itemId)
              if (current.adopted && !current.exists) return { revision: 0 }
            }
            throw error
          }
        }
        const current = await head(itemId)
        // Repeating a delete after a lost ACK is harmless; it cannot recreate content.
        if (!current.exists && current.adopted) {
          pending.delete(itemId)
          return { revision: 0 }
        }
        const command = base(current, revision, false)
        const result = StudioSealedDeleteResultSchema.parse(
          await call(itemId, 'delete', { ...command, itemId }),
        )
        if (
          result.studioHead.exists ||
          result.revision !== 0 ||
          ((result.deleted || current.exists) &&
            (!result.studioHead.adopted || result.studioHead.generation === current.generation))
        )
          throw new SealedCloudError('STUDIO_SEALED_CONTENT_INVALID')
        return { revision: 0 }
      })
    },
  }
}
