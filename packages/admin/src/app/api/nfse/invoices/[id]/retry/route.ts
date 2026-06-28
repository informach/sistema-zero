import { forwardUpstream } from '@/server/forward'
import { retryInvoice } from '@/server/nfse'

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { status, body } = await retryInvoice(id)
  return forwardUpstream({ status, body })
}
