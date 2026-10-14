import { LiveClassroom } from '@sistemazero/member-shell/components/live/live-classroom'
export default async function TeacherLiveLessonPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  return <LiveClassroom sessionId={(await params).id} teacher />
}
