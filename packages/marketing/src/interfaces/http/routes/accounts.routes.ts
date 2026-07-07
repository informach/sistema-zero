import { Elysia } from 'elysia'
import type { AccountService } from '../../../application/accounts/account.service'
import { assertInternalCaller, requireStaff } from '../auth'
import { IdParams } from '../dtos'

export interface AccountsRoutesDeps {
  accounts: AccountService
  internalToken?: string
  requireStaffEnabled: boolean
}

/**
 * Contas sociais conectadas. Leitura é staff+ (alimenta a tela Conexões E o
 * toggle auto/lembrete do composer); DELETE é admin+ NO GATEWAY (rota
 * marketing-accounts-write com audit) — aqui staff+ é defesa em profundidade.
 */
export function accountsRoutes(deps: AccountsRoutesDeps) {
  return new Elysia()
    .onBeforeHandle(({ headers }) => {
      assertInternalCaller(headers['x-internal-token'], deps.internalToken)
      requireStaff(headers, deps.requireStaffEnabled)
    })
    .get('/marketing/accounts', () => deps.accounts.list())
    .delete('/marketing/accounts/:id', ({ params }) => deps.accounts.disconnect(params.id), {
      params: IdParams,
    })
}
