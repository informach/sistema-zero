import { hasKidsCapability, isKidsStaffPreview, type KidsJourneyAccess } from '@sistemazero/member-shell/lib/kids-journey-access'

interface StudioProSession {
  role: string
  activeProfile?: unknown
}

export type StudioProAccessDecision =
  | { allowed: true }
  | {
      allowed: false
      code: 'PROFILE_SESSION_REQUIRED' | 'STUDIO_ACCESS_REQUIRED' | 'STUDIO_PRO_TIER_REQUIRED' | 'JOURNEY_UNAVAILABLE'
    }

/**
 * A autorização do modo Código precisa ser igual para a página e para a API.
 * O proxy só torna a navegação mais amigável; uma Route Handler é uma fronteira
 * pública e não pode depender do redirecionamento de seleção de perfil.
 */
export function resolveStudioProAccess({
  session,
  studioAccess,
  journey,
}: {
  session: StudioProSession | null
  studioAccess: boolean
  journey: KidsJourneyAccess | null
}): StudioProAccessDecision {
  const preview = journey !== null && isKidsStaffPreview(journey)
  if (!session || (preview ? Boolean(session.activeProfile) : !session.activeProfile))
    return { allowed: false, code: 'PROFILE_SESSION_REQUIRED' }
  if (!studioAccess) return { allowed: false, code: 'STUDIO_ACCESS_REQUIRED' }
  if (!journey) return { allowed: false, code: 'JOURNEY_UNAVAILABLE' }
  if (!hasKidsCapability(journey, 'studio') || !hasKidsCapability(journey, 'pro')) {
    return { allowed: false, code: 'STUDIO_PRO_TIER_REQUIRED' }
  }
  return { allowed: true }
}
