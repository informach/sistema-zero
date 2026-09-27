import { NextResponse } from 'next/server'
import { forwardUpstream } from '@/server/forward'
import { gatewayFetch } from '@/server/gateway'

type Context = { params: Promise<{ path?: string[] }> }
const uuid = '[0-9a-f-]{36}'
async function forward(req: Request, context: Context) {
  const { path = [] } = await context.params
  const suffix = path.join('/')
  const allowed =
    req.method === 'GET'
      ? new RegExp(`^(|recipients|${uuid})$`, 'i').test(suffix)
      : new RegExp(`^(|${uuid}/(confirm|retry))$`, 'i').test(suffix)
  if (!allowed) return NextResponse.json({ error: { message: 'Rota inválida.' } }, { status: 404 })
  const url = new URL(req.url)
  const target = suffix === 'recipients' ? 'recipients' : `broadcasts${suffix ? `/${suffix}` : ''}`
  const body = req.method === 'POST' && !suffix ? await req.json().catch(() => null) : undefined
  return forwardUpstream(
    await gatewayFetch(`/members/admin/teacher-threads/${target}`, {
      method: req.method as 'GET' | 'POST',
      body,
      query: {
        q: url.searchParams.get('q') ?? undefined,
        offset: url.searchParams.get('offset') ?? undefined,
      },
    }),
  )
}
export const GET = forward
export const POST = forward
