import { forwardUpstream } from '@/server/forward'
import { createBlock } from '@/server/members'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const json = await req.json().catch(() => null)
  const { status, body } = await createBlock(id, json)
  return forwardUpstream({ status, body })
}
