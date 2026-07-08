import { redirect } from 'next/navigation'
import { getSession } from '@/server/session'
import { RecadoThreadClient } from './recado-thread-client'

export const dynamic = 'force-dynamic'

/**
 * Uma conversa com o professor. A carga + a resposta + o "marcar lido" são do CLIENT
 * (apiGet/apiSend nos shims) — evita escrita de cookie em Server Component e mantém a
 * troca de mensagens interativa.
 */
export default async function RecadoThreadPage({
  params,
}: {
  params: Promise<{ threadId: string }>
}) {
  const session = await getSession()
  if (!session) redirect('/login')
  const { threadId } = await params
  return <RecadoThreadClient threadId={threadId} />
}
