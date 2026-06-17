import { NextResponse } from 'next/server'
import type { MemberDetail, MemberProfileProgress } from '@/lib/types'
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
  const accountProfiles = profilesRes.status === 200 ? (profilesRes.body?.profiles ?? []) : []

  const detail = await getMember(
    userId,
    accountProfiles.map((p) => p.id),
  )
  if (detail.status !== 200 || !detail.body) {
    // Normaliza erro fora do envelope `{ error }` (como faz a lista) p/ a UI não
    // cair no genérico "Algo deu errado." (achado do review).
    const envelope = detail.body as { error?: { code?: string; message?: string } } | null
    const normalized = envelope?.error?.message
      ? detail.body
      : { error: { code: 'UPSTREAM_ERROR', message: 'Não foi possível carregar o membro.' } }
    return NextResponse.json(normalized, { status: detail.status === 200 ? 502 : detail.status })
  }

  const user = identity.status === 200 ? (identity.body?.user ?? null) : null
  const progressById = new Map(
    (detail.body.profilesProgress ?? []).map((pp) => [pp.userId, pp.progress]),
  )
  const profiles: MemberProfileProgress[] = accountProfiles.map((p) => ({
    id: p.id,
    name: p.name,
    avatarUrl: p.avatarUrl,
    progress: progressById.get(p.id) ?? [],
  }))

  const merged: MemberDetail = {
    userId: detail.body.userId,
    entitlements: detail.body.entitlements,
    progress: detail.body.progress,
    user,
    ...(profiles.length > 0 ? { profiles } : {}),
  }
  return NextResponse.json(merged, { status: 200 })
}
