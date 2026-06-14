import { NextResponse } from 'next/server'
import { listMutesBans } from '@/server/hub'

export async function GET(req: Request) {
  const spaceId = new URL(req.url).searchParams.get('spaceId') ?? ''
  const { status, body } = await listMutesBans(spaceId)
  return NextResponse.json(body, { status })
}
