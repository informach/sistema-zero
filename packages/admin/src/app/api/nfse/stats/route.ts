import { NextResponse } from 'next/server'
import { getFiscalStats } from '@/server/nfse'

export async function GET() {
  const { status, body } = await getFiscalStats()
  return NextResponse.json(body, { status })
}
