import { createLiveProRuntimeBuild } from '@sistemazero/member-shell/routes/live-pro-runtime'
import { isAdminRole } from '@/lib/types'
import { gatewayFetch } from '@/server/gateway'
import { getSession } from '@/server/session'

export const POST = createLiveProRuntimeBuild({
  gatewayFetch,
  session: async () => {
    const user = await getSession()
    return user?.status === 'active' && isAdminRole(user.role) ? { readonly: false } : null
  },
})
