import { JOURNEY_LEVEL_SLUGS, type JourneyLevelSlug } from './catalog'
import type { KidsCreatorCapability, KidsJourneyStaffPreview, KidsJourneyView } from './kids-policy'
import type { CreativeToolId, ToolAvailability } from './state'

// Structural tool requirements, not rank thresholds or curriculum grants.
const TOOL_CAPABILITIES: Readonly<Record<CreativeToolId, readonly KidsCreatorCapability[]>> = {
  'estudio-completo': ['studio'],
  pinta: ['pinta'],
  pensa: ['pensa', 'ai'],
  molda: ['molda'],
}

/** Read-only presentation of global rights; ownership and curriculum remain separate authorities. */
export function kidsCreativeToolAvailability(input: {
  tool: CreativeToolId
  owned: boolean | null
  journey: KidsJourneyView | KidsJourneyStaffPreview | null
}): { state: ToolAvailability; requiredLevel: JourneyLevelSlug | null } {
  const { journey, owned, tool } = input
  if (!journey || !Number.isInteger(journey.policyVersion) || journey.policyVersion < 1 || journey.readiness.status === 'unavailable' || owned === null)
    return { state: 'unavailable', requiredLevel: null }
  if (!owned) return { state: 'not-included', requiredLevel: null }
  const preview = 'kind' in journey
  const capabilities = preview ? journey.capabilities : journey.earned.capabilities
  const missing = TOOL_CAPABILITIES[tool].filter((capability) => !capabilities.includes(capability))
  if (missing.length === 0) return { state: 'available', requiredLevel: null }
  // A named promise must cover every missing capability, including the tutor required by Pensa.
  // Unknown/paused/removed awards remain a real lock, without promising an invented future rank.
  if (preview || journey.mode !== 'active' || journey.readiness.horizon === null)
    return { state: 'career-locked', requiredLevel: null }
  const horizon = JOURNEY_LEVEL_SLUGS.indexOf(journey.readiness.horizon)
  let requiredIndex = 0
  for (const capability of missing) {
    const award = journey.advances.find((advance) => advance.capabilities.includes(capability))
    const index = award ? JOURNEY_LEVEL_SLUGS.indexOf(award.level) : -1
    if (index < 1 || index > horizon) return { state: 'career-locked', requiredLevel: null }
    requiredIndex = Math.max(requiredIndex, index)
  }
  return { state: 'career-locked', requiredLevel: JOURNEY_LEVEL_SLUGS[requiredIndex] ?? null }
}
