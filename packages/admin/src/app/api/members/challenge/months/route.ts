import { challengeAudience, listChallengeMonths } from '@/server/challenge'
import { forwardUpstream } from '@/server/forward'

/** Janela do Desafio do mês (corrente + 11) → `GET /members/admin/challenge/months`. */
export async function GET(req: Request) {
  const { status, body } = await listChallengeMonths(challengeAudience(req))
  return forwardUpstream({ status, body })
}
