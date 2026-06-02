import { NextResponse } from 'next/server'
import { updateProduct } from '@/server/catalog'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const json = await req.json().catch(() => null)
  const { status, body } = await updateProduct(id, json)
  return NextResponse.json(body, { status })
}
