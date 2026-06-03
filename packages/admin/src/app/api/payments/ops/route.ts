import { NextResponse } from 'next/server'
import { getPaymentsOps } from '@/server/payments'

export async function GET() {
  const { status, body } = await getPaymentsOps()
  return NextResponse.json(body, { status })
}
