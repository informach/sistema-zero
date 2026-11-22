import {
  PINTA_CAUSAL_LIMITS,
  type PintaCausalEntry,
  PintaCausalEntrySchema,
  type PintaCausalIntent,
  type PintaCausalReservePage,
  type PintaCausalResult,
  PintaCausalResultSchema,
  PintaCausalSnapshotPageSchema,
} from '@sistemazero/core/creations/pinta-causal'
import { awaitWithSignal } from '@sistemazero/core/http'
import { z } from 'zod'

const endpoint = '/api/pinta/causal'
const sha256 = z.string().regex(/^[0-9a-f]{64}$/)
const reservedTicket = z.object({
  itemId: z.string(),
  revision: z.number().int().positive(),
  bytes: z.number().int().nonnegative().optional(),
  uploadUrl: z.url().nullish(),
  method: z.literal('PUT').optional(),
  headers: z.record(z.string(), z.string()).optional(),
})
const identity = { opId: z.uuid(), intentHash: sha256 }
const statusSchema = z.discriminatedUnion('state', [
  z.object({
    state: z.literal('collecting'),
    ...identity,
    receivedPages: z.array(z.number().int().nonnegative()).max(1024),
  }),
  z.object({
    state: z.literal('reserved'),
    ...identity,
    tickets: z.array(reservedTicket).max(PINTA_CAUSAL_LIMITS.page),
    nextCursor: z.string().nullable(),
  }),
  z.object({ state: z.literal('committed'), result: PintaCausalResultSchema }),
  z.object({ state: z.enum(['aborted', 'expired']), ...identity }),
])
const downloadSchema = z.object({ entry: PintaCausalEntrySchema, downloadUrl: z.url() })
type Status = z.infer<typeof statusSchema>
type Ticket = z.infer<typeof reservedTicket>

export class PintaCausalRequestError extends Error {
  constructor(
    readonly status: number,
    readonly reason: string,
    readonly itemId?: string,
  ) {
    super('Não consegui guardar estas mudanças juntas na conta.')
    this.name = 'PintaCausalRequestError'
  }
}

export interface PintaCloudSnapshot {
  epoch: string
  requiredFormat: number
  entries: readonly PintaCausalEntry[]
}

export interface PintaCloudUpload {
  intent: PintaCausalIntent
  intentHash: string
  blobs: ReadonlyMap<string, Blob>
}

export interface PintaCausalCloud {
  snapshot(signal?: AbortSignal): Promise<PintaCloudSnapshot | null>
  verifyEpoch(epoch: string, signal?: AbortSignal): Promise<void>
  download(
    entry: PintaCausalEntry,
    epoch: string,
    signal?: AbortSignal,
  ): Promise<Uint8Array<ArrayBuffer>>
  backfill(entry: PintaCausalEntry, epoch: string, signal?: AbortSignal): Promise<void>
  upload(upload: PintaCloudUpload, signal?: AbortSignal): Promise<PintaCausalResult>
}

function invalid(): never {
  throw new PintaCausalRequestError(0, 'invalid-proof')
}

function requireVerified(result: unknown): void {
  if (!result || typeof result !== 'object' || !('verified' in result) || result.verified !== true)
    invalid()
}

function pagesOf(intent: PintaCausalIntent, intentHash: string): PintaCausalReservePage[] {
  const { members, readSet, ...identity } = intent
  const size = PINTA_CAUSAL_LIMITS.page
  const pages = Math.ceil(Math.max(members.length, readSet.length) / size)
  return Array.from({ length: pages }, (_, page) => ({
    ...identity,
    intentHash,
    page,
    pages,
    members: members.slice(page * size, (page + 1) * size),
    readSet: readSet.slice(page * size, (page + 1) * size),
  }))
}

export async function pintaCausalGzipHash(bytes: ArrayBuffer): Promise<string> {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('')
}

