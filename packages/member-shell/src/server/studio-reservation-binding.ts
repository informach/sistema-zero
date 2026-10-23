import 'server-only'
import { createHash } from 'node:crypto'
import { canonicalJson } from '@sistemazero/core/creations'
import {
  type StudioReservationRetirement,
  StudioReservationRetirementSchema,
} from '@sistemazero/core/studio/publication-reservation'

export function studioReservationFingerprint(input: StudioReservationRetirement): string {
  return createHash('sha256')
    .update(canonicalJson(StudioReservationRetirementSchema.parse(input)))
    .digest('hex')
}
