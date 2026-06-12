import { NextResponse } from 'next/server'
import { getInvoice } from '@/server/nfse'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { status, body } = await getInvoice(id)
  return NextResponse.json(body, { status })
}
