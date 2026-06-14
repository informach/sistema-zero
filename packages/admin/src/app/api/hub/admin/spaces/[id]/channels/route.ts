import { NextResponse } from 'next/server'
import { createChannel } from '@/server/hub'

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const json = await req.json().catch(() => null)
  const { status, body } = await createChannel((await ctx.params).id, json)
  return NextResponse.json(body, { status })
}
