import { NextResponse } from 'next/server'
import { parseLimit, parseOffset } from '@/lib/list-params'
import { forwardUpstream } from '@/server/forward'
import { listPending } from '@/server/hub'
import { hydratePendingItems } from '@/server/hub-moderation'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const { status, body } = await listPending({
    spaceId: searchParams.get('spaceId') ?? undefined,
    limit: parseLimit(searchParams.get('limit')),
    offset: parseOffset(searchParams.get('offset')),
  })
  if (status !== 200) return forwardUpstream({ status, body })
  if (!body || !Array.isArray(body.items)) {
    return NextResponse.json(
      { error: { code: 'UPSTREAM_ERROR', message: 'Não foi possível carregar a moderação.' } },
      { status: 502 },
    )
  }
  return NextResponse.json({ ...body, items: await hydratePendingItems(body.items) })
}
