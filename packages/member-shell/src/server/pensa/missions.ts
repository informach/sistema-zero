import type { PensaProjectView } from '@sistemazero/core/pensa'

/** An explicit mission must belong to this plan; only an absent reference uses nextAction. */
export function pensaStudioTutorMission(view: PensaProjectView, openedId?: string) {
  const missionId =
    openedId ?? (view.nextAction.type === 'mission' ? view.nextAction.missionId : undefined)
  const mission = view.revision?.plan.missions.find(
    (item) => item.id === missionId && item.destination === 'studio',
  )
  if (!mission || view.team.programmerProfileId !== view.team.viewerProfileId) return null
  return mission
}
