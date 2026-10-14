import { Elysia, t } from 'elysia'
import type { LiveMaterialsService } from '../../../application/live/live-materials.service'
import { assertInternalCaller, assertMemberShellConsumer } from '../auth'

/** Only the authenticated upload BFF can attest a stored object. JWT callers cannot register keys. */
export function liveMaterialsRoutes(deps: {
  materials: LiveMaterialsService
  internalToken?: string
}) {
  return new Elysia({ name: 'live-materials' })
    .onBeforeHandle(({ headers, set }) => {
      assertInternalCaller(headers['x-internal-token'], deps.internalToken)
      assertMemberShellConsumer(headers['x-auth-consumer-id'])
      set.headers['cache-control'] = 'private, no-store'
    })
    .post('/members/internal/live/materials', ({ body }) => deps.materials.register(body), {
      body: t.Object({
        id: t.String({ format: 'uuid' }),
        title: t.String({ minLength: 1, maxLength: 200 }),
        fileName: t.String({ minLength: 1, maxLength: 120 }),
        storageKey: t.String({ minLength: 1, maxLength: 200 }),
        contentType: t.String({ minLength: 1, maxLength: 120 }),
        sizeBytes: t.Integer({ minimum: 1, maximum: 8 * 1024 * 1024 }),
        sha256: t.String({ pattern: '^[a-f0-9]{64}$' }),
        uploadedBy: t.String({ format: 'uuid' }),
      }),
    })
}
