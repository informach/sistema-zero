import { forwardUpstream } from '@/server/forward'
import { gatewayFetch } from '@/server/gateway'

/** Traz o publicado de volta: sem `ids`, o rascunho inteiro; com a lista, só aquelas peças. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body: unknown = await request.json().catch(() => null)
  return forwardUpstream(
    await gatewayFetch(`/members/admin/lessons/${encodeURIComponent(id)}/draft/restore-published`, {
      method: 'POST',
      body,
    }),
  )
}
