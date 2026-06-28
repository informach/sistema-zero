import { forwardUpstream } from '@/server/forward'
import { emitInvoiceNow } from '@/server/nfse'

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { status, body } = await emitInvoiceNow(id)
  return forwardUpstream({ status, body })
}
