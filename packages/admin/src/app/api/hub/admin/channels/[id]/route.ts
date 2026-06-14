import { NextResponse } from 'next/server'
import { deleteChannel, updateChannel } from '@/server/hub'

type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(req: Request, ctx: Ctx) {
  const json = await req.json().catch(() => null)
  const { status, body } = await updateChannel((await ctx.params).id, json)
  return NextResponse.json(body, { status })
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const { status, body } = await deleteChannel((await ctx.params).id)
  return NextResponse.json(body, { status })
}
