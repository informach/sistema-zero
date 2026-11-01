import { getEnv } from '@/lib/env'
import { getSession } from '@/server/session'
import { CoursesClient } from './courses-client'

export const dynamic = 'force-dynamic'

export default async function CursosPage() {
  const session = await getSession()
  return (
    <CoursesClient
      currentRole={session?.role ?? ''}
      showCoursePromotion={getEnv().COURSE_PUBLICATION_ENVIRONMENT === 'staging'}
    />
  )
}
