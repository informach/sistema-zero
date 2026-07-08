import { redirect } from 'next/navigation'
import { listTeacherThreadsReadonly } from '@/server/members'
import { getSession } from '@/server/session'
import { RecadosClient } from './recados-client'

export const dynamic = 'force-dynamic'

/**
 * Caixa de entrada dos "Recados do professor" (canal de retorno). Server Component:
 * busca as conversas do aluno (readonly, sem refresh de cookie) e entrega ao client.
 */
export default async function RecadosPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  const res = await listTeacherThreadsReadonly()
  const threads = res.status === 200 ? (res.body?.threads ?? []) : []
  return <RecadosClient initialThreads={threads} />
}
