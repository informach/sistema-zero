import { clearChallengeMonth, setChallengeMonth } from '@/server/challenge'
import { forwardUpstream } from '@/server/forward'

type Params = { params: Promise<{ month: string }> }

/** Define o tema do mês → `PUT /members/admin/challenge/months/:month`. */
export async function PUT(req: Request, { params }: Params) {
  const { month } = await params
  const json = await req.json().catch(() => null)
  const { status, body } = await setChallengeMonth(month, json)
  return forwardUpstream({ status, body })
}

/** Volta o mês ao sorteio → `DELETE /members/admin/challenge/months/:month`. */
export async function DELETE(_req: Request, { params }: Params) {
  const { month } = await params
  const { status, body } = await clearChallengeMonth(month)
  return forwardUpstream({ status, body })
}
