import { forwardUpstream } from '@/server/forward'
import { cancelSubscription, getSubscription } from '@/server/payments'

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { status, body } = await getSubscription(
    id,
    new URL(req.url).searchParams.get('audience') ?? undefined,
  )
  return forwardUpstream({ status, body })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { status, body } = await cancelSubscription(id)
  return forwardUpstream({ status, body })
}
