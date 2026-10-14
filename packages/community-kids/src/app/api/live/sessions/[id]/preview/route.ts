import { isSupportSession } from '@sistemazero/member-shell/lib/act'
import { handleLivePreview } from '@sistemazero/member-shell/routes/live-preview'
import { shell } from '@/server/shell'

async function handle(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await shell.session.getSession()
  // Any support session (read-only or write) stays out of the live room, as in /api/live.
  if (!user || isSupportSession(user))
    return Response.json(
      { error: { message: 'Entre com uma sessão que permita criar.' } },
      { status: user ? 403 : 401 },
    )
  try {
    return await handleLivePreview(request, (await context.params).id, shell.gateway.gatewayFetch)
  } catch {
    return Response.json(
      { error: { message: 'Não foi possível preparar a prévia. Tente novamente.' } },
      { status: 503 },
    )
  }
}
export const POST = handle
export const DELETE = handle
