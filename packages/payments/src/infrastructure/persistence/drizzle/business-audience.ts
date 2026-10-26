import { type AnyColumn, eq, isNull } from 'drizzle-orm'
import type { BusinessAudienceFilter } from '../../../domain/business-audience'

export function businessAudienceWhere(column: AnyColumn, audience?: BusinessAudienceFilter) {
  return audience === 'unassigned' ? isNull(column) : audience ? eq(column, audience) : undefined
}
