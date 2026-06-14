import { NextResponse } from 'next/server'
import { threadAction } from '@/server/hub'

const ALLOWED = new Set(['approve', 'reject', 'hide', 'delete', 'pin', 'unpin', 'lock', 'unlock'])

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string; action: string }> },
) {
  const { id, action } = await ctx.params
  if (!ALLOWED.has(action)) {
    return NextResponse.json({ error: { code: 'INVALID_ACTION' } }, { status: 400 })
  }
  const { status, body } = await threadAction(id, action)
  return NextResponse.json(body, { status })
}
