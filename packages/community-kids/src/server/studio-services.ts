import 'server-only'

import { isVoiceInputConfigured } from '@sistemazero/member-shell/server/openrouter-transcribe'
import { isStudioZappyAllowed } from '@sistemazero/member-shell/server/zappy-access'
import { getEnv } from '../lib/env'
import { checkChallengeAccessReadonly, getAiCreditsReadonly, getChallengeReadonly } from './members'
import type { getSession } from './session'
import { shell } from './shell'

/** Start optional reads alongside the access gate; consume only after access is confirmed. */
export function prepareStudioServices() {
  const challenge = getChallengeReadonly().catch(() => null)
  const challengeAccess = checkChallengeAccessReadonly().catch(() => null)
  const credits = getAiCreditsReadonly().catch(() => null)
  return async (session: Awaited<ReturnType<typeof getSession>>, levelSlug: string | undefined) => {
    const zappyEnabled = isStudioZappyAllowed(session, levelSlug)
    const [access, creditsResult, voiceProfile] = await Promise.all([
      challengeAccess,
      zappyEnabled ? credits : null,
      zappyEnabled && session?.kids?.kind === 'student' && !session.act && isVoiceInputConfigured()
        ? shell.auth.getMyProfileReadonly().catch(() => null)
        : null,
    ])
    const challengeResult =
      access?.status === 200 &&
      access.body?.access?.['clube-dos-criadores'] === true &&
      access.body?.access?.['estudio-completo'] === true
        ? await challenge
        : null
    const profile = voiceProfile?.status === 200 ? voiceProfile.body?.profile : null
    return {
      zappyEnabled,
      aiCredits: creditsResult?.status === 200 ? (creditsResult.body ?? null) : null,
      narrationEnabled: Boolean(getEnv().ELEVENLABS_API_KEY),
      voiceInputEnabled: profile?.id === session?.id && profile?.voiceInputEnabled === true,
      challenge:
        challengeResult?.status === 200 && challengeResult.body
          ? { key: challengeResult.body.challenge.key, title: challengeResult.body.challenge.title }
          : null,
    }
  }
}
