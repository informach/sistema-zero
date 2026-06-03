import { NextResponse } from 'next/server'
import { getLessonContent } from '@/server/members'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { status, body } = await getLessonContent(id)
  return NextResponse.json(body, { status })
}
