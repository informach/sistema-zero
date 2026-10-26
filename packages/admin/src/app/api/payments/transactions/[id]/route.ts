import { forwardUpstream } from '@/server/forward'
import { getPaymentWithGuarantee } from '@/server/payments'

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { status, body } = await getPaymentWithGuarantee(
    id,
    new URL(req.url).searchParams.get('audience') ?? undefined,
  )
  return forwardUpstream({ status, body })
}
