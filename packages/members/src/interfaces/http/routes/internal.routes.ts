import { Elysia } from 'elysia'
import type { AccessCheckService } from '../../../application/access-check/access-check.service'
import type { GetProfileAllowanceService } from '../../../application/profile-allowance/get-profile-allowance.service'
import { assertInternalCaller } from '../auth'
import { AccessCheckBody, ProfileAllowanceQuery } from '../dtos'

export interface InternalRoutesDeps {
  accessCheck: AccessCheckService
  /** Teto de perfis (kids) da conta — consumido pelo `auth` ao criar perfil. */
  profileAllowance: GetProfileAllowanceService
  /** Token interno (= INTERNAL_API_TOKEN). Exigido SEMPRE que setado (S2S, não passa pelo gateway). */
  internalToken?: string
}

/**
 * Rotas S2S internas (NÃO expostas no gateway). Consumidas direto na rede interna
 * com o `x-internal-token` (= `INTERNAL_API_TOKEN` do members): o `access-check`
 * pela comunidade (`@sistemazero/hub`) e o `profile-allowance` pelo `auth` (limite
 * de perfis kids). Prefixo `/members/internal`.
 */
export function internalRoutes(deps: InternalRoutesDeps) {
  return new Elysia({ prefix: '/members/internal' })
    .onTransform(({ headers }) =>
      assertInternalCaller(headers['x-internal-token'], deps.internalToken),
    )
    .post('/access-check', ({ body }) => deps.accessCheck.execute(body.userId, body.courseRefs), {
      body: AccessCheckBody,
    })
    .get('/profile-allowance', ({ query }) => deps.profileAllowance.execute(query.accountId), {
      query: ProfileAllowanceQuery,
    })
}
