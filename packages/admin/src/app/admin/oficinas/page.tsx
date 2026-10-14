import { getSession } from '@/server/session'
import { LiveAdmin } from './workshops-admin'
export default async function WorkshopsAdminPage() {
  const user = await getSession()
  return (
    <LiveAdmin
      teacherId={user?.id ?? ''}
      canWrite={user?.role === 'superadmin' || user?.role === 'admin'}
    />
  )
}
