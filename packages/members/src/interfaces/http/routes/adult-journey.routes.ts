import { Elysia, t } from 'elysia'
import type { AdultJourneyService } from '../../../application/adult-journey/adult-journey.service'
import type { AdultProfileService } from '../../../application/profiles/adult-profile.service'
import {
  assertInternalCaller,
  isPrivilegedActor,
  requireAdmin,
  resolveAdultLearnerId,
} from '../auth'

export function adultJourneyRoutes(deps: {
  service: AdultJourneyService
  profiles: AdultProfileService
  internalToken?: string
  requireAdminEnabled: boolean
}) {
  return (
    new Elysia({ name: 'adult-journey' })
      .onTransform(({ headers }) =>
        assertInternalCaller(headers['x-internal-token'], deps.internalToken),
      )
      // S2S Hub -> members. No gateway route exposes this endpoint.
      .get(
        '/members/internal/adult-creator-state',
        async ({ query }) => {
          const [journey, identity] = await Promise.all([
            deps.service.get(query.userId),
            deps.profiles.read(query.userId),
          ])
          return {
            audience: 'adult' as const,
            capabilities: journey.capabilities,
            identity: { displayName: identity.displayName, publicEnabled: identity.publicEnabled },
          }
        },
        { query: t.Object({ userId: t.String({ format: 'uuid' }) }) },
      )
      .get('/members/journey/adult', ({ headers }) => {
        const userId = resolveAdultLearnerId(headers)
        return deps.service.get(userId, isPrivilegedActor(headers))
      })
      .get('/members/admin/journey/adult', ({ headers }) => {
        requireAdmin(headers, deps.requireAdminEnabled)
        return deps.service.policy()
      })
      .put(
        '/members/admin/journey/adult',
        ({ headers, body }) => {
          requireAdmin(headers, deps.requireAdminEnabled)
          return deps.service.configure(body.policy, body.expectedVersion)
        },
        {
          body: t.Object({
            expectedVersion: t.Integer({ minimum: 0, maximum: 2_147_483_646 }),
            policy: t.Unknown(),
          }),
        },
      )
  )
}
