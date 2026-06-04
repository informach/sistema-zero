import { NextResponse } from 'next/server'
import { getProduct, updateProduct } from '@/server/catalog'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { status, body } = await getProduct(id)
  return NextResponse.json(body, { status })
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const json = await req.json().catch(() => null)
  const { status, body } = await updateProduct(id, json)
  return NextResponse.json(body, { status })
}
