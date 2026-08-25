import { composeMemberToolUsage } from '@/lib/member-tool-usage-bff'
import { forwardUpstream } from '@/server/forward'
import { getMemberToolUsage } from '@/server/members'
import { getUserProfiles } from '@/server/users'

/**
 * Uso das ferramentas por aprendiz da família (cartões da ficha). Os `profileIds`
 * são resolvidos AQUI, no servidor, a partir do auth — nunca confiamos numa lista
 * vinda do client (mesma régua do detalhe do membro).
 */
export async function GET(_req: Request, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params
  const profilesRes = await getUserProfiles(userId)
  const usage = await composeMemberToolUsage(userId, profilesRes, getMemberToolUsage)
  return forwardUpstream(usage)
}
