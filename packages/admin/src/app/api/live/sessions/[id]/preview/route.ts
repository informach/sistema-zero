import { handleLivePreview } from '@sistemazero/member-shell/routes/live-preview'
import { isAdminRole } from '@/lib/types'
import { gatewayFetch } from '@/server/gateway'
import { getSession } from '@/server/session'

async function handle(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getSession()
  if (user?.status !== 'active' || !isAdminRole(user.role))
    return Response.json(
      { error: { message: 'Entre com a sessão da professora.' } },
      { status: user ? 403 : 401 },
    )
  try {
    return await handleLivePreview(request, (await context.params).id, gatewayFetch)
  } catch {
    return Response.json(
      { error: { message: 'Não foi possível preparar a prévia. Tente novamente.' } },
      { status: 503 },
    )
  }
}
export const POST = handle
export const DELETE = handle
