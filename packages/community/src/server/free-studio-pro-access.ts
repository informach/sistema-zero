import { getCreativeToolsState } from '@/server/creative-tools'
export const authorizeFreeStudioPro = async () => {
  const state = await getCreativeToolsState()
  if (
    state.kind !== 'ready' ||
    !state.studioAvailable ||
    !state.tier.pro ||
    !state.showJavaScriptCreation
  )
    return Response.json(
      { error: { message: 'O Estúdio Pro não está liberado nesta sessão.' } },
      { status: 403 },
    )
  return { id: state.session.id }
}
