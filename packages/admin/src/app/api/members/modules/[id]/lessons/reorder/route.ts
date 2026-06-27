import { NextResponse } from 'next/server'
import { readOrderedIds } from '@/lib/query'
import { forwardUpstream } from '@/server/forward'
import { reorderLessons } from '@/server/members'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const orderedIds = await readOrderedIds(req)
  if (!orderedIds) {
    return NextResponse.json(
      { error: { code: 'INVALID_INPUT', message: 'orderedIds inválido.' } },
      { status: 400 },
    )
  }
  const { status, body } = await reorderLessons(id, orderedIds)
  return forwardUpstream({ status, body })
}
