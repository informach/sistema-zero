// Shim: a implementação vive no @sistemazero/member-shell (compartilhada com o
// community-kids), amarrada à sessão deste app via `shell.ts`.
import { shell } from './shell'

export type { CallOpts, GatewayResponse } from '@sistemazero/member-shell/server/gateway'
export { clientForwardHeaders } from '@sistemazero/member-shell/server/gateway'

export const {
  tryRefresh,
  gatewayFetch,
  gatewayFetchReadonly,
  loginRequest,
  verifyOtpRequest,
  exchangeImpersonation,
  logoutRequest,
} = shell.gateway
