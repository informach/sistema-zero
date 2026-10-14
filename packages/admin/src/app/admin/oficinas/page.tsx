import { getSession } from '@/server/session'
import { LiveAdmin } from './workshops-admin'
export default async function WorkshopsAdminPage() {
  const user = await getSession()
  return (
    <LiveAdmin
      teacherId={user?.id ?? ''}
      teacherName={user?.firstName?.trim().split(/\s+/)[0] || user?.email?.split('@')[0] || ''}
      canWrite={user?.role === 'superadmin' || user?.role === 'admin'}
    />
  )
}
