import { UnauthorizedError } from '@sistemazero/core/http'
import { Elysia } from 'elysia'
import type { KidsJourneyQueryService } from '../../../application/kids-journey/kids-journey-query.service'
import { assertInternalCaller, resolveKidsStaffPreviewActor } from '../auth'

/** Team metadata only. Never mounted as a child state, award endpoint or privilege-granting flag. */
export function kidsJourneyStaffPreviewRoutes(deps: {
  query: Pick<KidsJourneyQueryService, 'staffPreview'>
  internalToken: string | undefined
}) {
  return new Elysia({ name: 'kids-journey-staff-preview' }).get(
    '/members/journey/kids/staff-preview',
    ({ headers, set }) => {
      if (!deps.internalToken) throw new UnauthorizedError('Origem de prévia não configurada')
      assertInternalCaller(headers['x-internal-token'], deps.internalToken)
      resolveKidsStaffPreviewActor(headers)
      set.headers['cache-control'] = 'private, no-store'
      return deps.query.staffPreview()
    },
  )
}
