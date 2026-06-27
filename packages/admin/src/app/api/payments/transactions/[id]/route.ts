import { forwardUpstream } from '@/server/forward'
import { getPaymentWithGuarantee } from '@/server/payments'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { status, body } = await getPaymentWithGuarantee(id)
  return forwardUpstream({ status, body })
}
