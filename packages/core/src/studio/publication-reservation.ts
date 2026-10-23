import { z } from 'zod'
import { isStudioPublicationId } from './project-format'

const IdentityUuidSchema = z.string().refine(isStudioPublicationId)

const audience = z.enum(['kids', 'adult'])
export const StudioReservationContextSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('free'), audience }),
  z.strictObject({
    kind: z.literal('lesson'),
    lessonId: IdentityUuidSchema,
    blockId: IdentityUuidSchema,
  }),
  z.strictObject({
    kind: z.literal('live'),
    workspaceId: IdentityUuidSchema,
    revision: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  }),
])
export type StudioReservationContext = z.infer<typeof StudioReservationContextSchema>

/** A committed retirement of a new reservation, never inferred from an absent post or timeout. */
export const StudioReservationRetirementSchema = z
  .strictObject({
    version: z.literal(1),
    deliveryId: z.string().max(100),
    reservationId: IdentityUuidSchema,
    playId: IdentityUuidSchema,
    authorId: IdentityUuidSchema,
    accountId: IdentityUuidSchema,
    audience,
    snapshotHash: z.string().regex(/^[a-f0-9]{64}$/),
    context: StudioReservationContextSchema,
  })
  .superRefine((value, context) => {
    if (value.deliveryId !== `studio-reservation-cleanup:${value.reservationId}`)
      context.addIssue({
        code: 'custom',
        path: ['deliveryId'],
        message: 'Entrega divergente da reserva.',
      })
    if (value.context.kind === 'free' && value.context.audience !== value.audience)
      context.addIssue({
        code: 'custom',
        path: ['context'],
        message: 'Audiência divergente da reserva.',
      })
    if (value.audience === 'adult' && value.authorId !== value.accountId)
      context.addIssue({
        code: 'custom',
        path: ['authorId'],
        message: 'Autor adulto divergente da conta.',
      })
  })
export type StudioReservationRetirement = z.infer<typeof StudioReservationRetirementSchema>
