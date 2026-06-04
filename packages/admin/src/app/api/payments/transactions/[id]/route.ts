import { NextResponse } from 'next/server'
import { getPaymentWithGuarantee } from '@/server/payments'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { status, body } = await getPaymentWithGuarantee(id)
  return NextResponse.json(body, { status })
}
