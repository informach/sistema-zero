import { forwardUpstream } from '@/server/forward'
import { gatewayFetch } from '@/server/gateway'

/** O que está PUBLICADO agora, no formato do rascunho — o painel "Comparar com a versão publicada". */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return forwardUpstream(
    await gatewayFetch(`/members/admin/lessons/${encodeURIComponent(id)}/draft/published`),
  )
}
