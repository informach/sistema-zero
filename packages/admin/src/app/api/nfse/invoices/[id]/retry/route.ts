import { NextResponse } from 'next/server'
import { retryInvoice } from '@/server/nfse'

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { status, body } = await retryInvoice(id)
  return NextResponse.json(body, { status })
}
