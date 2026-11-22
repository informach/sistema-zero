/** Private graph protocol for the personal Pinta gallery, independent of the document formats. */
import { z } from 'zod'
import { canonicalJson } from './content-fingerprint'
import { PINTA_INVENTORY_READER_VERSION } from './pinta-format'
import { PINTA_PALETTE_LIBRARY_ITEM_ID } from './pinta-palette-library'

export const PINTA_CAUSAL_LIMITS = Object.freeze({
  members: 2000,
  page: 100,
  tiles: 256,
  itemBytes: 40 * 1024 * 1024,
  manifestBytes: 1024 * 1024,
  intentBytes: 8 * 1024 * 1024,
  readEdges: 65_536,
})

const count = (max: number) => z.number().int().min(0).max(max)
const revision = count(2_147_483_647)
const positiveRevision = revision.min(1)
const formatVersion = count(65_535).min(1)
const sha256 = z.string().regex(/^[0-9a-f]{64}$/)
const uuid = z.uuid()
const itemId = z
  .string()
  .regex(/^[A-Za-z0-9_-]{1,64}$/)
  .refine((id) => id !== PINTA_PALETTE_LIBRARY_ITEM_ID)
const reference = z.string().min(1).max(128)
const name = z.string().min(1).max(120)
const epoch = z
  .string()
  .regex(/^(0|[1-9][0-9]{0,18})$/)
  .refine((value) => value.length < 19 || value <= '9223372036854775807')
const tileMask = z.string().regex(/^[0-9a-f]{64}$/)
const kinds = z.enum([
  'pixel-sprite',
  'pixel-background',
  'tileset',
  'tilemap',
  'vector-sprite',
  'vector-background',
  'vector-tileset',
  'map-set',
])
const sheetKind = z.enum(['tileset', 'vector-tileset'])
const tileSize = z.number().int().positive().max(4096)
const tileCount = count(PINTA_CAUSAL_LIMITS.tiles).min(1)
const roles = z.enum(['default-sheet', 'layer-sheet', 'art', 'set', 'property'])
const date = z.iso.datetime({ offset: true })
const namespace = z.strictObject({
  userId: uuid,
  audience: z.enum(['kids', 'adult']),
  tool: z.literal('pinta'),
})

const unique = <T>(values: readonly T[]) => new Set(values).size === values.length
const sizeWithin = (value: unknown, limit: number) =>
  new TextEncoder().encode(JSON.stringify(value)).length <= limit

const ref = z
  .strictObject({
    id: reference,
    roles: z.array(roles).min(1).max(5).refine(unique),
    /** Little-endian bits per byte. Index i occupies bit i%8 in byte floor(i/8). */
    indices: tileMask.optional(),
    implicitArtSlotZero: z.literal(true).optional(),
  })
  .refine((r) => !r.implicitArtSlotZero || r.roles.includes('art'))

export const PintaCausalManifestSchema = z
  .strictObject({
    version: z.literal(1),
    itemId,
    name,
    kind: kinds,
    nativeSchema: count(65_535),
    backupVersion: formatVersion,
    requiredNativeSchema: count(65_535),
    refs: z.array(ref).max(PINTA_CAUSAL_LIMITS.readEdges),
    doorSelectors: z
      .array(z.string().min(1).max(4096))
      .max(PINTA_CAUSAL_LIMITS.readEdges)
      .refine(unique),
    sheet: z.strictObject({ tileSize, count: tileCount }).optional(),
    embeddedDefaultLayout: z.strictObject({ kind: sheetKind, tileSize }).optional(),
  })
  .refine(
    (m) => unique(m.refs.map((r) => r.id)) && sizeWithin(m, PINTA_CAUSAL_LIMITS.manifestBytes),
  )
  .refine((m) => (m.kind === 'tileset' || m.kind === 'vector-tileset') === !!m.sheet)
  .refine((m) => !m.embeddedDefaultLayout || m.kind === 'tilemap' || m.kind === 'map-set')
export type PintaCausalManifest = z.infer<typeof PintaCausalManifestSchema>

const mapping = z.array(z.number().int().min(-1).max(255)).min(1).max(PINTA_CAUSAL_LIMITS.tiles)
export const PintaCausalOperationSchema = z
  .discriminatedUnion('type', [
    z.strictObject({ type: z.literal('create') }),
    z.strictObject({ type: z.literal('update') }),
    z.strictObject({ type: z.literal('paint'), slots: tileMask }),
    z.strictObject({ type: z.literal('append'), count: tileCount }),
    z.strictObject({ type: z.literal('remap'), oldToNew: mapping, count: tileCount }),
  ])
  .refine(
    (op) =>
      op.type !== 'remap' ||
      (unique(op.oldToNew.filter((n) => n >= 0)) && op.oldToNew.every((n) => n < op.count)),
  )
