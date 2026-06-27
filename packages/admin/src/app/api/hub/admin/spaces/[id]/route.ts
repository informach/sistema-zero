import { forwardUpstream } from '@/server/forward'
import { deleteSpace, getSpace, updateSpace } from '@/server/hub'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_req: Request, ctx: Ctx) {
  const { status, body } = await getSpace((await ctx.params).id)
  return forwardUpstream({ status, body })
}

export async function PATCH(req: Request, ctx: Ctx) {
  const json = await req.json().catch(() => null)
  const { status, body } = await updateSpace((await ctx.params).id, json)
  return forwardUpstream({ status, body })
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const { status, body } = await deleteSpace((await ctx.params).id)
  return forwardUpstream({ status, body })
}
