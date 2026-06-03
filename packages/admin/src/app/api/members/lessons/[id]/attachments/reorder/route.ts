import { NextResponse } from 'next/server'
import { reorderAttachments } from '@/server/members'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const json = await req.json().catch(() => ({}))
  const { status, body } = await reorderAttachments(id, json?.orderedIds ?? [])
  return NextResponse.json(body, { status })
}
