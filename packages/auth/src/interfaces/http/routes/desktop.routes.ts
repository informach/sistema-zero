import { UnauthorizedError } from '@sistemazero/core/http'
import { Elysia, t } from 'elysia'
import type { DesktopSessionService } from '../../../application/desktop/desktop-session.service'
import type { TokenIssuer } from '../../../domain/ports/token-issuer.port'
import { extractBearer } from '../auth'

const code = t.String({ minLength: 8, maxLength: 20, pattern: '^[A-Fa-f0-9 -]+$' })
const credentialBody = t.Object(
  { credential: t.String({ pattern: '^[A-Za-z0-9_-]{43}$' }) },
  { additionalProperties: false },
)
export function desktopRoutes(deps: { service: DesktopSessionService; tokenIssuer: TokenIssuer }) {
  async function claims(header?: string) {
    const token = extractBearer(header)
    const claims = token ? await deps.tokenIssuer.verifyAccessToken(token) : null
    if (!claims) throw new UnauthorizedError('Entre na sua conta para continuar')
    return claims
  }
  return new Elysia({ prefix: '/auth/desktop' })
    .post('/pairings', ({ body }) => deps.service.start(body), {
      body: t.Object(
        {
          label: t.String({ minLength: 2, maxLength: 80 }),
          challenge: t.String({ pattern: '^[A-Za-z0-9_-]{43}$' }),
        },
        { additionalProperties: false },
      ),
    })
    .post(
      '/pairings/describe',
      async ({ body, headers }) =>
        deps.service.describe(await claims(headers.authorization), body.code),
      { body: t.Object({ code }, { additionalProperties: false }) },
    )
    .post(
      '/pairings/approve',
      async ({ body, headers }) =>
        deps.service.approve(await claims(headers.authorization), body.code),
      { body: t.Object({ code }, { additionalProperties: false }) },
    )
    .post('/pairings/exchange', ({ body }) => deps.service.exchange(body), {
      body: t.Object(
        {
          deviceCode: t.String({ pattern: '^[A-Za-z0-9_-]{43}$' }),
          verifier: t.String({ minLength: 43, maxLength: 128, pattern: '^[A-Za-z0-9._~-]+$' }),
        },
        { additionalProperties: false },
      ),
    })
    .post('/session/validate', async ({ headers }) => {
      const value = await claims(headers.authorization)
      if (!value.desktop) throw new UnauthorizedError('Sessão desktop inválida')
      return { valid: true, userId: value.sub, deviceId: value.desktop.deviceId }
    })
    .post('/session/access', ({ body }) => deps.service.access(body.credential), {
      body: credentialBody,
    })
    .post('/session/disconnect', ({ body }) => deps.service.disconnect(body.credential), {
      body: credentialBody,
    })
    .get('/devices', async ({ headers }) => deps.service.list(await claims(headers.authorization)))
    .delete(
      '/devices/:id',
      async ({ headers, params }) =>
        deps.service.revoke(await claims(headers.authorization), params.id),
      { params: t.Object({ id: t.String({ format: 'uuid' }) }) },
    )
}
