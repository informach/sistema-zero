import { NextResponse } from 'next/server'
import { updateCoupon } from '@/server/catalog'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const json = await req.json().catch(() => null)
  const { status, body } = await updateCoupon(id, json)
  return NextResponse.json(body, { status })
}
