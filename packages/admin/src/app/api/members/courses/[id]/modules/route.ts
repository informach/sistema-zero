import { NextResponse } from 'next/server'
import { createModule } from '@/server/members'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const json = await req.json().catch(() => null)
  const { status, body } = await createModule(id, json)
  return NextResponse.json(body, { status })
}
