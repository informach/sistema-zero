import { Elysia, t } from 'elysia'
import type { BrowserSessionService } from '../../../application/browser/browser-session.service'

const credential = t.String({ pattern: '^[A-Za-z0-9_-]{43}$' })
export function browserRoutes(service: BrowserSessionService) {
  return new Elysia({ prefix: '/auth/browser/session' })
    .onBeforeHandle(({ set }) => {
      set.headers['cache-control'] = 'private, no-store'
    })
    .post('/exchange', ({ body }) => service.exchange(body.refreshToken), {
      body: t.Object({ refreshToken: credential }, { additionalProperties: false }),
    })
    .post('/access', ({ body }) => service.access(body.credential), {
      body: t.Object({ credential }, { additionalProperties: false }),
    })
    .post('/disconnect', ({ body }) => service.disconnect(body.credential), {
      body: t.Object({ credential }, { additionalProperties: false }),
    })
}