export type PintaCausalOperation = z.infer<typeof PintaCausalOperationSchema>

const put = z.strictObject({
  action: z.literal('put'),
  itemId,
  baseRevision: revision,
  name,
  kind: kinds,
  formatVersion,
  itemUpdatedAt: date,
  bytes: count(PINTA_CAUSAL_LIMITS.itemBytes).min(1),
  sha256,
  thumb: z.string().max(12_000).nullable().optional(),
  operation: PintaCausalOperationSchema,
})
const deletion = z.strictObject({
  action: z.literal('delete'),
  itemId,
  baseRevision: positiveRevision,
})
export const PintaCausalMemberSchema = z
  .discriminatedUnion('action', [put, deletion])
  .refine(
    (m) =>
      m.action === 'delete' ||
      ((m.baseRevision > 0 || m.operation.type === 'create') &&
        (['create', 'update'].includes(m.operation.type) ||
          m.kind === 'tileset' ||
          m.kind === 'vector-tileset')),
  )
export type PintaCausalMember = z.infer<typeof PintaCausalMemberSchema>

const read = z.discriminatedUnion('source', [
  z.strictObject({
    source: z.literal('snapshot'),
    consumerId: itemId,
    targetId: itemId,
    revision: positiveRevision,
    sha256,
    layoutRevision: epoch.optional(),
  }),
  z.strictObject({ source: z.literal('unit'), consumerId: itemId, targetId: itemId }),
])
export type PintaCausalRead = z.infer<typeof read>
const identity = {
  protocol: z.literal(1),
  opId: uuid,
  baseEpoch: epoch,
  reader: formatVersion.max(PINTA_INVENTORY_READER_VERSION),
  /** An exact undo may restore references that a removed slot previously cleared. */
  inverseOf: uuid.optional(),
}
export const PintaCausalIntentSchema = z
  .strictObject({
    ...identity,
    members: z.array(PintaCausalMemberSchema).min(1).max(PINTA_CAUSAL_LIMITS.members),
    readSet: z.array(read).max(PINTA_CAUSAL_LIMITS.readEdges),
  })
  .refine((body) => {
    const writes = new Map(body.members.map((member) => [member.itemId, member]))
    return (
      writes.size === body.members.length &&
      body.members.every((m, i) => i === 0 || body.members[i - 1]!.itemId < m.itemId) &&
      body.readSet.every(
        (r, i) =>
          writes.get(r.consumerId)?.action === 'put' &&
          (r.source !== 'unit' || writes.get(r.targetId)?.action === 'put') &&
          (i === 0 ||
            body.readSet[i - 1]!.consumerId < r.consumerId ||
            (body.readSet[i - 1]!.consumerId === r.consumerId &&
              body.readSet[i - 1]!.targetId < r.targetId)),
      ) &&
      sizeWithin(body, PINTA_CAUSAL_LIMITS.intentBytes)
    )
  })
export type PintaCausalIntent = z.infer<typeof PintaCausalIntentSchema>

