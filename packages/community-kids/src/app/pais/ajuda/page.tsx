import { redirect } from 'next/navigation'
import { listTeacherThreadsReadonly } from '@/server/members'
import { getSession } from '@/server/session'
import { HelpContent } from './help-content'

export const dynamic = 'force-dynamic'

export default async function AjudaPage() {
  const session = await getSession()
  if (session?.kids?.kind !== 'parent') redirect('/login/responsavel')
  // As dúvidas mandadas pelo "Preciso de ajuda" dos cursos para pais (14/11/2026): best-effort.
  const threads = await listTeacherThreadsReadonly().catch(() => null)
  const doubts =
    threads?.status === 200
      ? (threads.body?.threads ?? []).filter((thread) => thread.contextType === 'lesson_section')
      : []
  return <HelpContent parentName={session.firstName} doubts={doubts} />
}
