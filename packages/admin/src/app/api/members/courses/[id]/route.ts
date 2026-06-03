import { NextResponse } from 'next/server'
import { deleteCourse, getCourse, updateCourse } from '@/server/members'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params
  const { status, body } = await getCourse(id)
  return NextResponse.json(body, { status })
}

export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params
  const json = await req.json().catch(() => null)
  const { status, body } = await updateCourse(id, json)
  return NextResponse.json(body, { status })
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params
  const { status, body } = await deleteCourse(id)
  return NextResponse.json(body, { status })
}
