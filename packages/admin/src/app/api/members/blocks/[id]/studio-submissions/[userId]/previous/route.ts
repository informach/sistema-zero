import { forwardUpstream } from '@/server/forward'
import { getStudioSubmissionPrevious } from '@/server/members'

type Ctx = { params: Promise<{ id: string; userId: string }> }

/**
 * A versão ANTERIOR da entrega (backup do último reenvio) — o professor baixa/
 * inspeciona antes de restaurar. 404 quando nunca houve reenvio.
 */
export async function GET(_req: Request, { params }: Ctx) {
  const { id, userId } = await params
  const { status, body } = await getStudioSubmissionPrevious(id, userId)
  return forwardUpstream({ status, body })
}
