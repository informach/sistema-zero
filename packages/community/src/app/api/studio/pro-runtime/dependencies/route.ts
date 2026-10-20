import { createFreeProToolchainPreparation } from '@sistemazero/member-shell/server/free-pro-toolchain'
import { getCreativeToolsState } from '@/server/creative-tools'
export const runtime = 'nodejs'
export const POST = createFreeProToolchainPreparation(async () => {
  const state = await getCreativeToolsState()
  if (state.kind !== 'ready' || !state.studioAvailable || !state.tier.pro)
    return Response.json(
      { error: { message: 'O Estúdio Pro não está liberado nesta sessão.' } },
      { status: 403 },
    )
  return { id: state.session.id }
})
