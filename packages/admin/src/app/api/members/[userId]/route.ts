import { NextResponse } from 'next/server'
import { composeMemberDetail } from '@/lib/member-detail-bff'
import { forwardUpstream } from '@/server/forward'
import { getMember } from '@/server/members'
import { getUser, getUserProfiles } from '@/server/users'

/**
 * Detalhe do membro: matrículas + progresso (members) + identidade (auth) +, quando
 * a conta tem perfis (estilo Netflix), o **progresso POR PERFIL**. O painel busca os
 * perfis no auth, pede ao members o progresso de cada um sobre os cursos da família,
 * e junta nome (auth) + progresso (members).
 */
export async function GET(_req: Request, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params
  const [identity, profilesRes] = await Promise.all([getUser(userId), getUserProfiles(userId)])
  const result = await composeMemberDetail(userId, identity, profilesRes, getMember)
  if (result.status !== 200) return forwardUpstream(result)
  return NextResponse.json(result.body, { status: 200 })
}
