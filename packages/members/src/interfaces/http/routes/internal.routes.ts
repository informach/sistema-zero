import { Elysia } from 'elysia'
import type { AccessCheckService } from '../../../application/access-check/access-check.service'
import { assertInternalCaller } from '../auth'
import { AccessCheckBody } from '../dtos'

export interface InternalRoutesDeps {
  accessCheck: AccessCheckService
  /** Token interno (= INTERNAL_API_TOKEN). Exigido SEMPRE que setado (S2S, não passa pelo gateway). */
  internalToken?: string
}

/**
 * Rotas S2S internas (NÃO expostas no gateway). Hoje só o `access-check`, consumido
 * pela comunidade (`@sistemazero/hub`) direto na rede interna com o `x-internal-token`
 * (= `INTERNAL_API_TOKEN` do members). Prefixo `/members/internal`.
 */
export function internalRoutes(deps: InternalRoutesDeps) {
  return new Elysia({ prefix: '/members/internal' })
    .onBeforeHandle(({ headers }) =>
      assertInternalCaller(headers['x-internal-token'], deps.internalToken),
    )
    .post('/access-check', ({ body }) => deps.accessCheck.execute(body.userId, body.courseRefs), {
      body: AccessCheckBody,
    })
}
