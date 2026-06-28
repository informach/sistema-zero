import { forwardUpstream } from '@/server/forward'
import { cancelSubscription, getSubscription } from '@/server/payments'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { status, body } = await getSubscription(id)
  return forwardUpstream({ status, body })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { status, body } = await cancelSubscription(id)
  return forwardUpstream({ status, body })
}
