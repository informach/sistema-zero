import 'server-only'
import { isReadonlyImpersonation } from '@sistemazero/member-shell/lib/act'
import {
  adultStudioTier,
  canShowJavaScriptCreation,
  canShowPythonCreation,
} from '@sistemazero/member-shell/server/studio-unlocks'
import { cache } from 'react'
import { getSession } from './session'
import { shell } from './shell'

export const getCreativeToolsState = cache(async () => {
  const [session, access, progress, unlocks] = await Promise.all([
    getSession(),
    shell.members.checkCreativeToolsAccessReadonly().catch(() => null),
    shell.members.getGamificationReadonly({ withRanking: true }).catch(() => null),
    shell.members.getStudioUnlocksReadonly().catch(() => null),
  ])
  if (
    !session ||
    access?.status !== 200 ||
    !access.body ||
    progress?.status !== 200 ||
    !progress.body?.journey ||
    unlocks?.status !== 200 ||
    !unlocks.body
  )
    return { kind: 'unavailable' as const }
  if (isReadonlyImpersonation(session)) return { kind: 'readonly' as const }
  const tier = adultStudioTier(progress.body.journey, session.role, unlocks.body.blocks)
  return {
    kind: 'ready' as const,
    session,
    access: access.body.access,
    journey: progress.body.journey,
    tier,
    showPythonCreation: canShowPythonCreation(session.role, unlocks.body.blocks),
    showJavaScriptCreation: canShowJavaScriptCreation(session.role, unlocks.body.blocks),
    studioAvailable:
      access.body.access['estudio-completo'] === true && tier.freeStudio && tier.hasPalette,
  }
})
