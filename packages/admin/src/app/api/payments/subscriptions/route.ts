import { NextResponse } from 'next/server'
import { listSubscriptions } from '@/server/payments'

function num(value: string | null): number | undefined {
  if (!value) return undefined
  const n = Number(value)
  return Number.isFinite(n) ? n : undefined
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const { status, body } = await listSubscriptions({
    q: searchParams.get('q') ?? undefined,
    status: searchParams.get('status') ?? undefined,
    consumerId: searchParams.get('consumerId') ?? undefined,
    limit: num(searchParams.get('limit')),
    offset: num(searchParams.get('offset')),
  })
  return NextResponse.json(body, { status })
}
