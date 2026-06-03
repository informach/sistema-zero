import { NextResponse } from 'next/server'
import { cancelSubscription, getSubscription } from '@/server/payments'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { status, body } = await getSubscription(id)
  return NextResponse.json(body, { status })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { status, body } = await cancelSubscription(id)
  return NextResponse.json(body, { status })
}
