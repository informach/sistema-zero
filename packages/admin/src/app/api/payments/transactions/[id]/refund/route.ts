import { NextResponse } from 'next/server'
import { refundPayment } from '@/server/payments'

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { status, body } = await refundPayment(id)
  return NextResponse.json(body, { status })
}
