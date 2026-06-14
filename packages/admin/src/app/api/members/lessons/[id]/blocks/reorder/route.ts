import { NextResponse } from 'next/server'
import { readOrderedIds } from '@/lib/query'
import { reorderBlocks } from '@/server/members'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const orderedIds = await readOrderedIds(req)
  if (!orderedIds) {
    return NextResponse.json(
      { error: { code: 'INVALID_INPUT', message: 'orderedIds inválido.' } },
      { status: 400 },
    )
  }
  const { status, body } = await reorderBlocks(id, orderedIds)
  return NextResponse.json(body, { status })
}
