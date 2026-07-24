import { redirect } from 'next/navigation'
import { listTeacherThreadsReadonly } from '@/server/members'
import { getSession } from '@/server/session'
import { RecadosClient } from './recados-client'

export const dynamic = 'force-dynamic'

/** Caixa de entrada adulta do canal professor↔aluno. */
export default async function RecadosPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  const result = await listTeacherThreadsReadonly()
  return (
    <RecadosClient
      initialThreads={result.status === 200 ? (result.body?.threads ?? []) : []}
      initialNextOffset={result.status === 200 ? (result.body?.nextOffset ?? null) : null}
    />
  )
}
