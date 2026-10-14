import { redirect } from 'next/navigation'
import { isAdminRole } from '@/lib/types'
import { getSession } from '@/server/session'
import { DemonstrationGate } from './demonstration-gate'

/** Outside /admin: no roster, messages, sidebar or child identity can enter the captured tab. */
export default async function DemonstrationPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSession()
  if (user?.status !== 'active' || !isAdminRole(user.role)) redirect('/login')
  return <DemonstrationGate sessionId={(await params).id} />
}
