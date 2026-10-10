import { sessionFetch as fetch } from '@sistemazero/member-shell/lib/session-fetch'
import { GUIDE_VERSION, PARENT_ACCESS_GUIDE_VERSION } from '@/lib/guide'

export const ONBOARDING_AUDIENCES = ['parent', 'child'] as const
export const ONBOARDING_ACTIONS = [
  'welcome_opened',
  'welcome_completed',
  'welcome_dismissed',
  'tour_skipped',
  'guide_reopened',
  'step_completed',
  'step_deferred',
  'cta_clicked',
  'profile_created',
  'tour_completed',
  /** A família passou a ter uma autorização viva enquanto o responsável estava na tela. */
  'access_prepared',
] as const
export const ONBOARDING_STEPS = ['welcome', 'avatar', 'start', 'profile', 'tile', 'access'] as const

export type OnboardingAudience = (typeof ONBOARDING_AUDIENCES)[number]
export type OnboardingAction = (typeof ONBOARDING_ACTIONS)[number]
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number]

/** Evento sem identificadores: abertura/conclusão são agregáveis sem expor a criança. */
export interface OnboardingEvent {
  audience: OnboardingAudience
  action: OnboardingAction
  step?: OnboardingStep
}

export function trackOnboardingEvent(event: OnboardingEvent): void {
  if (typeof window === 'undefined') return
  const body = JSON.stringify({
    version: event.audience === 'parent' ? PARENT_ACCESS_GUIDE_VERSION : GUIDE_VERSION,
    ...event,
  })
  void fetch('/api/onboarding/events', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => {
    // Métrica best-effort: uma falha de observabilidade não bloqueia o tour.
  })
}