export function createPintaCausalCloud(options: {
  viewerId: string
  audience: 'adult' | 'kids'
  reader: number
  signal: AbortSignal
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>
}): PintaCausalCloud {
  const { fetch, viewerId, audience, reader } = options
  const scopedSignal = (signal?: AbortSignal) =>
    AbortSignal.any([options.signal, AbortSignal.timeout(60_000), ...(signal ? [signal] : [])])
  const owner = { 'x-sz-viewer': viewerId, 'x-sz-viewer-audience': audience }
  const cancelBody = (response: Response) => {
    void response.body?.cancel().catch(() => {})
  }
  function request(path: string, signal: AbortSignal, init?: RequestInit): Promise<Response> {
    return awaitWithSignal(() => fetch(path, { ...init, signal }), signal, cancelBody)
  }
  async function api(
    path: string,
    signal: AbortSignal,
    options?: { method?: 'POST'; body?: unknown; missing?: true },
  ): Promise<unknown> {
    const response = await request(endpoint + path, signal, {
      method: options?.method,
      headers: { ...owner, ...(options?.body ? { 'content-type': 'application/json' } : {}) },
      ...(options?.body ? { body: JSON.stringify(options.body) } : {}),
    })
    if (response.status === 404 && options?.missing) {
      cancelBody(response)
      return null
    }
    const value: unknown = await awaitWithSignal(() => response.json(), signal).catch(
      () => undefined,
    )
    signal.throwIfAborted()
    if (!response.ok) {
      const reason =
        value && typeof value === 'object' && 'reason' in value && typeof value.reason === 'string'
          ? value.reason
          : 'unavailable'
      const itemId =
        value && typeof value === 'object' && 'itemId' in value && typeof value.itemId === 'string'
          ? value.itemId
          : undefined
      throw new PintaCausalRequestError(response.status, reason, itemId)
    }
    return value
  }
  function readStatus(value: unknown, upload: PintaCloudUpload): Status {
    const status = statusSchema.safeParse(value)
    if (!status.success) invalid()
    const returned = status.data.state === 'committed' ? status.data.result : status.data
    if (returned.opId !== upload.intent.opId || returned.intentHash !== upload.intentHash) invalid()
    return status.data
  }
  async function snapshot(signal?: AbortSignal): Promise<PintaCloudSnapshot | null> {
    let epoch: string | undefined
    let requiredFormat = 0
    let cursor: string | null = null
    const entries: PintaCausalEntry[] = []
    do {
      const query = new URLSearchParams({ reader: String(reader) })
      if (epoch !== undefined) query.set('epoch', epoch)
      if (cursor) query.set('cursor', cursor)
      const value = await api(`/graph?${query}`, scopedSignal(signal), {
        ...(epoch === undefined ? { missing: true } : {}),
      })
      if (value === null && epoch === undefined) return null
      const page = PintaCausalSnapshotPageSchema.safeParse(value)
      const lastId = cursor
      if (
        !page.success ||
        (epoch !== undefined &&
          (epoch !== page.data.epoch || requiredFormat !== page.data.requiredFormat)) ||
        (lastId && page.data.entries.some((entry) => entry.itemId <= lastId)) ||
        entries.length + page.data.entries.length > PINTA_CAUSAL_LIMITS.members
      )
        invalid()
      if (page.data.requiredFormat > reader)
        throw new PintaCausalRequestError(409, 'client-outdated')
      epoch = page.data.epoch
      requiredFormat = page.data.requiredFormat
      cursor = page.data.nextCursor
      entries.push(...page.data.entries)
    } while (cursor)
    return { epoch, requiredFormat, entries }
  }
  async function verifyEpoch(epoch: string, signal?: AbortSignal): Promise<void> {
    const query = new URLSearchParams({ reader: String(reader), verifyEpoch: epoch })
    const result = PintaCausalSnapshotPageSchema.safeParse(
      await api(`/graph?${query}`, scopedSignal(signal)),
    )
    if (!result.success || result.data.epoch !== epoch) invalid()
  }
  async function backfill(
    entry: PintaCausalEntry,
    epoch: string,
    signal?: AbortSignal,
  ): Promise<void> {
    const result = await api('/backfill', scopedSignal(signal), {
      method: 'POST',
      body: { reader, epoch, itemId: entry.itemId, revision: entry.revision },
    })
    requireVerified(result)
  }
  async function download(
    entry: PintaCausalEntry,
    epoch: string,
    ownerSignal?: AbortSignal,
  ): Promise<Uint8Array<ArrayBuffer>> {
    if (entry.coverage !== 'certified' || !entry.sha256)
      throw new PintaCausalRequestError(409, 'unverified-content', entry.itemId)
    const signal = scopedSignal(ownerSignal)
    const query = new URLSearchParams({
      reader: String(reader),
      epoch,
      revision: String(entry.revision),
    })
    const ticket = downloadSchema.safeParse(
      await api(`/graph/items/${encodeURIComponent(entry.itemId)}?${query}`, signal),
    )
    if (!ticket.success) invalid()
    const checked = ticket.data.entry
    if (
      checked.itemId !== entry.itemId ||
      checked.revision !== entry.revision ||
      checked.formatVersion !== entry.formatVersion ||
      checked.layoutRevision !== entry.layoutRevision ||
      checked.sha256 !== entry.sha256 ||
      checked.bytes !== entry.bytes
    )
      invalid()
    const response = await request(ticket.data.downloadUrl, signal, { credentials: 'omit' })
    if (!response.ok || !response.body) {
      cancelBody(response)
      throw new PintaCausalRequestError(response.status, 'download-failed')
    }
    const bytes = new Uint8Array(entry.bytes)
    const body = response.body.getReader()
    let total = 0
    try {
      while (true) {
        const chunk = await awaitWithSignal(() => body.read(), signal)
        if (chunk.done) break
        if (total + chunk.value.length > bytes.length) invalid()
        bytes.set(chunk.value, total)
        total += chunk.value.length
      }
    } finally {
      void body.cancel().catch(() => {})
    }
    if (
      total !== bytes.length ||
      (entry.sha256 && (await pintaCausalGzipHash(bytes.buffer)) !== entry.sha256)
    )
      invalid()
    signal.throwIfAborted()
    return bytes
  }
  async function sendTicket(
    path: string,
    ticket: Ticket,
    upload: PintaCloudUpload,
    ownerSignal?: AbortSignal,
  ): Promise<void> {
    const member = upload.intent.members.find((item) => item.itemId === ticket.itemId)
    if (!member || ticket.revision <= member.baseRevision) invalid()
    const signal = scopedSignal(ownerSignal)
    if (member.action === 'put') {
      const blob = upload.blobs.get(member.itemId)
      if (
        !blob ||
        !ticket.uploadUrl ||
        ticket.method !== 'PUT' ||
        ticket.bytes !== blob.size ||
        ticket.bytes !== member.bytes
      )
        invalid()
      const headers = new Headers(ticket.headers)
      if (headers.get('if-none-match') !== '*') invalid()
      const response = await request(ticket.uploadUrl, signal, {
        method: ticket.method,
        credentials: 'omit',
        headers,
        body: blob,
      })
      cancelBody(response)
      // A restarted write-once PUT can already exist. Verify authenticates the stored bytes.
      if (!response.ok && response.status !== 412)
        throw new PintaCausalRequestError(response.status, 'upload-failed')
    } else if (ticket.uploadUrl || (ticket.bytes ?? 0) !== 0) invalid()
    requireVerified(
      await api(`${path}/verify`, scopedSignal(ownerSignal), {
        method: 'POST',
        body: { itemId: ticket.itemId },
      }),
    )
  }
  async function upload(unit: PintaCloudUpload, signal?: AbortSignal): Promise<PintaCausalResult> {
    const path = `/units/${encodeURIComponent(unit.intent.opId)}`
    const value = await api(path, scopedSignal(signal), { missing: true })
    let status = value === null ? null : readStatus(value, unit)
    if (!status || status.state === 'collecting') {
      const received = new Set(status?.receivedPages)
      for (const page of pagesOf(unit.intent, unit.intentHash)) {
        if (received.has(page.page)) continue
        status = readStatus(
          await api('/units/reserve', scopedSignal(signal), { method: 'POST', body: page }),
          unit,
        )
        if (status.state !== 'collecting') break
      }
    }
    if (status?.state === 'committed') return status.result
    const sent = new Set<string>()
    while (status?.state === 'reserved') {
      for (const ticket of status.tickets) {
        if (sent.has(ticket.itemId)) invalid()
        await sendTicket(path, ticket, unit, signal)
        sent.add(ticket.itemId)
      }
      if (!status.nextCursor) break
      if (status.tickets.at(-1)?.itemId !== status.nextCursor) invalid()
      status = readStatus(
        await api(`${path}?cursor=${encodeURIComponent(status.nextCursor)}`, scopedSignal(signal)),
        unit,
      )
    }
    if (status?.state === 'committed') return status.result
    if (status?.state === 'expired' || status?.state === 'aborted')
      throw new PintaCausalRequestError(409, `operation-${status.state}`)
    if (status?.state !== 'reserved' || sent.size !== unit.intent.members.length) invalid()
    const result = readStatus(
      await api(`${path}/commit`, scopedSignal(signal), { method: 'POST' }),
      unit,
    )
    if (result.state !== 'committed') invalid()
    return result.result
  }
  return { snapshot, verifyEpoch, download, backfill, upload }
}
