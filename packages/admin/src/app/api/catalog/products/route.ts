import { NextResponse } from 'next/server'
import { createProduct, listProducts } from '@/server/catalog'

function num(value: string | null): number | undefined {
  if (!value) return undefined
  const n = Number(value)
  return Number.isInteger(n) && n >= 0 ? n : undefined
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const { status, body } = await listProducts({
    q: searchParams.get('q') ?? undefined,
    status: searchParams.get('status') ?? undefined,
    limit: num(searchParams.get('limit')),
    offset: num(searchParams.get('offset')),
  })
  return NextResponse.json(body, { status })
}

export async function POST(req: Request) {
  const json = await req.json().catch(() => null)
  const { status, body } = await createProduct(json)
  return NextResponse.json(body, { status })
}
