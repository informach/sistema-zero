import { forwardUpstream } from '@/server/forward'
import { getTeacherThreadByContext } from '@/server/members'

/**
 * Conversa da Entrega/Mural por CONTEXTO (o professor abre o histórico direto do
 * viewer). `{ thread: null }` = ainda não há conversa. O members valida a query.
 */
export async function GET(req: Request) {
  const url = new URL(req.url)
  const { status, body } = await getTeacherThreadByContext({
    userId: url.searchParams.get('userId') ?? '',
    contextType: url.searchParams.get('contextType') ?? '',
    contextRef: url.searchParams.get('contextRef') ?? '',
    before: url.searchParams.get('before') ?? undefined,
  })
  return forwardUpstream({ status, body })
}
