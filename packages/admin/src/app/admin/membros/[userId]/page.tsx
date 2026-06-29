import { getSession } from '@/server/session'
import { MemberDetailClient } from './member-detail-client'

export const dynamic = 'force-dynamic'

export default async function MembroDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>
}) {
  const { userId } = await params
  // O papel do operador guia o gating de UX (escrita = admin/superadmin; "Entrar como"
  // usa id+papel). A fonte da verdade dos guards é o gateway + members/auth (servidor).
  const session = await getSession()
  return (
    <MemberDetailClient
      userId={userId}
      currentUser={{ id: session?.id ?? '', role: session?.role ?? '' }}
    />
  )
}
