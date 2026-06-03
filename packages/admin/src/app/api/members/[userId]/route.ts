import { NextResponse } from 'next/server'
import type { MemberDetail } from '@/lib/types'
import { getMember } from '@/server/members'
import { getUser } from '@/server/users'

/** Detalhe do membro: matrículas + progresso (members) + identidade (auth), em paralelo. */
export async function GET(_req: Request, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params
  const [detail, identity] = await Promise.all([getMember(userId), getUser(userId)])

  if (detail.status !== 200 || !detail.body) {
    return NextResponse.json(detail.body, { status: detail.status })
  }

  const user = identity.status === 200 ? (identity.body?.user ?? null) : null
  const merged: MemberDetail = { ...detail.body, user }
  return NextResponse.json(merged, { status: 200 })
}
