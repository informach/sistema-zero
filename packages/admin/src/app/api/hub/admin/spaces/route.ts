import { NextResponse } from 'next/server'
import { createSpace, listSpaces } from '@/server/hub'

function num(value: string | null): number | undefined {
  if (!value) return undefined
  const n = Number(value)
  return Number.isInteger(n) && n >= 0 ? n : undefined
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const { status, body } = await listSpaces({
    q: searchParams.get('q') ?? undefined,
    audience: searchParams.get('audience') ?? undefined,
    status: searchParams.get('status') ?? undefined,
    limit: num(searchParams.get('limit')),
    offset: num(searchParams.get('offset')),
  })
  return NextResponse.json(body, { status })
}

export async function POST(req: Request) {
  const json = await req.json().catch(() => null)
  const { status, body } = await createSpace(json)
  return NextResponse.json(body, { status })
}
