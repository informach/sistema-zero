import { NextResponse } from 'next/server'
import { getPayment } from '@/server/payments'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { status, body } = await getPayment(id)
  return NextResponse.json(body, { status })
}
