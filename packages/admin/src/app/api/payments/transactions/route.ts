import { NextResponse } from 'next/server'
import { listPaymentsWithGuarantee } from '@/server/payments'

function num(value: string | null): number | undefined {
  if (!value) return undefined
  const n = Number(value)
  return Number.isInteger(n) && n >= 0 ? n : undefined
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const { status, body } = await listPaymentsWithGuarantee({
    q: searchParams.get('q') ?? undefined,
    status: searchParams.get('status') ?? undefined,
    method: searchParams.get('method') ?? undefined,
    consumerId: searchParams.get('consumerId') ?? undefined,
    from: searchParams.get('from') ?? undefined,
    to: searchParams.get('to') ?? undefined,
    limit: num(searchParams.get('limit')),
    offset: num(searchParams.get('offset')),
  })
  return NextResponse.json(body, { status })
}
