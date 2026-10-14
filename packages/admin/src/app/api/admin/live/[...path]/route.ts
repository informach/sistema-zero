import { createLiveRouteHandler } from '@sistemazero/member-shell/routes/live'
import { isAdminRole } from '@/lib/types'
import { gatewayFetch } from '@/server/gateway'
import { getSession } from '@/server/session'

const handler = createLiveRouteHandler({
  scope: 'admin',
  gatewayFetch,
  session: async () => {
    const user = await getSession()
    return user?.status === 'active' && isAdminRole(user.role) ? { readonly: false } : null
  },
})
export const GET = handler
export const POST = handler
export const PATCH = handler
