import { ForbiddenError } from '@sistemazero/core/http'
import { Elysia, t } from 'elysia'
import type { AdultProfileService } from '../../../application/profiles/adult-profile.service'
import { assertInternalCaller, resolveAdultLearnerId } from '../auth'

export function adultProfileRoutes(deps: { service: AdultProfileService; internalToken?: string }) {
  return new Elysia({ name: 'adult-profile' })
    .onTransform(({ headers }) =>
      assertInternalCaller(headers['x-internal-token'], deps.internalToken),
    )
    .get('/members/adult/profile', ({ headers }) =>
      deps.service.read(resolveAdultLearnerId(headers)),
    )
    .put(
      '/members/adult/profile',
      ({ headers, body }) => deps.service.save(resolveAdultLearnerId(headers), body),
      {
        body: t.Object(
          {
            displayName: t.String({ minLength: 1, maxLength: 60 }),
            publicEnabled: t.Boolean(),
            voiceEnabled: t.Boolean(),
          },
          { additionalProperties: false },
        ),
      },
    )
    .get(
      '/members/adult/profiles/public-identities',
      async ({ query, headers }) => {
        resolveAdultLearnerId(headers)
        const ids = query.ids.split(',')
        if (
          ids.length > 100 ||
          ids.some((id) => !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(id))
        )
          throw new ForbiddenError('Lista inválida.')
        // Only opted-in public identities are returned, never account details.
        return { identities: await deps.service.publicIdentities(ids) }
      },
      { query: t.Object({ ids: t.String({ minLength: 1, maxLength: 3699 }) }) },
    )
}
