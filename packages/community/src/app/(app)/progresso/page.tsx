import { isReadonlyImpersonation } from '@sistemazero/member-shell/lib/act'
import { getSession } from '@/server/session'
import { shell } from '@/server/shell'
import { ProgressClient } from './progress-client'

export const dynamic = 'force-dynamic'

export default async function ProgressPage() {
  const [session, missions] = await Promise.all([
    getSession(),
    shell.members.getMissionsReadonly().catch(() => null),
  ])
  return (
    <ProgressClient
      readOnly={Boolean(session && isReadonlyImpersonation(session))}
      missions={
        missions?.status === 200 && missions.body?.audience === 'adult'
          ? (missions.body ?? null)
          : null
      }
    />
  )
}
