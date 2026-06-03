import { NextResponse } from 'next/server'
import { createCourse, listCourses } from '@/server/members'

function num(value: string | null): number | undefined {
  if (!value) return undefined
  const n = Number(value)
  return Number.isFinite(n) ? n : undefined
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const { status, body } = await listCourses({
    q: searchParams.get('q') ?? undefined,
    status: searchParams.get('status') ?? undefined,
    limit: num(searchParams.get('limit')),
    offset: num(searchParams.get('offset')),
  })
  return NextResponse.json(body, { status })
}

export async function POST(req: Request) {
  const json = await req.json().catch(() => null)
  const { status, body } = await createCourse(json)
  return NextResponse.json(body, { status })
}
