import { isReadonlyImpersonation } from '@sistemazero/member-shell/lib/act'
import { kidsJourneyAccess } from '@sistemazero/member-shell/lib/kids-journey-access'
import { createFreeProToolchainPreparation } from '@sistemazero/member-shell/server/free-pro-toolchain'
import { checkCreativeToolsAccessReadonly, getGamificationReadonly } from '@/server/members'
import { getSession } from '@/server/session'
import { resolveStudioProAccess } from '@/server/studio-pro-access'
export const runtime = 'nodejs'
export const POST = createFreeProToolchainPreparation(async () => {
  const [session, access, progress] = await Promise.all([
    getSession(),
    checkCreativeToolsAccessReadonly(),
    getGamificationReadonly({ withRanking: true }),
  ])
  if (
    access.status !== 200 ||
    progress.status !== 200 ||
    isReadonlyImpersonation(session) ||
    !resolveStudioProAccess({
      session,
      studioAccess: access.body?.access?.['estudio-completo'] === true,
      journey: kidsJourneyAccess(progress.body),
    }).allowed
  )
    return Response.json(
      { error: { message: 'O Estúdio Pro não está liberado nesta sessão.' } },
      { status: 403 },
    )
  return { id: session!.id }
})
