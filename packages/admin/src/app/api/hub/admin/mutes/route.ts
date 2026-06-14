import { NextResponse } from 'next/server'
import { createMuteBan } from '@/server/hub'

export async function POST(req: Request) {
  const json = await req.json().catch(() => null)
  const { status, body } = await createMuteBan('mute', json)
  return NextResponse.json(body, { status })
}
