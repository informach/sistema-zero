import { redirect } from 'next/navigation'
import { getSession } from '@/server/session'
import { WorkbenchClient } from './workbench-client'

export default async function WorkbenchPage() {
  const user = await getSession()
  if (!user) redirect('/login?next=/bancada')
  return <WorkbenchClient userId={user.id} />
}
