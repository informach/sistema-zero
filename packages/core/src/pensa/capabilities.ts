import type {
  PensaCapabilities,
  PensaMission,
  PensaParticipantCapabilities,
  PensaTechnicalPlan,
} from './model'

/** Resource sets belong to one executor; combining two people's unlocks is invalid. */
export function canExecutePensaMission(
  mission: PensaMission,
  participant: PensaParticipantCapabilities,
  technical: PensaTechnicalPlan,
  capabilities: PensaCapabilities,
): boolean {
  const resources = technical.missionResources.find((item) => item.missionId === mission.id)
  if (!resources) return false
  if (mission.destination === 'pinta') return participant.pinta
  if (mission.destination === 'molda') {
    return (
      participant.molda && resources.moldaToolIds.every((id) => participant.moldaTools.includes(id))
    )
  }
  if (!participant.studio) return false
  const authoring = capabilities.observedGame?.authoring ?? participant.studioAuthoring
  if (authoring === 'code') return mission.kind !== 'setup'
  return (
    resources.blockIds.every((id) => participant.blockIds.includes(id)) &&
    resources.extensionIds.every((id) => participant.extensionIds.includes(id)) &&
    (mission.kind !== 'setup' ||
      [mission.setup.runtimeExtensionId, ...mission.setup.requiredAuxiliaryExtensionIds].every(
        (id) => participant.extensionIds.includes(id),
      ))
  )
}
