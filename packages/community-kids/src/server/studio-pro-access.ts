import {
  hasKidsCapability,
  isKidsStaffPreview,
  type KidsJourneyAccess,
} from '@sistemazero/member-shell/lib/kids-journey-access'
import { isPrivilegedRole } from '@sistemazero/member-shell/lib/studio-tier'

interface StudioProSession {
  role: string
  activeProfile?: unknown
}

export type StudioProAccessDecision =
  | { allowed: true }
  | {
      allowed: false
      code:
        | 'PROFILE_SESSION_REQUIRED'
        | 'STUDIO_ACCESS_REQUIRED'
        | 'STUDIO_PRO_TIER_REQUIRED'
        | 'JOURNEY_UNAVAILABLE'
    }

/**
 * A autorização do modo Código precisa ser igual para a página e para a API.
 * O proxy só torna a navegação mais amigável; uma Route Handler é uma fronteira
 * pública e não pode depender do redirecionamento de seleção de perfil.
 *
 * ⚠️ Sempre exige PERFIL ativo, também na prévia da equipe. A sessão da conta é contexto de
 * responsável: o proxy a manda para `/pais` e o Gateway (`kidsMayAccess`) não deixa o contexto
 * `parent` ler gamificação nem o Studio, seja qual for o papel. A prévia da equipe acontece num
 * perfil da PRÓPRIA conta, a mesma regra do Members (`resolveKidsStaffPreviewActor`), que já a
 * entrega ao `/estudio` livre. Recusá-la aqui fazia o `/estudio` oferecer um Pro que esta rota
 * devolvia para a lista. A prévia só vale com papel de equipe na sessão.
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
  if (!session?.activeProfile) return { allowed: false, code: 'PROFILE_SESSION_REQUIRED' }
  if (!studioAccess) return { allowed: false, code: 'STUDIO_ACCESS_REQUIRED' }
  if (!journey) return { allowed: false, code: 'JOURNEY_UNAVAILABLE' }
  // Defesa em profundidade: a prévia vem do Members só para a equipe; nunca a aceite de outro papel.
  if (isKidsStaffPreview(journey) && !isPrivilegedRole(session.role))
    return { allowed: false, code: 'STUDIO_PRO_TIER_REQUIRED' }
  if (!hasKidsCapability(journey, 'studio') || !hasKidsCapability(journey, 'pro')) {
    return { allowed: false, code: 'STUDIO_PRO_TIER_REQUIRED' }
  }
  return { allowed: true }
}
