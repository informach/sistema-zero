import { getProduct, updateProduct } from '@/server/catalog'
import { forwardUpstream } from '@/server/forward'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { status, body } = await getProduct(id)
  return forwardUpstream({ status, body })
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const json = await req.json().catch(() => null)
  const { status, body } = await updateProduct(id, json)
  return forwardUpstream({ status, body })
}
