import { z } from 'zod'
import { PintaCausalViewerSchema } from './pinta-causal'
import {
  STUDIO_SEALED_STORAGE_PROTOCOL,
  StudioSealedPartRefSchema,
  StudioSealedReceiptSchema,
  StudioSealedRequirementsSchema,
} from './studio-sealed-storage'

const protocol = z.literal(STUDIO_SEALED_STORAGE_PROTOCOL)
const itemId = z.string().regex(/^[A-Za-z0-9_-]{1,64}$/)
const revision = z.number().int().min(0).max(2_147_483_647)
const bytes = z
  .number()
  .int()
  .positive()
  .max(40 * 1024 * 1024)
const hash = z.string().regex(/^[a-f0-9]{64}$/)
const isoDate = z.iso.datetime({ offset: true })
const scope = PintaCausalViewerSchema.extend({ itemId })

export const StudioSealedHeadSchema = z
  .strictObject({
    protocol,
    generation: z.uuid().nullable(),
    revision,
    exists: z.boolean(),
    adopted: z.boolean(),
  })
  .refine((head) =>
    head.exists
      ? head.generation !== null && head.revision > 0
      : head.revision === 0 && (!head.adopted || head.generation !== null),
  )

export type StudioSealedHead = z.infer<typeof StudioSealedHeadSchema>

export const StudioSealedBaseSchema = z.strictObject({
  protocol,
  baseGeneration: z.uuid().nullable(),
})
export type StudioSealedBase = z.infer<typeof StudioSealedBaseSchema>

export const StudioSealedBaseCommandSchema = StudioSealedBaseSchema.extend({
  itemId,
  baseRevision: revision,
})

const requestedPart = z
  .strictObject({
    hash,
    bytes: bytes.optional(),
    upload: z.literal(true).optional(),
  })
  .refine((part) => !part.upload || part.bytes !== undefined)

function uniqueHashes(parts: readonly { hash: string }[]) {
  return new Set(parts.map((part) => part.hash)).size === parts.length
}

export const StudioSealedReserveSchema = StudioSealedBaseCommandSchema.extend({
  name: z.string().trim().min(1).max(120),
  kind: z.enum(['classic', 'pro']),
  bytes,
  requirements: StudioSealedRequirementsSchema,
  itemUpdatedAt: isoDate,
  thumb: z.string().max(12_000).nullable(),
  parts: z.array(requestedPart).max(128).refine(uniqueHashes),
})

const layout = z.strictObject({ hash, bytes })
export const StudioSealedPlannedPartSchema = z.discriminatedUnion('source', [
  layout.extend({ source: z.literal('upload') }),
  layout.extend({ source: z.literal('legacy'), rev: revision.min(1) }),
  StudioSealedPartRefSchema.extend({ source: z.literal('sealed') }),
])
export type StudioSealedPlannedPart = z.infer<typeof StudioSealedPlannedPartSchema>

export const StudioSealedUploadCapabilitySchema = StudioSealedBaseSchema.extend({
  nonce: z.uuid(),
  expiresAt: isoDate,
})

export const StudioSealedTicketSchema = StudioSealedUploadCapabilitySchema.extend({
  scope,
  baseRevision: revision,
  revision: revision.min(1),
  itemUpdatedAt: isoDate,
  bytes,
  name: z.string().min(1).max(120),
  kind: z.enum(['classic', 'pro']),
  requirements: StudioSealedRequirementsSchema,
  parts: z.array(StudioSealedPlannedPartSchema).max(128).refine(uniqueHashes),
}).refine(
  (ticket) =>
    ticket.revision > ticket.baseRevision &&
    ticket.bytes + ticket.parts.reduce((sum, part) => sum + part.bytes, 0) <= 40 * 1024 * 1024,
)
export type StudioSealedTicket = z.infer<typeof StudioSealedTicketSchema>

export const StudioSealedConfirmationSchema = z.strictObject({ protocol, nonce: z.uuid() })
export const StudioSealedTicketRequestSchema = StudioSealedConfirmationSchema.extend({
  itemId,
  revision: revision.min(1),
})

export const StudioSealedCommitProofSchema = z.strictObject({
  ticket: StudioSealedTicketSchema,
  receipt: StudioSealedReceiptSchema,
  parts: StudioSealedPartRefSchema.array().max(128).refine(uniqueHashes),
})
export type StudioSealedCommitProof = z.infer<typeof StudioSealedCommitProofSchema>

/** Shared reply validation: a transport acknowledgment must name the committed revision. */
export const StudioSealedCommitResultSchema = z
  .object({
    studioHead: StudioSealedHeadSchema,
    studioSealReceipt: StudioSealedReceiptSchema,
    item: z.object({
      itemId,
      revision: revision.min(1),
      kind: z.enum(['classic', 'pro']),
      formatVersion: StudioSealedRequirementsSchema.shape.projectFormat,
      itemUpdatedAt: isoDate,
    }),
  })
  .refine(
    ({ studioHead, studioSealReceipt, item }) =>
      studioHead.exists &&
      studioHead.adopted &&
      studioHead.revision === item.revision &&
      studioSealReceipt.requirements.projectFormat === item.formatVersion,
  )

export type StudioSealedCommitResult = z.infer<typeof StudioSealedCommitResultSchema>
export const StudioSealedHeadResultSchema = z.object({ studioHead: StudioSealedHeadSchema })
export const StudioSealedTicketResultSchema = z.discriminatedUnion('committed', [
  StudioSealedCommitResultSchema.safeExtend({ committed: z.literal(true) }),
  z.strictObject({ committed: z.literal(false), ticket: StudioSealedTicketSchema }),
])
export const StudioSealedDeleteResultSchema = z.object({
  deleted: z.boolean(),
  revision,
  studioHead: StudioSealedHeadSchema,
})
