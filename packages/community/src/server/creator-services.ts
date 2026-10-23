import 'server-only'
import { getEnv } from '@sistemazero/member-shell/lib/env'
import { isVoiceInputConfigured } from '@sistemazero/member-shell/server/openrouter-transcribe'
import { cache } from 'react'
import { getCreativeToolsState } from './creative-tools'
import { shell } from './shell'
export const getAdultCreatorServices = cache(async () => {
  const state = await getCreativeToolsState()
  const enabled = state.kind === 'ready' && state.journey.capabilities.includes('ai')
  const [credits, preferences] = enabled
    ? await Promise.all([
        shell.members.getAiCreditsReadonly().catch(() => null),
        shell.members.getAdultProfileReadonly().catch(() => null),
      ])
    : [null, null]
  const voice =
    enabled &&
    state.kind === 'ready' &&
    !state.session.act &&
    preferences?.status === 200 &&
    preferences.body?.voiceEnabled === true
  return {
    zappyEnabled: enabled && state.kind === 'ready' && state.studioAvailable,
    aiCredits: credits?.status === 200 ? (credits.body ?? null) : null,
    voiceInputEnabled: Boolean(voice && isVoiceInputConfigured()),
    narrationEnabled: Boolean(voice && getEnv().ELEVENLABS_API_KEY),
  }
})
