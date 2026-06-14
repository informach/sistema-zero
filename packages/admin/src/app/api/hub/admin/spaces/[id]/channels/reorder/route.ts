import { NextResponse } from 'next/server'
import { readOrderedIds } from '@/lib/query'
import { reorderChannels } from '@/server/hub'

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const orderedIds = await readOrderedIds(req)
  if (!orderedIds) {
    return NextResponse.json(
      { error: { code: 'INVALID_INPUT', message: 'orderedIds inválido.' } },
      { status: 400 },
    )
  }
  const { status, body } = await reorderChannels((await ctx.params).id, orderedIds)
  return NextResponse.json(body, { status })
}
