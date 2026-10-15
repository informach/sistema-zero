import { isAdminRole } from '@/lib/types'
import { gatewayFetch } from '@/server/gateway'
import { createAdminLiveHandler } from '@/server/live-admin-proxy'
import { getSession } from '@/server/session'

const handler = createAdminLiveHandler({
  gatewayFetch,
  session: async () => {
    const user = await getSession()
    return user ? { active: user.status === 'active' && isAdminRole(user.role) } : null
  },
})
export const GET = handler
export const POST = handler
export const PATCH = handler
