import { Elysia, t } from 'elysia'
import type { LiveLearningService } from '../../../application/live/live-learning.service'
import { assertInternalCaller, assertNoLiveSupportWrite } from '../auth'
import { LearningAttemptBody, LearningProgressBody } from '../learning.dtos'
import { resolveLiveActor } from './live.routes'

const params = t.Object({ id: t.String({ format: 'uuid' }), blockId: t.String({ format: 'uuid' }) })
// Live plans use immutable UUID block revisions; recorded lessons use content hashes.
const liveProgressBody = t.Object({
  ...LearningProgressBody.properties,
  revision: t.String({ format: 'uuid' }),
})
const liveAttemptBody = t.Object({
  ...LearningAttemptBody.properties,
  revision: t.String({ format: 'uuid' }),
})
export function liveLearningRoutes(deps: {
  learning: LiveLearningService
  internalToken?: string
}) {
  return new Elysia({ name: 'live-learning', prefix: '/members/live/sessions' })
    .onTransform(({ headers, set }) => {
      assertInternalCaller(headers['x-internal-token'], deps.internalToken)
      set.headers['cache-control'] = 'private, no-store'
    })
    .onBeforeHandle(({ headers, request }) => assertNoLiveSupportWrite(headers, request.method))
    .get(
      '/:id/learning-preview',
      ({ headers, params }) => deps.learning.preview(resolveLiveActor(headers), params.id),
      { params: t.Object({ id: t.String({ format: 'uuid' }) }) },
    )
    .get(
      '/:id/learning-progress',
      ({ headers, params }) => deps.learning.read(resolveLiveActor(headers), params.id),
      { params: t.Object({ id: t.String({ format: 'uuid' }) }) },
    )
    .post(
      '/:id/blocks/:blockId/learning-progress',
      ({ headers, params, body }) =>
        deps.learning.save(resolveLiveActor(headers), params.id, params.blockId, body),
      { params, body: liveProgressBody },
    )
    .post(
      '/:id/blocks/:blockId/learning-attempts',
      ({ headers, params, body }) =>
        deps.learning.attempt(resolveLiveActor(headers), params.id, params.blockId, body),
      { params, body: liveAttemptBody },
    )
}
