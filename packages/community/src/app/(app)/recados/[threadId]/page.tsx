import { redirect } from 'next/navigation'
import { getSession } from '@/server/session'
import { RecadoThreadClient } from './recado-thread-client'

export const dynamic = 'force-dynamic'

export default async function RecadoThreadPage({
  params,
}: {
  params: Promise<{ threadId: string }>
}) {
  if (!(await getSession())) redirect('/login')
  const { threadId } = await params
  return <RecadoThreadClient threadId={threadId} />
}
