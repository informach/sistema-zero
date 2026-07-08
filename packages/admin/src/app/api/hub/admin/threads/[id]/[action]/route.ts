import { NextResponse } from 'next/server'
import { forwardUpstream } from '@/server/forward'
import { threadAction } from '@/server/hub'

const ALLOWED = new Set(['approve', 'reject', 'hide', 'delete', 'pin', 'unpin', 'lock', 'unlock'])

export async function POST(req: Request, ctx: { params: Promise<{ id: string; action: string }> }) {
  const { id, action } = await ctx.params
  if (!ALLOWED.has(action)) {
    return NextResponse.json({ error: { code: 'INVALID_ACTION' } }, { status: 400 })
  }
  // `hide`/`reject` podem carregar um `reason` OPCIONAL (recado ao aluno no Mural kids).
  const raw = await req.json().catch(() => null)
  const reason =
    raw && typeof (raw as { reason?: unknown }).reason === 'string'
      ? (raw as { reason: string }).reason.trim().slice(0, 1000) || undefined
      : undefined
  const { status, body } = await threadAction(id, action, reason)
  return forwardUpstream({ status, body })
}
