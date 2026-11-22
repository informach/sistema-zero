import { z } from 'zod'
import { PINTA_CAUSAL_LIMITS } from './pinta-causal'
import { PINTA_PALETTE_LIBRARY_ITEM_ID, PINTA_PALETTE_LIBRARY_TOOL } from './pinta-palette-library'
import { creationStorageKey } from './storage-keys'

/** Write negotiation is separate from both the palette document and the gallery format. */
export const PINTA_PALETTE_WRITE_PROTOCOL = 'palette-cas-v1'
const protocol = z.literal(PINTA_PALETTE_WRITE_PROTOCOL)
const revision = z.number().int().min(0).max(2_147_483_647)
const positiveRevision = revision.min(1)
const generation = z.uuid().nullable()
const nonce = z.uuid()
const sha256 = z.string().regex(/^[a-f0-9]{64}$/)
const isoDate = z.iso.datetime({ offset: true })
const bytes = z.number().int().positive().max(PINTA_CAUSAL_LIMITS.itemBytes)

export const PintaPaletteHeadSchema = z
  .strictObject({
    protocol,
    generation,
    revision,
    exists: z.boolean(),
    adopted: z.boolean(),
  })
  .refine(
    (head) =>
      (!head.adopted || head.generation !== null) &&
      (head.exists ? head.generation !== null && head.revision > 0 : head.revision === 0),
  )
export type PintaPaletteHead = z.infer<typeof PintaPaletteHeadSchema>

/** For the existing upload and delete bodies. A capable writer sends its observed generation. */
export const PintaPaletteBaseSchema = z.strictObject({
  protocol,
  baseGeneration: generation,
})
export type PintaPaletteBase = z.infer<typeof PintaPaletteBaseSchema>

/** Returned publicly with the ordinary revision and upload URL. */
export const PintaPaletteUploadCapabilitySchema = PintaPaletteBaseSchema.extend({
  nonce,
  expiresAt: isoDate,
})
export type PintaPaletteUploadCapability = z.infer<typeof PintaPaletteUploadCapabilitySchema>

/** Public confirmation proves which ticket the writer intends to commit. */
export const PintaPaletteCommitCapabilitySchema = z.strictObject({ protocol, nonce })
export type PintaPaletteCommitCapability = z.infer<typeof PintaPaletteCommitCapabilitySchema>

export const PintaPaletteBaseCommandSchema = PintaPaletteBaseSchema.extend({
  baseRevision: revision,
})
export const PintaPaletteReserveCommandSchema = PintaPaletteBaseCommandSchema.extend({
  bytes,
  itemUpdatedAt: isoDate,
})

/** Private Members → Member Shell ticket. The caller never chooses bytes, keys or the base at commit. */
export const PintaPaletteTicketSchema = PintaPaletteUploadCapabilitySchema.extend({
  bytes,
  baseRevision: revision,
  revision: positiveRevision,
  itemUpdatedAt: isoDate,
})
export type PintaPaletteTicket = z.infer<typeof PintaPaletteTicketSchema>

export const PintaPaletteTicketRequestSchema = PintaPaletteCommitCapabilitySchema.extend({
  revision: positiveRevision,
})

export const PintaPaletteCommitProofSchema = z.strictObject({
  ticket: PintaPaletteTicketSchema,
  sha256,
})
export type PintaPaletteCommitProof = z.infer<typeof PintaPaletteCommitProofSchema>

export type PintaPaletteActor = {
  userId: string
  audience: 'kids' | 'adult'
}

/** A legacy numbered PUT cannot address either object of a new palette write. */
export function pintaPaletteBlobKey(
  actor: PintaPaletteActor,
  ticket: Pick<PintaPaletteTicket, 'nonce' | 'revision'>,
  stage: 'upload' | 'sealed',
): string {
  const legacy = creationStorageKey(
    actor.userId,
    PINTA_PALETTE_LIBRARY_TOOL,
    PINTA_PALETTE_LIBRARY_ITEM_ID,
    ticket.revision,
    actor.audience,
  )
  return (
    legacy.slice(0, legacy.lastIndexOf('/') + 1) +
    'units/' +
    ticket.nonce +
    '/' +
    ticket.revision +
    '.' +
    stage +
    '.gz'
  )
}
