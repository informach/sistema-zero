import { IdentityUuidSchema } from '@sistemazero/core/identity'
import { z } from 'zod'
import { MAX_PROFILE_COHORT_PAGE } from '../ports/profile-cohort-repository.port'

const uuid = IdentityUuidSchema
export const ProfileCohortQuerySchema = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal('start'),
    limit: z.number().int().min(1).max(MAX_PROFILE_COHORT_PAGE),
  }),
  z
    .strictObject({
      kind: z.literal('continue'),
      upperBound: uuid,
      cursor: uuid.nullable(),
      limit: z.number().int().min(1).max(MAX_PROFILE_COHORT_PAGE),
    })
    .refine(
      (query) => query.cursor === null || query.cursor <= query.upperBound,
      'Cursor exceeds the captured UUID bound',
    ),
])
