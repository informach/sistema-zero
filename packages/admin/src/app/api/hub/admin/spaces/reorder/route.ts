import { NextResponse } from 'next/server'
import { forwardUpstream } from '@/server/forward'
import { reorderSpaces } from '@/server/hub'

export async function POST(req: Request) {
  const json = (await req.json().catch(() => null)) as {
    audience?: unknown
    orderedIds?: unknown
  } | null
  const audience = json?.audience === 'kids' ? 'kids' : 'adult'
  const ids = json?.orderedIds
  if (!Array.isArray(ids) || !ids.every((x): x is string => typeof x === 'string')) {
    return NextResponse.json(
      { error: { code: 'INVALID_INPUT', message: 'orderedIds inválido.' } },
      { status: 400 },
    )
  }
  const { status, body } = await reorderSpaces({ audience, orderedIds: ids })
  return forwardUpstream({ status, body })
}
