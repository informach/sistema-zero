import 'server-only'
import { PINTA_INVENTORY_READER_VERSION } from '@sistemazero/core/creations'
import {
  PINTA_CAUSAL_LIMITS,
  PintaCausalBackfillBindingSchema,
  PintaCausalBindingSchema,
  PintaCausalEntrySchema,
  PintaCausalMemberSchema,
  type PintaCausalOperation,
  PintaCausalOperationSchema,
  PintaCausalStatusSchema,
} from '@sistemazero/core/creations/pinta-causal'
import { z } from 'zod'

export const causalItem = z.string().regex(/^[A-Za-z0-9_-]{1,64}$/)
export const causalEpoch = z.string().regex(/^(0|[1-9][0-9]{0,18})$/)
export const causalReader = z.number().int().min(1).max(PINTA_INVENTORY_READER_VERSION)
export const causalRevision = z.number().int().min(1).max(2_147_483_647)

export const PintaCausalActorSchema = z.strictObject({
  userId: z.uuid(),
  accountId: z.uuid(),
  audience: z.enum(['kids', 'adult']),
})
export type PintaCausalActor = z.infer<typeof PintaCausalActorSchema>

export const PintaCausalStatusReply = z.strictObject({
  status: PintaCausalStatusSchema,
  uploadBytes: z.record(causalItem, z.number().int().min(1).max(PINTA_CAUSAL_LIMITS.itemBytes)),
})

const storageRef = z.string().min(1).max(512)
export const PinnedPintaEntry = z.strictObject({ entry: PintaCausalEntrySchema, storageRef })
export const PintaBackfillPlan = PinnedPintaEntry.extend({
  binding: PintaCausalBackfillBindingSchema,
})

const remapOperation = z.custom<Extract<PintaCausalOperation, { type: 'remap' }>>((input) => {
  const value = PintaCausalOperationSchema.safeParse(input)
  return value.success && value.data.type === 'remap'
})
const hash = z.string().regex(/^[0-9a-f]{64}$/)

export const PintaMemberPlan = z
  .strictObject({
    member: PintaCausalMemberSchema,
    binding: PintaCausalBindingSchema,
    baseStorageRef: storageRef.nullable(),
    baseEntry: PintaCausalEntrySchema.nullable(),
    remapSheetIds: z.array(causalItem).max(PINTA_CAUSAL_LIMITS.members),
    remaps: z
      .array(z.strictObject({ sheetId: causalItem, operation: remapOperation }))
      .max(PINTA_CAUSAL_LIMITS.members),
    inverseOf: z.uuid().optional(),
    inverse: z
      .strictObject({
        baseRevision: causalRevision,
        baseSha256: hash,
        restoredSha256: hash,
      })
      .nullable()
      .optional(),
  })
  .refine(
    ({ member, binding, baseStorageRef, baseEntry, remapSheetIds, remaps }) =>
      member.itemId === binding.itemId &&
      member.baseRevision === binding.baseRevision &&
      (member.action === 'put' ? member.sha256 : null) === binding.candidateSha256 &&
      new Set(remapSheetIds).size === remapSheetIds.length &&
      remapSheetIds.length === remaps.length &&
      remapSheetIds.every((id, index) => id === remaps[index]?.sheetId) &&
      (member.baseRevision === 0
        ? baseEntry === null && baseStorageRef === null && binding.baseSha256 === null
        : baseEntry !== null &&
          baseStorageRef !== null &&
          baseEntry.revision === member.baseRevision &&
          baseEntry.itemId === member.itemId &&
          baseEntry.sha256 === binding.baseSha256),
  )
export type PintaMemberPlan = z.infer<typeof PintaMemberPlan>

type Namespace = z.infer<typeof PintaCausalBindingSchema>['namespace']

export function belongsToPintaActor(namespace: Namespace, actor: PintaCausalActor): boolean {
  return namespace.userId === actor.userId && namespace.audience === actor.audience
}
