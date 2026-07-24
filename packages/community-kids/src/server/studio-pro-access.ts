import { resolveStudioTier } from '@sistemazero/member-shell/lib/studio-tier'

interface StudioProSession {
  role: string
  activeProfile?: unknown
}

export type StudioProAccessDecision =
  | { allowed: true }
  | {
      allowed: false
      code: 'PROFILE_SESSION_REQUIRED' | 'STUDIO_ACCESS_REQUIRED' | 'STUDIO_PRO_TIER_REQUIRED'
    }

/**
 * A autorização do modo Código precisa ser igual para a página e para a API.
 * O proxy só torna a navegação mais amigável; uma Route Handler é uma fronteira
 * pública e não pode depender do redirecionamento de seleção de perfil.
 */
export function resolveStudioProAccess({
  session,
  studioAccess,
  levelSlug,
}: {
  session: StudioProSession | null
  studioAccess: boolean
  levelSlug: string | undefined
}): StudioProAccessDecision {
  if (!session?.activeProfile) return { allowed: false, code: 'PROFILE_SESSION_REQUIRED' }
  if (!studioAccess) return { allowed: false, code: 'STUDIO_ACCESS_REQUIRED' }
  if (!resolveStudioTier(levelSlug, session.role).pro) {
    return { allowed: false, code: 'STUDIO_PRO_TIER_REQUIRED' }
  }
  return { allowed: true }
}
