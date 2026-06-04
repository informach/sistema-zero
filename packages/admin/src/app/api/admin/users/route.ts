import { NextResponse } from 'next/server'
import { createUser, listUsers } from '@/server/users'

function num(value: string | null): number | undefined {
  if (!value) return undefined
  const n = Number(value)
  return Number.isFinite(n) ? n : undefined
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const { status, body } = await listUsers({
    q: searchParams.get('q') ?? undefined,
    role: searchParams.get('role') ?? undefined,
    status: searchParams.get('status') ?? undefined,
    limit: num(searchParams.get('limit')),
    offset: num(searchParams.get('offset')),
  })
  return NextResponse.json(body, { status })
}

export async function POST(req: Request) {
  const json = await req.json().catch(() => null)
  const { status, body } = await createUser(json)
  return NextResponse.json(body, { status })
}
