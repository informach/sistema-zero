import { getSession } from '@/server/session'
import { MemberDetailClient } from './member-detail-client'

export const dynamic = 'force-dynamic'

export default async function MembroDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>
}) {
  const { userId } = await params
  // O papel do operador guia o gating de UX (escrita = admin/superadmin). A fonte da
  // verdade é o gateway + members (servidor).
  const session = await getSession()
  return <MemberDetailClient userId={userId} currentRole={session?.role ?? ''} />
}
