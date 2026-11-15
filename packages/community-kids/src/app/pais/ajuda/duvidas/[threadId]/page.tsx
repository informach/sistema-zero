import { redirect } from 'next/navigation'
import { getSession } from '@/server/session'
import { ParentDoubtThread } from './parent-doubt-thread'

export const dynamic = 'force-dynamic'

/**
 * Uma dúvida mandada de dentro de uma aula dos cursos para pais (14/11/2026): a conversa com a
 * nossa equipe, na Ajuda da área dos pais. Os Recados da criança ficam na área dela.
 */
export default async function ParentDoubtPage({
  params,
}: {
  params: Promise<{ threadId: string }>
}) {
  const session = await getSession()
  if (session?.kids?.kind !== 'parent') redirect('/login/responsavel')
  const { threadId } = await params
  return <ParentDoubtThread parentName={session.firstName} threadId={threadId} />
}