/** Hash the canonical full intent before splitting transport pages. Array order is specified above. */
export async function pintaCausalIntentHash(intent: PintaCausalIntent): Promise<string> {
  const bytes = new TextEncoder().encode(canonicalJson(intent))
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export const PintaCausalReservePageSchema = z
  .strictObject({
    ...identity,
    intentHash: sha256,
    page: count(1023),
    pages: count(1024).min(1),
    members: z.array(PintaCausalMemberSchema).max(PINTA_CAUSAL_LIMITS.page),
    readSet: z.array(read).max(PINTA_CAUSAL_LIMITS.page),
  })
  .refine((p) => p.page < p.pages && p.members.length + p.readSet.length > 0)
export type PintaCausalReservePage = z.infer<typeof PintaCausalReservePageSchema>

const ticket = z.strictObject({
  itemId,
  baseRevision: revision,
  revision: positiveRevision,
  nonce: uuid,
})
export const PintaCausalBindingSchema = z.strictObject({
  namespace,
  opId: uuid,
  intentHash: sha256,
  baseEpoch: epoch,
  ...ticket.shape,
  baseSha256: sha256.nullable(),
  candidateSha256: sha256.nullable(),
  expiresAt: date,
})
export type PintaCausalBinding = z.infer<typeof PintaCausalBindingSchema>

/** Internal S2S body. The authenticated BFF derives every fact from the sealed bytes. */
export const PintaCausalAttestationSchema = z
  .strictObject({
    purpose: z.literal('pinta-unit-content-v1'),
    binding: PintaCausalBindingSchema,
    manifest: PintaCausalManifestSchema.nullable(),
    /** Remaps verified against this consumer's old and proposed bytes in exactly this intent. */
    transitions: z
      .array(z.strictObject({ sheetId: itemId, mode: z.enum(['mapped', 'pinned', 'detached']) }))
      .max(PINTA_CAUSAL_LIMITS.members),
  })
  .refine(
    (p) =>
      unique(p.transitions.map((t) => t.sheetId)) &&
      (p.manifest === null) === (p.binding.candidateSha256 === null) &&
      (!p.manifest || p.manifest.itemId === p.binding.itemId),
  )
export type PintaCausalAttestation = z.infer<typeof PintaCausalAttestationSchema>

export const PintaCausalResultSchema = z
  .strictObject({
    opId: uuid,
    intentHash: sha256,
    epoch,
    members: z
      .array(
        z
          .strictObject({
            itemId,
            revision: positiveRevision,
            deleted: z.boolean(),
            sha256: sha256.nullable(),
            layoutRevision: epoch.nullable(),
          })
          .refine((m) => m.deleted === (m.sha256 === null)),
      )
      .min(1)
      .max(PINTA_CAUSAL_LIMITS.members),
  })
  .refine((r) => unique(r.members.map((m) => m.itemId)))
export type PintaCausalResult = z.infer<typeof PintaCausalResultSchema>

export const PintaCausalStatusSchema = z.discriminatedUnion('state', [
  z.strictObject({
    state: z.literal('collecting'),
    opId: uuid,
    intentHash: sha256,
    receivedPages: z.array(count(1023)).max(1024).refine(unique),
  }),
  z.strictObject({
    state: z.literal('reserved'),
    opId: uuid,
    intentHash: sha256,
    nextCursor: itemId.nullable(),
    tickets: z.array(PintaCausalBindingSchema).max(PINTA_CAUSAL_LIMITS.page),
  }),
  z.strictObject({ state: z.literal('committed'), result: PintaCausalResultSchema }),
  z.strictObject({ state: z.enum(['aborted', 'expired']), opId: uuid, intentHash: sha256 }),
])
export type PintaCausalStatus = z.infer<typeof PintaCausalStatusSchema>

/** The adoption ticket is bound to an existing revision and a server-owned fresh seal. */
export const PintaCausalBackfillBindingSchema = z.strictObject({
  namespace,
  itemId,
  revision: positiveRevision,
  nonce: uuid,
  baseEpoch: epoch,
  expiresAt: date,
})
export type PintaCausalBackfillBinding = z.infer<typeof PintaCausalBackfillBindingSchema>
export const PintaCausalBackfillAttestationSchema = z
  .strictObject({
    purpose: z.literal('pinta-backfill-content-v1'),
    binding: PintaCausalBackfillBindingSchema,
    sha256,
    manifest: PintaCausalManifestSchema,
  })
  .refine((p) => p.binding.itemId === p.manifest.itemId)
export type PintaCausalBackfillAttestation = z.infer<typeof PintaCausalBackfillAttestationSchema>

export const PintaCausalEntrySchema = z
  .strictObject({
    itemId,
    name,
    kind: z.string().min(1).max(40),
    revision: positiveRevision,
    formatVersion,
    layoutRevision: epoch.nullable(),
    sha256: sha256.nullable(),
    bytes: count(PINTA_CAUSAL_LIMITS.itemBytes).min(1),
    itemUpdatedAt: date,
    coverage: z.enum(['certified', 'unknown']),
  })
  .refine((r) => r.coverage !== 'certified' || r.sha256 !== null)
export type PintaCausalEntry = z.infer<typeof PintaCausalEntrySchema>
export const PintaCausalSnapshotPageSchema = z
  .strictObject({
    protocol: z.literal(1),
    epoch,
    requiredFormat: formatVersion,
    nextCursor: itemId.nullable(),
    entries: z.array(PintaCausalEntrySchema).max(PINTA_CAUSAL_LIMITS.page),
  })
  .refine(
    (p) =>
      p.entries.every((e, i) => i === 0 || p.entries[i - 1]!.itemId < e.itemId) &&
      (p.nextCursor === null || p.nextCursor === p.entries.at(-1)?.itemId),
  )
export type PintaCausalSnapshotPage = z.infer<typeof PintaCausalSnapshotPageSchema>

export type PintaCausalFailure =
  | 'epoch-changed'
  | 'stale-base'
  | 'layout-stale'
  | 'unknown-consumer'
  | 'missing-consumer'
  | 'unverified-content'
  | 'protocol-required'
  | 'operation-conflict'
  | 'operation-expired'
  | 'quota'
  | 'client-outdated'
  | 'account-deleting'
  | 'not-found'

/** Even after a compacted tombstone, a stale or repeatable PUT has no address for the sealed bytes. */
export function pintaCausalBlobKey(
  binding: PintaCausalBinding | PintaCausalBackfillBinding,
  stage: 'upload' | 'sealed',
): string {
  const owner = binding.namespace
  return `creations/${owner.audience === 'adult' ? 'adult/' : ''}${owner.userId}/pinta/${binding.itemId}/units/${binding.nonce}/${binding.revision}.${stage}.gz`
}
