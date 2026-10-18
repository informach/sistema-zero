import 'server-only'
import { AdultProfilePreferencesSchema } from '@sistemazero/core/profiles'
import { NextResponse } from 'next/server'
import { isReadonlyImpersonation } from '../lib/act'
import { learnerIdentity } from '../lib/learner-identity'
import type { GatewayModule } from '../server/gateway'
import type { SessionModule } from '../server/session'

export function createAdultProfileRoutes({
  session,
  gateway,
}: {
  session: SessionModule
  gateway: GatewayModule
}) {
  async function guard(write: boolean, request?: Request) {
    const user = await session.getSession()
    if (session.audience !== 'adult' || !user || !learnerIdentity(user, 'adult'))
      return NextResponse.json({ error: { code: 'UNAUTHORIZED' } }, { status: 401 })
    if (write && isReadonlyImpersonation(user))
      return NextResponse.json({ error: { code: 'IMPERSONATION_READONLY' } }, { status: 403 })
    if (write && request?.headers.get('x-sz-viewer') !== user.id)
      return NextResponse.json({ error: { code: 'SESSION_CHANGED' } }, { status: 409 })
    return null
  }
  return {
    adultProfile: {
      GET: async () => {
        const denied = await guard(false)
        if (denied) return denied
        const result = await gateway.gatewayFetch('/members/adult/profile')
        return NextResponse.json(result.body, { status: result.status })
      },
      PUT: async (request: Request) => {
        const denied = await guard(true, request)
        if (denied) return denied
        const parsed = AdultProfilePreferencesSchema.safeParse(
          await request.json().catch(() => null),
        )
        if (!parsed.success)
          return NextResponse.json({ error: { code: 'VALIDATION_ERROR' } }, { status: 400 })
        const result = await gateway.gatewayFetch('/members/adult/profile', {
          method: 'PUT',
          body: parsed.data,
        })
        return NextResponse.json(result.body, { status: result.status })
      },
    },
  }
}
