import { NextResponse } from 'next/server'
import { updateUser } from '@/server/users'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const json = await req.json().catch(() => null)
  const { status, body } = await updateUser(id, json)
  return NextResponse.json(body, { status })
}
