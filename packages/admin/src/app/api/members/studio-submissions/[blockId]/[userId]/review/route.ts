import { forwardUpstream } from '@/server/forward'
import { reviewStudioSubmission } from '@/server/members'

type Ctx = { params: Promise<{ blockId: string; userId: string }> }

/**
 * "Já conferi esta entrega" (e o desfazer). É a saída da fila de pendentes para
 * a entrega SEM recado do aluno — sem isto, o professor só fecha respondendo uma
 * conversa que nem existe.
 */
export async function POST(req: Request, { params }: Ctx) {
  const { blockId, userId } = await params
  const json = (await req.json().catch(() => null)) as { reviewed?: unknown } | null
  const { status, body } = await reviewStudioSubmission(blockId, userId, json?.reviewed !== false)
  return forwardUpstream({ status, body })
}
