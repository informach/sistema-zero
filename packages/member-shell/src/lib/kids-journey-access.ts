import type {
  KidsCreatorCapability,
  KidsJourneyStaffPreview,
  KidsJourneyView,
} from '@sistemazero/core/journey'
import { KidsJourneyTierAccessSchema } from '@sistemazero/core/journey'

/** Trusted Members output only; this adapter does not authorize an actor or create a preview. */
export type KidsJourneyAccess = KidsJourneyView | KidsJourneyStaffPreview

export function isKidsStaffPreview(view: KidsJourneyAccess): view is KidsJourneyStaffPreview {
  return 'kind' in view && view.kind === 'staff-preview'
}

/** Missing/unavailable data remains distinct from an actual child with no capabilities. */
export function kidsJourneyAccess(
  body:
    | {
        kidsJourney?: KidsJourneyView
        kidsPreview?: KidsJourneyStaffPreview
      }
    | null
    | undefined,
): KidsJourneyAccess | null {
  if (!body || Boolean(body.kidsJourney) === Boolean(body.kidsPreview)) return null
  const view = body.kidsJourney ?? body.kidsPreview
  if (
    view?.audience !== 'kids' ||
    !Number.isInteger(view.policyVersion) ||
    view.policyVersion < 1 ||
    (view.mode !== 'active' && view.mode !== 'paused') ||
    !view.readiness ||
    (view.readiness.status !== 'ready' && view.readiness.status !== 'incomplete')
  )
    return null
  const mapping = KidsJourneyTierAccessSchema.safeParse(view.tierAccess)
  if (!mapping.success) return null
  const capabilities = isKidsStaffPreview(view) ? view.capabilities : view.earned?.capabilities
  if (!Array.isArray(capabilities)) return null
  return view
}

export function hasKidsCapability(
  view: KidsJourneyAccess,
  capability: KidsCreatorCapability,
): boolean {
  return (isKidsStaffPreview(view) ? view.capabilities : view.earned.capabilities).includes(
    capability,
  )
}
