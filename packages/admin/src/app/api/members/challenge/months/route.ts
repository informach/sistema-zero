import { listChallengeMonths } from '@/server/challenge'
import { forwardUpstream } from '@/server/forward'

/** Janela do Desafio do mês (corrente + 11) → `GET /members/admin/challenge/months`. */
export async function GET() {
  const { status, body } = await listChallengeMonths()
  return forwardUpstream({ status, body })
}
