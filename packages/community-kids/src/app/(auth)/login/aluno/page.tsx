import { safeStudyDestination } from '@sistemazero/member-shell/lib/study-access'
import { StudentEntry } from '@/components/kids/student-entry'
import { shell } from '@/server/shell'

export const dynamic = 'force-dynamic'
export default async function StudentLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const device = await shell.study.recognize()
  return (
    <StudentEntry
      profiles={device.body.profiles}
      unavailable={device.status !== 200}
      destination={safeStudyDestination((await searchParams).next ?? null)}
    />
  )
}
