import { forwardUpstream } from '@/server/forward'
import { restoreStudioSubmissionPrevious } from '@/server/members'

type Ctx = { params: Promise<{ blockId: string; userId: string }> }

/**
 * Restaura a versão anterior da entrega (TROCA atual↔anterior — reversível). É o
 * undo do professor para o reenvio acidental do template por cima da entrega boa.
 */
export async function POST(_req: Request, { params }: Ctx) {
  const { blockId, userId } = await params
  const { status, body } = await restoreStudioSubmissionPrevious(blockId, userId)
  return forwardUpstream({ status, body })
}
