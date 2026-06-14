import { NextResponse } from 'next/server'
import { listReports } from '@/server/hub'

function num(value: string | null): number | undefined {
  if (!value) return undefined
  const n = Number(value)
  return Number.isInteger(n) && n >= 0 ? n : undefined
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const { status, body } = await listReports({
    spaceId: searchParams.get('spaceId') ?? undefined,
    status: searchParams.get('status') ?? undefined,
    limit: num(searchParams.get('limit')),
    offset: num(searchParams.get('offset')),
  })
  return NextResponse.json(body, { status })
}
