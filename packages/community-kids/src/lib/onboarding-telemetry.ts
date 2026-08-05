import { GUIDE_VERSION } from '@/lib/guide'

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
] as const
export const ONBOARDING_STEPS = ['welcome', 'avatar', 'start', 'profile', 'tile'] as const

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
  const body = JSON.stringify({ version: GUIDE_VERSION, ...event })
  void fetch('/api/onboarding/events', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => {
    // Métrica best-effort: uma falha de observabilidade não bloqueia o tour.
  })
}
